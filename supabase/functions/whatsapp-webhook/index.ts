import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripPhone(p: string): string {
  return p.replace(/\D/g, "");
}

function extractText(message: Record<string, unknown>): string {
  if (!message) return "";
  const m = message as Record<string, unknown>;
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  const img = m.imageMessage as Record<string, unknown> | undefined;
  return (
    (m.conversation as string) ??
    (ext?.text as string) ??
    (img?.caption as string) ??
    ""
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req: Request) => {
  // Evolution API sends HEAD/GET as health check
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("unauthorized", { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate token → get instance name
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

  // Only process incoming messages
  if (body.event !== "messages.upsert") return new Response("ok", { status: 200 });

  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return new Response("ok", { status: 200 });

  const key = data.key as Record<string, unknown> | undefined;
  if (key?.fromMe) return new Response("ok", { status: 200 }); // ignore sent messages

  const remoteJid = (key?.remoteJid as string) ?? "";
  if (!remoteJid || remoteJid.endsWith("@g.us")) return new Response("ok", { status: 200 }); // skip groups

  const rawPhone = stripPhone(remoteJid.split("@")[0]);
  const messageText = extractText(data.message as Record<string, unknown>);
  if (!messageText.trim()) return new Response("ok", { status: 200 });

  // Match deal by phone — try exact + variants (with/without country code 55)
  const phone13 = rawPhone; // e.g. 5511999999999
  const phone11 = rawPhone.length === 13 && rawPhone.startsWith("55") ? rawPhone.slice(2) : rawPhone;
  const phonePlus = `+${rawPhone}`;

  const { data: deal } = await supabase
    .from("deals")
    .select("id, stage, contact_name, phone")
    .or(`phone.eq.${phone13},phone.eq.${phone11},phone.eq.${phonePlus}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!deal) {
    console.log(`[webhook] No deal found for phone ${rawPhone} — ignoring`);
    return new Response("ok", { status: 200 });
  }

  // Find active agent config for this stage + instance
  const { data: agentConfig } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("stage", deal.stage)
    .eq("active", true)
    .or(`instance_name.eq.${instanceName},instance_name.eq.`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!agentConfig) {
    console.log(`[webhook] No active agent config for stage "${deal.stage}" — ignoring`);
    return new Response("ok", { status: 200 });
  }

  // Get AI provider token
  const provider: string = agentConfig.provider ?? "openai";
  const { data: tokenRow } = await supabase
    .from("api_tokens")
    .select("token")
    .ilike("provider", provider)
    .limit(1)
    .maybeSingle();

  if (!tokenRow?.token) {
    console.log(`[webhook] No API token for provider "${provider}"`);
    return new Response("ok", { status: 200 });
  }

  // Get Evolution API config
  const { data: evoConfig } = await supabase
    .from("evolution_config")
    .select("api_url, api_token")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!evoConfig) return new Response("ok", { status: 200 });

  // Build system prompt
  const systemParts: string[] = [];
  if (agentConfig.system_prompt) systemParts.push(agentConfig.system_prompt);
  if (agentConfig.prompt_complement) systemParts.push(agentConfig.prompt_complement);
  const systemPrompt = systemParts.join("\n\n") || "Você é um assistente de atendimento ao cliente. Responda de forma educada e objetiva.";

  // Generate AI response
  let aiResponse = "";
  try {
    if (provider === "openai") {
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
      aiResponse = json.choices?.[0]?.message?.content?.trim() ?? "";
    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": tokenRow.token,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: "user", content: messageText }],
        }),
      });
      const json = await res.json();
      aiResponse = (json.content?.[0]?.text ?? "").trim();
    }
  } catch (err) {
    console.error("[webhook] AI error:", err);
    return new Response("ok", { status: 200 });
  }

  if (!aiResponse) return new Response("ok", { status: 200 });

  // Apply response delay (max 10s to avoid timeout)
  const delayMs = Math.min((agentConfig.response_delay ?? 1) * 1000, 10000);
  if (delayMs > 0) await sleep(delayMs);

  // Send response via Evolution API
  try {
    const sendUrl = `${evoConfig.api_url}/message/sendText/${instanceName}`;
    await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evoConfig.api_token,
      },
      body: JSON.stringify({ number: remoteJid, text: aiResponse }),
    });
    console.log(`[webhook] Responded to ${rawPhone} in stage "${deal.stage}"`);
  } catch (err) {
    console.error("[webhook] Send error:", err);
  }

  return new Response("ok", { status: 200 });
});
