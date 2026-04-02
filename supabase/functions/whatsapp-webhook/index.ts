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

type MediaType = "audio" | "image" | "video" | "document" | null;

function detectMediaType(message: unknown): MediaType {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  if (m.audioMessage) return "audio";
  if (m.imageMessage) return "image";
  if (m.videoMessage) return "video";
  if (m.documentMessage) return "document";
  return null;
}

function extractDocumentInfo(message: unknown): { title?: string; caption?: string; mimetype?: string } {
  if (!message || typeof message !== "object") return {};
  const m = message as Record<string, unknown>;
  const doc = m.documentMessage as Record<string, unknown> | undefined;
  if (!doc) return {};
  return {
    title: doc.title as string | undefined,
    caption: doc.caption as string | undefined,
    mimetype: doc.mimetype as string | undefined,
  };
}

async function downloadMedia(
  instanceName: string,
  messageData: Record<string, unknown>,
  evoUrl: string,
  evoToken: string,
): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const key = messageData.key as Record<string, unknown>;
    const res = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evoToken },
      body: JSON.stringify({ message: { key }, convertToMp4: false }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { base64?: string; mimetype?: string };
    if (!json.base64) return null;
    return { base64: json.base64, mimetype: json.mimetype || "application/octet-stream" };
  } catch {
    return null;
  }
}

async function transcribeAudio(base64: string, mimetype: string, openaiToken: string): Promise<string> {
  try {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const ext = mimetype.includes("ogg") ? "ogg" : mimetype.includes("mp4") ? "m4a" : mimetype.includes("mpeg") ? "mp3" : "ogg";
    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: mimetype }), `audio.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiToken}` },
      body: formData,
    });
    if (!res.ok) return "";
    const json = await res.json() as { text?: string };
    return json.text?.trim() ?? "";
  } catch {
    return "";
  }
}

async function describeImage(base64: string, mimetype: string, openaiToken: string, caption?: string): Promise<string> {
  try {
    const dataUrl = `data:${mimetype};base64,${base64}`;
    const userContent: unknown[] = [
      { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
    ];
    if (caption) {
      userContent.unshift({ type: "text", text: `Legenda enviada: "${caption}"` });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiToken}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Descreva a imagem de forma objetiva em português, em no máximo 2 frases. Se houver texto na imagem, transcreva-o." },
          { role: "user", content: userContent },
        ],
        max_tokens: 300,
      }),
    });
    if (!res.ok) return caption || "";
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? caption ?? "";
  } catch {
    return caption || "";
  }
}

function extractMessageData(body: Record<string, unknown>): Record<string, unknown> | null {
  const raw = body.data;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? (raw[0] as Record<string, unknown>) : null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function phoneVariants(raw: string): string[] {
  // Nunca incluir variantes com "+" — o sinal causa bug de URL encoding no PostgREST
  const set = new Set<string>([raw]);
  if (raw.startsWith("55") && raw.length === 13) {
    // Formato com 9: 55 + DD + 9XXXXXXXX (13 dígitos)
    const sem55 = raw.slice(2);
    set.add(sem55);
    const area = raw.slice(2, 4);
    const resto = raw.slice(4); // 9XXXXXXXX
    if (resto.startsWith("9") && resto.length === 9) {
      // Variante sem o 9 extra
      const sem9 = `55${area}${resto.slice(1)}`;
      set.add(sem9);
      set.add(`${area}${resto.slice(1)}`);
      set.add(`${area}${resto}`);
    }
  } else if (raw.startsWith("55") && raw.length === 12) {
    // Formato sem 9: 55 + DD + 8 dígitos (12 dígitos)
    const area = raw.slice(2, 4);
    const resto = raw.slice(4); // 8 dígitos
    // Variante com 9 inserido
    const com9 = `55${area}9${resto}`;
    set.add(com9);
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
    if (!data) return new Response("ok", { status: 200 });

    const key = data.key as Record<string, unknown> | undefined;
    if (key?.fromMe === true) return new Response("ok", { status: 200 });

    const remoteJid = (key?.remoteJid as string | undefined) ?? "";
    if (!remoteJid || remoteJid.endsWith("@g.us")) return new Response("ok", { status: 200 });

    const rawPhone = stripPhone(remoteJid.split("@")[0]);
    let messageText = extractText(data.message).trim();
    const mediaType = detectMediaType(data.message);

    // Se for mídia (áudio/imagem/vídeo/documento), tenta processar
    if (mediaType && !messageText) {
      const [evoConfigRes, openaiTokenRes] = await Promise.all([
        supabase.from("evolution_config").select("api_url, api_token").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("api_tokens").select("token").ilike("provider", "openai").limit(1).maybeSingle(),
      ]);

      if (evoConfigRes.data && openaiTokenRes.data?.token) {
        const evoUrl = (evoConfigRes.data.api_url as string).replace(/\/$/, "");
        const evoToken = evoConfigRes.data.api_token as string;
        const openaiToken = openaiTokenRes.data.token;
        const media = await downloadMedia(instanceName, data, evoUrl, evoToken);

        if (media) {
          switch (mediaType) {
            case "audio": {
              const transcription = await transcribeAudio(media.base64, media.mimetype, openaiToken);
              if (transcription) {
                messageText = `[Áudio transcrito]: ${transcription}`;
                await log("audio_transcribed", { instance: instanceName, jid: remoteJid, msg: transcription.slice(0, 200) });
              }
              break;
            }
            case "image": {
              const imgCaption = ((data.message as Record<string, unknown>)?.imageMessage as Record<string, unknown>)?.caption as string | undefined;
              const description = await describeImage(media.base64, media.mimetype, openaiToken, imgCaption);
              if (description) {
                messageText = `[Imagem]: ${description}`;
                await log("image_described", { instance: instanceName, jid: remoteJid, msg: description.slice(0, 200) });
              }
              break;
            }
            case "video": {
              const vidCaption = ((data.message as Record<string, unknown>)?.videoMessage as Record<string, unknown>)?.caption as string | undefined;
              // Para vídeo, usa apenas a legenda se existir (transcrição de vídeo é muito custosa)
              if (vidCaption) {
                messageText = `[Vídeo com legenda]: ${vidCaption}`;
              } else {
                messageText = "[Vídeo recebido sem legenda]";
              }
              await log("video_received", { instance: instanceName, jid: remoteJid, msg: messageText });
              break;
            }
            case "document": {
              const docInfo = extractDocumentInfo(data.message);
              const parts: string[] = [];
              if (docInfo.title) parts.push(`"${docInfo.title}"`);
              if (docInfo.mimetype) parts.push(`(${docInfo.mimetype})`);
              if (docInfo.caption) parts.push(`— ${docInfo.caption}`);
              messageText = `[Documento recebido]: ${parts.join(" ") || "arquivo"}`;
              await log("document_received", { instance: instanceName, jid: remoteJid, msg: messageText });
              break;
            }
          }
        }

        if (!messageText) {
          await log("media_processing_failed", { instance: instanceName, jid: remoteJid, details: `type=${mediaType}` });
        }
      }
    }

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

    // response_delay = tempo máximo do webhook até responder (em segundos, padrão 10)
    const responseDelay = Math.min(Number(agentConfig.response_delay ?? 10), 120);
    const scheduledAt = new Date(Date.now() + responseDelay * 1000).toISOString();

    // Debounce: se já existe item na fila para esse número (não processado), atualiza ao invés de inserir
    const { data: existing } = await supabase
      .from("response_queue")
      .select("id, message_text")
      .eq("instance_name", instanceName)
      .eq("phone", rawPhone)
      .is("processed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Agrupa a nova mensagem na existente e reseta o scheduled_at
      const combined = `${existing.message_text}\n${messageText}`;
      await supabase.from("response_queue")
        .update({ message_text: combined, scheduled_at: scheduledAt })
        .eq("id", existing.id);
      await log("queued_merged", { instance: instanceName, jid: remoteJid, msg: messageText.slice(0, 100) });
    } else {
      await supabase.from("response_queue").insert({
        instance_name: instanceName,
        phone: rawPhone,
        remote_jid: remoteJid,
        message_text: messageText,
        agent_config: agentConfig,
        scheduled_at: scheduledAt,
      });
      await log("queued", {
        instance: instanceName,
        jid: remoteJid,
        msg: messageText.slice(0, 200),
        details: `delay=${responseDelay}s scheduled_at=${scheduledAt}`,
      });
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
