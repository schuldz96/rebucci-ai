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

/** Busca contexto relevante na vectorstore para a mensagem recebida */
async function searchVectorstore(
  supabase: ReturnType<typeof createClient>,
  openaiToken: string,
  instanceName: string,
  query: string,
): Promise<string> {
  try {
    // Gera embedding da mensagem recebida
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiToken}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query.slice(0, 2000) }),
    });
    if (!embRes.ok) return "";
    const embJson = await embRes.json();
    const queryEmbedding: number[] = embJson.data?.[0]?.embedding;
    if (!queryEmbedding) return "";

    // Busca chunks similares via match_documents
    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      p_instance_name: instanceName,
    });

    if (!matches || matches.length === 0) return "";

    const context = (matches as { content: string; similarity: number }[])
      .map((m, i) => `[Trecho ${i + 1}] ${m.content.slice(0, 800)}`)
      .join("\n\n");

    return context;
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("unauthorized", { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const log = async (status: string, extra: Record<string, string> = {}) => {
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
    if (!data) { await log("no_data", { instance: instanceName, event }); return new Response("ok", { status: 200 }); }

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

    // Token OpenAI
    const { data: tokenRow } = await supabase.from("api_tokens").select("token").ilike("provider", "openai").limit(1).maybeSingle();
    if (!tokenRow?.token) {
      await log("no_openai_token", { instance: instanceName });
      return new Response("ok", { status: 200 });
    }

    // Config Evolution API
    const { data: evoConfig } = await supabase.from("evolution_config").select("api_url, api_token").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!evoConfig) {
      await log("no_evo_config", { instance: instanceName });
      return new Response("ok", { status: 200 });
    }

    // Busca contexto da vectorstore (sempre que houver chunks embedados)
    const ragContext = await searchVectorstore(supabase, tokenRow.token, instanceName, messageText);

    // Monta system prompt
    const promptParts: string[] = [];
    if (agentConfig.system_prompt) promptParts.push(agentConfig.system_prompt as string);
    if (agentConfig.prompt_complement) promptParts.push(agentConfig.prompt_complement as string);

    if (ragContext) {
      promptParts.push(
        `\n\nCONTEXTO RELEVANTE DO HISTÓRICO DE ATENDIMENTOS:\n${ragContext}\n\nUse o contexto acima para embasar sua resposta quando relevante. Priorize as informações do contexto sobre conhecimento genérico.`
      );
      await log("rag_context_found", { instance: instanceName, jid: remoteJid, details: `${ragContext.length} chars de contexto` });
    }

    const systemPrompt = promptParts.join("\n\n") || "Você é um assistente de atendimento ao cliente. Responda em português.";

    // OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: messageText }],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });
    const aiJson = await aiRes.json();
    const aiResponse: string = (aiJson.choices?.[0]?.message?.content ?? "").trim();

    if (!aiResponse) {
      await log("openai_empty", { instance: instanceName, details: JSON.stringify(aiJson).slice(0, 300) });
      return new Response("ok", { status: 200 });
    }

    await log("ai_response_ready", { instance: instanceName, msg: aiResponse.slice(0, 200) });

    // Delay
    const delayMs = Math.min(Number(agentConfig.response_delay ?? 1) * 1000, 10000);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

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
