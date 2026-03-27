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

    // Delay em segundos → converte para ms e calcula scheduled_at
    const delaySeconds = Number(agentConfig.response_delay ?? 0);
    const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    // Enfileira mensagem para processamento futuro
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
      details: `scheduled_at=${scheduledAt}`,
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
