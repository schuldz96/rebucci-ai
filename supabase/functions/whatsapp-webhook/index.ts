import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripPhone(p: string): string {
  return p.replace(/\D/g, "");
}

function extractText(message: unknown): string {
  if (!message) return "";
  if (typeof message === "string") {
    try {
      const dec = atob(message);
      const parsed = JSON.parse(dec);
      return extractText(parsed);
    } catch {
      return message;
    }
  }
  if (typeof message !== "object") return "";
  const m = message as Record<string, unknown>;
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  const img = m.imageMessage as Record<string, unknown> | undefined;
  const vid = m.videoMessage as Record<string, unknown> | undefined;
  return (
    (m.conversation as string | undefined) ??
    (ext?.text as string | undefined) ??
    (img?.caption as string | undefined) ??
    (vid?.caption as string | undefined) ??
    ""
  );
}

function extractMessageData(body: Record<string, unknown>): Record<string, unknown> | null {
  const raw = body.data;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? (raw[0] as Record<string, unknown>) : null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function phoneVariants(raw: string): string[] {
  const set = new Set<string>([raw, `+${raw}`]);
  if (raw.startsWith("55") && raw.length === 13) {
    const sem55 = raw.slice(2);
    set.add(sem55);
    const area = raw.slice(2, 4);
    const resto = raw.slice(4);
    if (resto.startsWith("9") && resto.length === 9) {
      const sem9 = `55${area}${resto.slice(1)}`;
      set.add(sem9);
      set.add(`+${sem9}`);
      set.add(`${area}${resto.slice(1)}`);
    }
  } else if (raw.startsWith("55") && raw.length === 12) {
    const area = raw.slice(2, 4);
    const resto = raw.slice(4);
    const com9 = `55${area}9${resto}`;
    set.add(com9);
    set.add(`+${com9}`);
    set.add(`${area}${resto}`);
    set.add(`${area}9${resto}`);
  }
  return Array.from(set);
}

async function searchVectorstore(
  supabase: ReturnType<typeof createClient>,
  openaiToken: string,
  instanceName: string,
  query: string,
): Promise<string> {
  try {
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiToken}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query.slice(0, 2000) }),
    });
    if (!embRes.ok) return "";
    const embJson = await embRes.json();
    const queryEmbedding: number[] = embJson.data?.[0]?.embedding;
    if (!queryEmbedding) return "";

    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 5,
      p_instance_name: instanceName,
    });

    if (!matches || matches.length === 0) return "";

    return (matches as { content: string; similarity: number }[])
      .map((m, i) => `[Trecho ${i + 1}] ${m.content.slice(0, 800)}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

async function fetchConversationHistory(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  phone: string,
  limit = 10,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  try {
    const { data } = await supabase
      .from("ai_conversation_history")
      .select("role, content")
      .eq("instance_name", instanceName)
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) return [];
    return (data as { role: "user" | "assistant"; content: string }[]).reverse();
  } catch {
    return [];
  }
}

async function saveConversationHistory(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  phone: string,
  userMessage: string,
  aiResponse: string,
): Promise<void> {
  try {
    await supabase.from("ai_conversation_history").insert([
      { instance_name: instanceName, phone, role: "user", content: userMessage },
      { instance_name: instanceName, phone, role: "assistant", content: aiResponse },
    ]);
  } catch {
    // silencioso
  }
}

function makeLog(supabase: ReturnType<typeof createClient>) {
  return async (status: string, extra: Record<string, string> = {}) => {
    try {
      await supabase.from("webhook_logs").insert({
        instance_name: extra.instance ?? "",
        event: extra.event ?? "",
        remote_jid: extra.jid ?? "",
        message_text: extra.msg ?? "",
        status,
        details: extra.details ?? "",
      });
    } catch (_) { /* silencioso */ }
  };
}

/** Processamento em background: delay + IA + envio */
async function processInBackground(params: {
  supabase: ReturnType<typeof createClient>;
  instanceName: string;
  remoteJid: string;
  rawPhone: string;
  messageText: string;
  agentConfig: Record<string, unknown>;
  delayMs: number;
}) {
  const { supabase, instanceName, remoteJid, rawPhone, messageText, agentConfig, delayMs } = params;
  const log = makeLog(supabase);

  try {
    // Delay configurado (até 10 minutos)
    if (delayMs > 0) {
      await log("delay_start", { instance: instanceName, jid: remoteJid, details: `${delayMs}ms` });
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Token OpenAI
    const { data: tokenRow } = await supabase.from("api_tokens").select("token").ilike("provider", "openai").limit(1).maybeSingle();
    if (!tokenRow?.token) {
      await log("no_openai_token", { instance: instanceName });
      return;
    }

    // Config Evolution API
    const { data: evoConfig } = await supabase.from("evolution_config").select("api_url, api_token").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!evoConfig) {
      await log("no_evo_config", { instance: instanceName });
      return;
    }

    // RAG e histórico em paralelo
    const [ragContext, conversationHistory] = await Promise.all([
      searchVectorstore(supabase, tokenRow.token, instanceName, messageText),
      fetchConversationHistory(supabase, instanceName, rawPhone),
    ]);

    // Monta system prompt
    const promptParts: string[] = [];
    if (agentConfig.system_prompt) promptParts.push(agentConfig.system_prompt as string);
    if (agentConfig.prompt_complement) promptParts.push(agentConfig.prompt_complement as string);

    if (ragContext) {
      promptParts.push(
        `\n\nCONTEXTO RELEVANTE DO HISTÓRICO DE ATENDIMENTOS:\n${ragContext}\n\nUse o contexto acima para embasar sua resposta quando relevante. Priorize as informações do contexto sobre conhecimento genérico.`
      );
      await log("rag_context_found", { instance: instanceName, jid: remoteJid, details: `${ragContext.length} chars` });
    }

    const systemPrompt = promptParts.join("\n\n") || "Você é um assistente de atendimento ao cliente. Responda em português.";
    await log("system_prompt_preview", { instance: instanceName, jid: remoteJid, details: systemPrompt.slice(0, 300) });

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: messageText },
    ];

    if (conversationHistory.length > 0) {
      await log("history_loaded", { instance: instanceName, jid: remoteJid, details: `${conversationHistory.length} msgs` });
    }

    // OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });
    const aiJson = await aiRes.json();
    const aiResponse: string = (aiJson.choices?.[0]?.message?.content ?? "").trim();

    if (!aiResponse) {
      await log("openai_empty", { instance: instanceName, details: JSON.stringify(aiJson).slice(0, 300) });
      return;
    }

    await log("ai_response_ready", { instance: instanceName, msg: aiResponse.slice(0, 200) });

    // Envia via Evolution API
    const sendInstance = (agentConfig.instance_name as string) || instanceName;
    const sendRes = await fetch(`${evoConfig.api_url}/message/sendText/${sendInstance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evoConfig.api_token as string },
      body: JSON.stringify({ number: rawPhone, text: aiResponse }),
    });
    const sendJson = await sendRes.json().catch(() => ({}));

    await log("sent", {
      instance: instanceName,
      jid: remoteJid,
      msg: aiResponse.slice(0, 200),
      details: JSON.stringify(sendJson).slice(0, 300),
    });

    // Salva histórico
    await saveConversationHistory(supabase, instanceName, rawPhone, messageText, aiResponse);

  } catch (err) {
    try {
      await supabase.from("webhook_logs").insert({
        instance_name: instanceName,
        event: "exception",
        remote_jid: remoteJid,
        status: "bg_error",
        details: String(err).slice(0, 500),
      });
    } catch (_) { /* silencioso */ }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("unauthorized", { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const log = makeLog(supabase);

  try {
    const { data: webhookRow, error: tokenErr } = await supabase
      .from("instance_webhooks")
      .select("instance_name")
      .eq("webhook_token", token)
      .maybeSingle();

    if (tokenErr || !webhookRow) {
      await log("invalid_token", { details: String(tokenErr?.message ?? "not found") });
      return new Response("unauthorized", { status: 401 });
    }

    const instanceName = webhookRow.instance_name as string;

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return new Response("ok", { status: 200 }); }

    const event = ((body.event as string | undefined) ?? "").toLowerCase();
    await log("webhook_received", { instance: instanceName, event });

    if (!event.includes("messages.upsert") && !event.includes("messages_upsert")) {
      return new Response("ok", { status: 200 });
    }

    const data = extractMessageData(body);
    if (!data) return new Response("ok", { status: 200 });

    const key = data.key as Record<string, unknown> | undefined;
    if (key?.fromMe === true) return new Response("ok", { status: 200 });

    const remoteJid = (key?.remoteJid as string | undefined) ?? "";
    if (!remoteJid || remoteJid.endsWith("@g.us")) return new Response("ok", { status: 200 });

    const rawPhone = stripPhone(remoteJid.split("@")[0]);
    const messageText = extractText(data.message).trim();

    await log("message_parsed", { instance: instanceName, event, jid: remoteJid, msg: messageText.slice(0, 200) });

    if (!messageText) return new Response("ok", { status: 200 });

    // Busca deal
    const variants = phoneVariants(rawPhone);
    const { data: deals } = await supabase
      .from("deals")
      .select("id, stage, contact_name, phone")
      .or(variants.map((v) => `phone.eq.${v}`).join(","))
      .order("created_at", { ascending: false })
      .limit(10);

    if (!deals || deals.length === 0) {
      await log("no_deal", { instance: instanceName, jid: remoteJid, details: `phone=${rawPhone}` });
      return new Response("ok", { status: 200 });
    }

    const stages = [...new Set((deals as { stage: string }[]).map((d) => d.stage))];
    const { data: activeConfigs } = await supabase
      .from("agent_configs")
      .select("*")
      .in("stage", stages)
      .eq("active", true);

    let matchedDeal: { id: string; stage: string; contact_name: string } | null = null;
    let agentConfig: Record<string, unknown> | null = null;

    for (const d of deals as { id: string; stage: string; contact_name: string }[]) {
      const cfg = (activeConfigs ?? []).find((c: { stage: string }) => c.stage === d.stage);
      if (cfg) { matchedDeal = d; agentConfig = cfg as Record<string, unknown>; break; }
    }

    if (!matchedDeal || !agentConfig) {
      await log("no_active_agent", { instance: instanceName, jid: remoteJid, details: `stages=${stages.join("|")}` });
      return new Response("ok", { status: 200 });
    }

    await log("agent_matched", { instance: instanceName, jid: remoteJid, details: `stage=${matchedDeal.stage}` });

    // Delay em minutos (convertido para ms), máximo 10 minutos
    const delayMinutes = Number(agentConfig.response_delay ?? 0);
    const delayMs = Math.min(delayMinutes * 60 * 1000, 10 * 60 * 1000);

    // Dispara processamento em background e retorna 200 imediatamente
    const bgTask = processInBackground({
      supabase,
      instanceName,
      remoteJid,
      rawPhone,
      messageText,
      agentConfig,
      delayMs,
    });

    // EdgeRuntime.waitUntil mantém o processo vivo após retornar a resposta
    const ctx = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (ctx?.waitUntil) {
      ctx.waitUntil(bgTask);
    } else {
      // fallback: aguarda normalmente (sem delay longo)
      await bgTask;
    }

  } catch (err) {
    try {
      await supabase.from("webhook_logs").insert({
        instance_name: "error",
        event: "exception",
        status: "fatal_error",
        details: String(err).slice(0, 500),
      });
    } catch (_) { /* silencioso */ }
  }

  return new Response("ok", { status: 200 });
});
