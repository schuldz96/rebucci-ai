import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripPhone(p: string): string {
  return p.replace(/\D/g, "");
}

// Extrai texto de mensagem (base64 ou objeto)
function extractText(message: unknown): string {
  if (!message) return "";

  // Se vier como string base64, decodifica
  if (typeof message === "string") {
    try {
      const decoded = atob(message);
      const parsed = JSON.parse(decoded);
      return extractText(parsed);
    } catch {
      return message; // já é texto puro
    }
  }

  if (typeof message !== "object") return "";
  const m = message as Record<string, unknown>;
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  const img = m.imageMessage as Record<string, unknown> | undefined;
  const vid = m.videoMessage as Record<string, unknown> | undefined;
  const doc = m.documentMessage as Record<string, unknown> | undefined;
  return (
    (m.conversation as string | undefined) ??
    (ext?.text as string | undefined) ??
    (img?.caption as string | undefined) ??
    (vid?.caption as string | undefined) ??
    (doc?.caption as string | undefined) ??
    ""
  );
}

// Evolution API pode enviar data como objeto ou array
function extractMessageData(body: Record<string, unknown>): Record<string, unknown> | null {
  const raw = body.data;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? (raw[0] as Record<string, unknown>) : null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

// Gera todas variantes de telefone BR (com/sem 55, com/sem dígito 9)
function phoneVariants(rawPhone: string): string[] {
  const set = new Set<string>();
  set.add(rawPhone);
  set.add(`+${rawPhone}`);

  if (rawPhone.startsWith("55") && rawPhone.length === 13) {
    const sem55 = rawPhone.slice(2);       // 42998224190
    set.add(sem55);
    const area = rawPhone.slice(2, 4);     // 42
    const resto = rawPhone.slice(4);       // 998224190
    if (resto.startsWith("9") && resto.length === 9) {
      // Variante sem o 9 extra
      const sem9 = `55${area}${resto.slice(1)}`; // 554298224190
      set.add(sem9);
      set.add(`+${sem9}`);
      set.add(`${area}${resto.slice(1)}`); // 4298224190
    }
  } else if (rawPhone.startsWith("55") && rawPhone.length === 12) {
    // Número curto → adiciona variante com 9
    const area = rawPhone.slice(2, 4);
    const resto = rawPhone.slice(4);
    const com9 = `55${area}9${resto}`;
    set.add(com9);
    set.add(`+${com9}`);
    set.add(`${area}${resto}`);
    set.add(`${area}9${resto}`);
  }

  return Array.from(set);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("unauthorized", { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Valida token → pega nome da instância
  const { data: webhookRow } = await supabase
    .from("instance_webhooks")
    .select("instance_name")
    .eq("webhook_token", token)
    .maybeSingle();

  if (!webhookRow) return new Response("unauthorized", { status: 401 });
  const instanceName: string = webhookRow.instance_name;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("ok", { status: 200 });
  }

  const event = ((body.event as string | undefined) ?? "").toLowerCase();

  // Log toda chamada recebida (para debug)
  const logRow: Record<string, string> = {
    instance_name: instanceName,
    event: event || "unknown",
    remote_jid: "",
    message_text: "",
    status: "received",
    details: "",
  };

  const saveLog = async (status: string, details = "") => {
    logRow.status = status;
    logRow.details = details.slice(0, 500);
    await supabase.from("webhook_logs").insert(logRow).catch(() => {});
  };

  if (!event.includes("messages.upsert") && !event.includes("messages_upsert")) {
    await saveLog("ignored", `evento=${event}`);
    return new Response("ok", { status: 200 });
  }

  const data = extractMessageData(body);
  if (!data) {
    await saveLog("no_data");
    return new Response("ok", { status: 200 });
  }

  const key = data.key as Record<string, unknown> | undefined;
  if (key?.fromMe === true) {
    await saveLog("from_me");
    return new Response("ok", { status: 200 });
  }

  const remoteJid = (key?.remoteJid as string | undefined) ?? "";
  if (!remoteJid || remoteJid.endsWith("@g.us")) {
    await saveLog("group_or_empty");
    return new Response("ok", { status: 200 });
  }

  const rawPhone = stripPhone(remoteJid.split("@")[0]);
  logRow.remote_jid = remoteJid;

  const messageText = extractText(data.message).trim();
  logRow.message_text = messageText.slice(0, 200);

  if (!messageText) {
    await saveLog("no_text", `messageType=${data.messageType}`);
    return new Response("ok", { status: 200 });
  }

  // Busca deal por telefone (todas variantes)
  const variants = phoneVariants(rawPhone);
  const orFilter = variants.map((v) => `phone.eq.${v}`).join(",");

  const { data: deals } = await supabase
    .from("deals")
    .select("id, stage, contact_name, phone")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!deals || deals.length === 0) {
    await saveLog("no_deal", `phone=${rawPhone} variantes=${variants.join("|")}`);
    return new Response("ok", { status: 200 });
  }

  // Pega configs ativas para os stages dos deals
  const stages = [...new Set(deals.map((d: { stage: string }) => d.stage))];
  const { data: activeConfigs } = await supabase
    .from("agent_configs")
    .select("*")
    .in("stage", stages)
    .eq("active", true);

  let deal: { id: string; stage: string; contact_name: string } | null = null;
  let agentConfig: Record<string, unknown> | null = null;

  for (const d of deals) {
    const cfg = activeConfigs?.find((c: { stage: string }) => c.stage === d.stage);
    if (cfg) { deal = d; agentConfig = cfg as Record<string, unknown>; break; }
  }

  if (!deal || !agentConfig) {
    await saveLog("no_active_agent", `stages=${stages.join("|")}`);
    return new Response("ok", { status: 200 });
  }

  // Token OpenAI
  const { data: tokenRow } = await supabase
    .from("api_tokens")
    .select("token")
    .ilike("provider", "openai")
    .limit(1)
    .maybeSingle();

  if (!tokenRow?.token) {
    await saveLog("no_openai_token");
    return new Response("ok", { status: 200 });
  }

  // Config Evolution API
  const { data: evoConfig } = await supabase
    .from("evolution_config")
    .select("api_url, api_token")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!evoConfig) {
    await saveLog("no_evo_config");
    return new Response("ok", { status: 200 });
  }

  // System prompt
  const parts: string[] = [];
  if (agentConfig.system_prompt) parts.push(agentConfig.system_prompt as string);
  if (agentConfig.prompt_complement) parts.push(agentConfig.prompt_complement as string);
  const systemPrompt = parts.join("\n\n") ||
    "Você é um assistente de atendimento ao cliente. Responda de forma educada e objetiva em português.";

  // Gera resposta OpenAI
  let aiResponse = "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRow.token}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messageText },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });
    const json = await res.json();
    aiResponse = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!aiResponse) {
      await saveLog("openai_empty", JSON.stringify(json).slice(0, 300));
      return new Response("ok", { status: 200 });
    }
  } catch (err) {
    await saveLog("openai_error", String(err));
    return new Response("ok", { status: 200 });
  }

  // Delay
  const delayMs = Math.min(((agentConfig.response_delay as number) ?? 1) * 1000, 10000);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  // Envia via Evolution API — número sem @s.whatsapp.net
  const sendInstance = (agentConfig.instance_name as string) || instanceName;
  const phoneNumber = rawPhone; // só os dígitos, sem @s.whatsapp.net

  try {
    const sendRes = await fetch(`${evoConfig.api_url}/message/sendText/${sendInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evoConfig.api_token,
      },
      body: JSON.stringify({ number: phoneNumber, text: aiResponse }),
    });
    const sendJson = await sendRes.json().catch(() => ({}));
    const sendStr = JSON.stringify(sendJson).slice(0, 300);
    await saveLog("sent", `deal=${deal.stage} resp=${aiResponse.slice(0, 80)} send=${sendStr}`);
  } catch (err) {
    await saveLog("send_error", String(err));
  }

  return new Response("ok", { status: 200 });
});
