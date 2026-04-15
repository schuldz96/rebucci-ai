/**
 * backfill-messages — Carrega histórico de mensagens da Evolution API para o banco local.
 *
 * Uso:
 *   POST /functions/v1/backfill-messages
 *   Body (opcional): { "instance_name": "NomeInstancia", "days": 60, "msgs_per_chat": 500 }
 *
 * Se instance_name não for informado, processa TODAS as instâncias ativas.
 * days = quantos dias para trás (padrão 60).
 * msgs_per_chat = limite de mensagens por chat (padrão 500).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface EvoChat {
  remoteJid: string;
  remoteJidAlt?: string;
  name: string;
  lastMessageTimestamp: number;
}

interface EvoMessage {
  key: { remoteJid: string; fromMe: boolean | number | string; id: string };
  pushName?: string;
  messageTimestamp: number;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string };
    audioMessage?: unknown;
    videoMessage?: { caption?: string };
    stickerMessage?: unknown;
    documentMessage?: { title?: string; caption?: string };
    reactionMessage?: { text?: string };
  };
}

function extractText(msg: EvoMessage): string {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    m.documentMessage?.title ??
    m.reactionMessage?.text ??
    (m.audioMessage ? "[Áudio]" : undefined) ??
    (m.videoMessage ? "[Vídeo]" : undefined) ??
    (m.stickerMessage ? "[Sticker]" : undefined) ??
    ""
  );
}

function detectType(msg: EvoMessage): string {
  const m = msg.message;
  if (!m) return "text";
  if (m.audioMessage) return "audio";
  if (m.imageMessage) return "image";
  if (m.videoMessage) return "video";
  if (m.documentMessage) return "document";
  if (m.stickerMessage) return "sticker";
  return "text";
}

function isFromMe(msg: EvoMessage): boolean {
  const v = msg.key?.fromMe;
  return v === true || v === 1 || v === "true" || v === "1";
}

function stripPhone(p: string): string {
  return p.replace(/\D/g, "");
}

function normalizeChat(raw: Record<string, unknown>): EvoChat | null {
  try {
    const jid = (
      raw.remoteJid ??
      raw.id ??
      raw.chatId ??
      (raw.key && typeof raw.key === "object" ? (raw.key as Record<string, unknown>).remoteJid : undefined) ??
      ""
    ) as string;

    if (!jid || !jid.includes("@")) return null;
    if (jid.endsWith("@g.us")) return null; // Ignora grupos

    const nameRaw = ((raw.pushName ?? raw.name ?? raw.contactName ?? "") as string).trim();

    let ts = 0;
    const tsRaw = raw.lastMsgTimestamp ?? raw.lastMessageTimestamp ?? raw.updatedAt ?? raw.timestamp;
    if (typeof tsRaw === "number") ts = tsRaw;
    else if (typeof tsRaw === "string" && tsRaw) ts = Math.floor(new Date(tsRaw).getTime() / 1000);

    let remoteJidAlt: string | undefined;
    if (jid.includes("@lid") && raw.lastMessage && typeof raw.lastMessage === "object") {
      const lm = raw.lastMessage as Record<string, unknown>;
      const k = lm.key as Record<string, unknown> | undefined;
      if (typeof k?.remoteJidAlt === "string" && k.remoteJidAlt) {
        remoteJidAlt = k.remoteJidAlt;
      }
    }

    const jidFallback = (jid.includes("@lid") && remoteJidAlt)
      ? remoteJidAlt.split("@")[0]
      : jid.split("@")[0];

    const lastMsgPushName = (raw.lastMessage && typeof raw.lastMessage === "object"
      ? ((raw.lastMessage as Record<string, unknown>).pushName as string | undefined) ?? ""
      : "");

    const name = (nameRaw || lastMsgPushName || jidFallback).trim();

    return { remoteJid: jid, remoteJidAlt, name, lastMessageTimestamp: ts };
  } catch {
    return null;
  }
}

async function evoFetch<T>(baseUrl: string, token: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", apikey: token, ...options?.headers },
  });
  if (!res.ok) throw new Error(`Evolution API ${res.status}`);
  return res.json();
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parâmetros
  let targetInstance: string | null = null;
  let days = 60;
  let msgsPerChat = 500;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      targetInstance = body.instance_name || null;
      days = body.days ?? 60;
      msgsPerChat = body.msgs_per_chat ?? 500;
    } catch { /* usa defaults */ }
  }

  // Config da Evolution API
  const { data: evoConfig } = await supabase
    .from("evolution_config")
    .select("api_url, api_token")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!evoConfig) {
    return new Response(JSON.stringify({ error: "Evolution API não configurada" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = (evoConfig.api_url as string).replace(/\/$/, "");
  const apiToken = evoConfig.api_token as string;
  const cutoffTs = Math.floor(Date.now() / 1000) - (days * 86400);

  // Busca instâncias
  let instanceNames: string[] = [];
  if (targetInstance) {
    instanceNames = [targetInstance];
  } else {
    try {
      const data = await evoFetch<unknown[]>(baseUrl, apiToken, "/instance/fetchInstances");
      instanceNames = data.map((item) => {
        const i = item as Record<string, unknown>;
        if (i.name) return i.name as string;
        if (i.instance && typeof i.instance === "object") return (i.instance as Record<string, unknown>).instanceName as string;
        return i.instanceName as string;
      }).filter(Boolean);
    } catch (e) {
      return new Response(JSON.stringify({ error: `Erro ao buscar instâncias: ${e}` }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }
  }

  const stats = {
    instances: instanceNames.length,
    chats_processed: 0,
    messages_inserted: 0,
    errors: [] as string[],
  };

  for (const instanceName of instanceNames) {
    try {
      // Busca chats da instância
      let rawChats: unknown[] = [];
      try {
        const data = await evoFetch<unknown>(baseUrl, apiToken, `/chat/findChats/${instanceName}`, {
          method: "POST", body: JSON.stringify({}),
        });
        rawChats = Array.isArray(data) ? data : [];
      } catch {
        try {
          const data = await evoFetch<unknown>(baseUrl, apiToken, `/chat/findChats/${instanceName}`);
          rawChats = Array.isArray(data) ? data : [];
        } catch { continue; }
      }

      // Normaliza chats
      const chats: EvoChat[] = rawChats
        .map((c) => normalizeChat(c as Record<string, unknown>))
        .filter((c): c is EvoChat => c !== null);

      // Upsert conversas no banco
      const convsToInsert = chats.map((c) => {
        const phoneJid = c.remoteJidAlt || c.remoteJid;
        const phone = stripPhone(phoneJid.split("@")[0]);
        return {
          instance_name: instanceName,
          remote_jid: c.remoteJid,
          remote_jid_alt: c.remoteJidAlt || null,
          contato_nome: c.name || phone,
          contato_telefone: phone,
          ultima_mensagem_em: c.lastMessageTimestamp
            ? new Date(c.lastMessageTimestamp * 1000).toISOString()
            : null,
          status: "answered",
        };
      });

      if (convsToInsert.length > 0) {
        // Insere em batches de 100
        for (let b = 0; b < convsToInsert.length; b += 100) {
          const batch = convsToInsert.slice(b, b + 100);
          await supabase
            .from("conversas_whatsapp")
            .upsert(batch, { onConflict: "instance_name,remote_jid" });
        }
      }

      // Para cada chat, busca mensagens dos últimos N dias
      for (const chat of chats) {
        try {
          // Busca mensagens com filtro de timestamp
          const jidsToFetch = [chat.remoteJid];
          if (chat.remoteJidAlt) jidsToFetch.push(chat.remoteJidAlt);

          const allMsgs: EvoMessage[] = [];

          for (const jid of jidsToFetch) {
            try {
              const data = await evoFetch<{ messages?: { records?: EvoMessage[] } }>(
                baseUrl, apiToken,
                `/chat/findMessages/${instanceName}`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    where: {
                      key: { remoteJid: jid },
                      messageTimestamp: { gte: cutoffTs },
                    },
                    limit: msgsPerChat,
                  }),
                }
              );
              const records = data?.messages?.records ?? [];
              allMsgs.push(...records);
            } catch { /* silencioso por JID */ }
          }

          if (allMsgs.length === 0) continue;

          // Deduplica por key.id
          const seen = new Set<string>();
          const uniqueMsgs = allMsgs.filter((m) => {
            const id = m?.key?.id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });

          // Prepara batch de inserção
          const msgsToInsert = uniqueMsgs
            .filter((m) => m?.key?.id)
            .map((m) => ({
              instance_name: instanceName,
              remote_jid: m.key.remoteJid || chat.remoteJid,
              push_name: m.pushName || null,
              corpo: extractText(m) || "",
              tipo: detectType(m),
              direcao: isFromMe(m) ? "saida" as const : "entrada" as const,
              external_message_id: m.key.id,
              message_timestamp: m.messageTimestamp || null,
              enviada_em: m.messageTimestamp
                ? new Date(m.messageTimestamp * 1000).toISOString()
                : null,
            }));

          // Insere em batches de 200
          for (let b = 0; b < msgsToInsert.length; b += 200) {
            const batch = msgsToInsert.slice(b, b + 200);
            const { error } = await supabase
              .from("mensagens_whatsapp")
              .upsert(batch, { onConflict: "instance_name,external_message_id", ignoreDuplicates: true });
            if (!error) {
              stats.messages_inserted += batch.length;
            }
          }

          // Atualiza última mensagem da conversa
          const lastMsg = uniqueMsgs
            .sort((a, b) => (b.messageTimestamp || 0) - (a.messageTimestamp || 0))[0];
          if (lastMsg) {
            await supabase.from("conversas_whatsapp")
              .update({
                ultima_mensagem: extractText(lastMsg) || "",
                ultima_mensagem_em: lastMsg.messageTimestamp
                  ? new Date(lastMsg.messageTimestamp * 1000).toISOString()
                  : null,
                atualizado_em: new Date().toISOString(),
              })
              .eq("instance_name", instanceName)
              .eq("remote_jid", chat.remoteJid);
          }

          stats.chats_processed++;

          // Pequeno delay para não sobrecarregar a API (50ms entre chats)
          await new Promise((r) => setTimeout(r, 50));
        } catch (e) {
          stats.errors.push(`${instanceName}/${chat.remoteJid}: ${String(e).slice(0, 100)}`);
        }
      }
    } catch (e) {
      stats.errors.push(`${instanceName}: ${String(e).slice(0, 200)}`);
    }
  }

  return new Response(JSON.stringify(stats, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
