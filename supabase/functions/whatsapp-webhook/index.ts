import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripPhone(p: string): string {
  return p.replace(/\D/g, "");
}

function extractText(message: unknown): string {
  if (!message || typeof message !== "object") return "";
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

// Evolution API pode enviar data como objeto ou array — normaliza para objeto único
function extractMessageData(body: Record<string, unknown>): Record<string, unknown> | null {
  const raw = body.data;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? (raw[0] as Record<string, unknown>) : null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
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

  if (!webhookRow) {
    console.log(`[webhook] Token inválido: ${token}`);
    return new Response("unauthorized", { status: 401 });
  }

  const instanceName: string = webhookRow.instance_name;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("ok", { status: 200 });
  }

  const event = ((body.event as string | undefined) ?? "").toLowerCase();
  console.log(`[webhook] Evento: "${event}" | instância: ${instanceName}`);

  if (!event.includes("messages.upsert") && !event.includes("messages_upsert")) {
    return new Response("ok", { status: 200 });
  }

  const data = extractMessageData(body);
  if (!data) {
    console.log("[webhook] Payload sem data");
    return new Response("ok", { status: 200 });
  }

  const key = data.key as Record<string, unknown> | undefined;
  if (key?.fromMe === true) return new Response("ok", { status: 200 });

  const remoteJid = (key?.remoteJid as string | undefined) ?? "";
  if (!remoteJid || remoteJid.endsWith("@g.us")) {
    return new Response("ok", { status: 200 }); // ignora grupos
  }

  const rawPhone = stripPhone(remoteJid.split("@")[0]);
  const messageText = extractText(data.message).trim();

  console.log(`[webhook] De: ${rawPhone} | Msg: "${messageText.slice(0, 80)}"`);
  if (!messageText) return new Response("ok", { status: 200 });

  // Gera todas as variantes de telefone BR (com/sem 55, com/sem dígito 9)
  // Ex.: rawPhone = 5542998224190 (13 dígitos com 55 + 42 + 9 + 8 dígitos)
  const variants = new Set<string>();
  variants.add(rawPhone);             // 5542998224190
  variants.add(`+${rawPhone}`);       // +5542998224190

  if (rawPhone.startsWith("55") && rawPhone.length === 13) {
    // Sem código BR: 42998224190
    const sem55 = rawPhone.slice(2);
    variants.add(sem55);

    // Sem o 9 extra (após área code de 2 dígitos): 554298224190
    const area = rawPhone.slice(2, 4); // "42"
    const resto = rawPhone.slice(4);    // "998224190"
    if (resto.startsWith("9") && resto.length === 9) {
      const sem9 = `55${area}${resto.slice(1)}`; // 554298224190
      variants.add(sem9);
      variants.add(`+${sem9}`);
      variants.add(`${area}${resto.slice(1)}`);  // 4298224190
    }
    variants.add(sem55); // 42998224190
  } else if (rawPhone.length === 12 && rawPhone.startsWith("55")) {
    // Número sem o 9 → adiciona variante com o 9
    const area = rawPhone.slice(2, 4);
    const resto = rawPhone.slice(4);
    const com9 = `55${area}9${resto}`;
    variants.add(com9);
    variants.add(`+${com9}`);
    variants.add(`${area}${resto}`);
    variants.add(`${area}9${resto}`);
  }

  const orParts = Array.from(variants).map((v) => `phone.eq.${v}`);

  // Busca deal com esse telefone — pega o que está em etapa com IA ativa
  const { data: deals } = await supabase
    .from("deals")
    .select("id, stage, contact_name, phone")
    .or(orParts.join(","))
    .order("created_at", { ascending: false })
    .limit(10);

  if (!deals || deals.length === 0) {
    console.log(`[webhook] Nenhum deal para telefone ${rawPhone} — sem resposta`);
    return new Response("ok", { status: 200 });
  }

  // Carrega configs de agente ativas para os stages dos deals encontrados
  const stages = [...new Set(deals.map((d: { stage: string }) => d.stage))];
  const { data: activeConfigs } = await supabase
    .from("agent_configs")
    .select("*")
    .in("stage", stages)
    .eq("active", true);

  // Seleciona o deal cujo stage tem IA ativa
  let deal: { id: string; stage: string; contact_name: string; phone: string } | null = null;
  let agentConfig: Record<string, unknown> | null = null;

  for (const d of deals) {
    const cfg = activeConfigs?.find((c: { stage: string }) => c.stage === d.stage);
    if (cfg) {
      deal = d;
      agentConfig = cfg as Record<string, unknown>;
      break;
    }
  }

  if (!deal || !agentConfig) {
    console.log(`[webhook] Nenhum deal em etapa com IA ativa para ${rawPhone} (stages: ${stages.join(", ")})`);
    return new Response("ok", { status: 200 });
  }

  console.log(`[webhook] Deal: "${deal.contact_name}" | Etapa: "${deal.stage}" | Agente: ${agentConfig.name}`);

  // Token OpenAI (IA sempre usa OpenAI GPT-4o mini)
  const { data: tokenRow } = await supabase
    .from("api_tokens")
    .select("token")
    .ilike("provider", "openai")
    .limit(1)
    .maybeSingle();

  if (!tokenRow?.token) {
    console.log("[webhook] Token OpenAI não encontrado em api_tokens");
    return new Response("ok", { status: 200 });
  }

  // Config Evolution API para envio
  const { data: evoConfig } = await supabase
    .from("evolution_config")
    .select("api_url, api_token")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!evoConfig) {
    console.log("[webhook] evolution_config não encontrada");
    return new Response("ok", { status: 200 });
  }

  // System prompt
  const parts: string[] = [];
  if (agentConfig.system_prompt) parts.push(agentConfig.system_prompt as string);
  if (agentConfig.prompt_complement) parts.push(agentConfig.prompt_complement as string);
  const systemPrompt = parts.join("\n\n") ||
    "Você é um assistente de atendimento ao cliente. Responda de forma educada e objetiva em português.";

  // Gera resposta via OpenAI
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
    if (!aiResponse) console.log("[webhook] OpenAI resposta vazia:", JSON.stringify(json).slice(0, 300));
  } catch (err) {
    console.error("[webhook] Erro OpenAI:", err);
    return new Response("ok", { status: 200 });
  }

  if (!aiResponse) return new Response("ok", { status: 200 });

  console.log(`[webhook] Resposta (${aiResponse.length} chars): "${aiResponse.slice(0, 100)}"`);

  // Delay configurado (máx 10s)
  const delayMs = Math.min(((agentConfig.response_delay as number) ?? 1) * 1000, 10000);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  // Envia via Evolution API
  try {
    const sendInstance = (agentConfig.instance_name as string) || instanceName;
    const sendRes = await fetch(`${evoConfig.api_url}/message/sendText/${sendInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evoConfig.api_token,
      },
      body: JSON.stringify({ number: remoteJid, text: aiResponse }),
    });
    const sendJson = await sendRes.json().catch(() => ({}));
    console.log(`[webhook] Enviado para ${rawPhone}:`, JSON.stringify(sendJson).slice(0, 200));
  } catch (err) {
    console.error("[webhook] Erro ao enviar:", err);
  }

  return new Response("ok", { status: 200 });
});
