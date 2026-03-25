// Serviço para comunicação com a Evolution API
// Suporta estrutura nested ({ instance: {...} }) e flat ({ instanceName: ... })

export interface EvoInstance {
  instance: {
    instanceName: string;
    owner?: string;
    profileName?: string;
    status: "open" | "close" | "connecting";
  };
  chats?: number;
  contacts?: number;
  messages?: number;
}

export interface EvoChat {
  remoteJid: string;         // JID principal (pode ser @lid no v2)
  remoteJidAlt?: string;     // telefone real (@s.whatsapp.net) quando remoteJid é @lid
  name: string;
  lastMessage: string;
  lastMessageTimestamp: number;
  unreadCount: number;
}

// Normaliza qualquer estrutura de chat da Evolution API para EvoChat
export function normalizeChat(raw: Record<string, unknown>): EvoChat | null {
  try {
    // JID: vários campos possíveis dependendo da versão da API
    const jid = (
      raw.remoteJid ??
      raw.id ??
      raw.chatId ??
      (raw.key && typeof raw.key === "object" ? (raw.key as Record<string, unknown>).remoteJid : undefined) ??
      ""
    ) as string;

    if (!jid || typeof jid !== "string") return null;
    // Aceita JIDs WhatsApp individuais (@s.whatsapp.net), grupos (@g.us), e qualquer formato com @
    if (!jid.includes("@") && !jid.includes("-") && !/^\d{7,}$/.test(jid)) return null;

    // Nome do contato
    const name = ((raw.pushName ?? raw.name ?? raw.contactName ?? jid.split("@")[0] ?? "") as string).trim();

    // Timestamp da última mensagem — vários campos possíveis
    let ts = 0;
    const tsRaw = raw.lastMsgTimestamp ?? raw.lastMessageTimestamp ?? raw.updatedAt ?? raw.timestamp;
    if (typeof tsRaw === "number") ts = tsRaw;
    else if (typeof tsRaw === "string" && tsRaw) ts = Math.floor(new Date(tsRaw).getTime() / 1000);
    else if (raw.lastMessage && typeof raw.lastMessage === "object") {
      const lm = raw.lastMessage as Record<string, unknown>;
      const innerTs = lm.messageTimestamp ?? lm.timestamp;
      if (typeof innerTs === "number") ts = innerTs;
    }

    // Texto da última mensagem
    let lastText = "";
    if (typeof raw.lastMessage === "string") {
      lastText = raw.lastMessage;
    } else if (typeof raw.text === "string") {
      lastText = raw.text;
    } else if (raw.lastMessage && typeof raw.lastMessage === "object") {
      const lm = raw.lastMessage as Record<string, unknown>;
      const msg = lm.message as Record<string, unknown> | undefined;
      lastText =
        (msg?.conversation as string) ??
        ((msg?.extendedTextMessage as Record<string, unknown>)?.text as string) ??
        (lm.body as string) ??
        "";
    }

    // remoteJidAlt: para JIDs @lid, o telefone real fica em lastMessage.key.remoteJidAlt
    let remoteJidAlt: string | undefined;
    if (jid.includes("@lid") && raw.lastMessage && typeof raw.lastMessage === "object") {
      const lm = raw.lastMessage as Record<string, unknown>;
      const k = lm.key as Record<string, unknown> | undefined;
      if (typeof k?.remoteJidAlt === "string" && k.remoteJidAlt) {
        remoteJidAlt = k.remoteJidAlt;
      }
    }

    // pushName do contato também pode estar em lastMessage.pushName
    const finalName = (name ||
      (raw.lastMessage && typeof raw.lastMessage === "object"
        ? ((raw.lastMessage as Record<string, unknown>).pushName as string | undefined) ?? ""
        : "")
    ).trim();

    // Unread
    const unread = ((raw.unreadCount ?? raw.unreadMessages ?? raw.unread ?? 0) as number);

    return { remoteJid: jid, remoteJidAlt, name: finalName, lastMessage: lastText, lastMessageTimestamp: ts, unreadCount: unread };
  } catch {
    return null;
  }
}

export interface EvoMessage {
  key: {
    remoteJid: string;
    remoteJidAlt?: string; // telefone real @s.whatsapp.net quando remoteJid é @lid
    fromMe: boolean;
    id: string;
    participant?: string;
    participantAlt?: string;
  };
  pushName?: string;
  messageTimestamp: number;
  messageType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string };
    audioMessage?: Record<string, unknown>;
    videoMessage?: Record<string, unknown>;
    stickerMessage?: Record<string, unknown>;
    documentMessage?: { title?: string; caption?: string };
    reactionMessage?: { text?: string };
  };
}

// Normaliza qualquer estrutura retornada pela Evolution API para EvoInstance
function normalizeInstance(item: Record<string, unknown>): EvoInstance | null {
  try {
    // ── Evolution API v2 real (resposta flat) ──────────────────────────────
    // { id, name, connectionStatus, ownerJid, profileName, _count: { Message, Contact, Chat } }
    if (item.name && item.connectionStatus !== undefined) {
      const count = (item._count ?? {}) as Record<string, number>;
      const owner = ((item.ownerJid ?? item.number ?? "") as string)
        .replace(/@s\.whatsapp\.net|@g\.us/g, "");
      return {
        instance: {
          instanceName: item.name as string,
          owner,
          profileName: (item.profileName as string | null) ?? (item.name as string),
          status: (item.connectionStatus as string) === "open" ? "open" : "close",
        },
        chats: count.Chat,
        contacts: count.Contact,
        messages: count.Message,
      };
    }

    // ── Estrutura nested legada: { instance: { instanceName, status, ... } } ──
    if (item.instance && typeof item.instance === "object") {
      const inst = item.instance as Record<string, unknown>;
      const count = (item._count ?? {}) as Record<string, number>;
      return {
        instance: {
          instanceName: (inst.instanceName ?? inst.name ?? "") as string,
          owner: ((inst.owner ?? inst.ownerJid ?? "") as string).replace(/@s\.whatsapp\.net|@g\.us/g, ""),
          profileName: (inst.profileName ?? inst.name ?? inst.instanceName ?? "") as string,
          status: normalizeStatus(inst.connectionStatus ?? inst.status ?? inst.state),
        },
        chats: (item.chats ?? count.Chat) as number | undefined,
        contacts: (item.contacts ?? count.Contact) as number | undefined,
        messages: (item.messages ?? count.Message) as number | undefined,
      };
    }

    // ── Estrutura flat legada: { instanceName, status/state, ... } ──────────
    if (item.instanceName) {
      return {
        instance: {
          instanceName: item.instanceName as string,
          owner: ((item.owner ?? item.ownerJid ?? "") as string).replace(/@s\.whatsapp\.net|@g\.us/g, ""),
          profileName: (item.profileName ?? item.instanceName ?? "") as string,
          status: normalizeStatus(item.connectionStatus ?? item.status ?? item.state),
        },
        chats: item.chats as number | undefined,
        contacts: item.contacts as number | undefined,
        messages: item.messages as number | undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeStatus(raw: unknown): "open" | "close" | "connecting" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "open" || s === "online" || s === "connected") return "open";
  if (s === "connecting" || s === "qrcode") return "connecting";
  return "close";
}

class EvolutionAPIService {
  private baseUrl = "";
  private apiKey = "";

  configure(url: string, key: string) {
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey = key;
  }

  isConfigured() {
    return !!(this.baseUrl && this.apiKey);
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey,
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Evolution API ${res.status}: ${text}`);
    }
    return res.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchInstances();
      return true;
    } catch {
      return false;
    }
  }

  async fetchInstances(): Promise<EvoInstance[]> {
    const data = await this.request<unknown>("/instance/fetchInstances");
    const arr: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.instances)
        ? ((data as Record<string, unknown>).instances as unknown[])
        : [];

    return arr
      .map((item) => normalizeInstance(item as Record<string, unknown>))
      .filter((i): i is EvoInstance => i !== null);
  }

  async fetchChats(instanceName: string, limit = 100): Promise<EvoChat[]> {
    const toArray = (data: unknown): unknown[] => {
      if (Array.isArray(data)) return data;
      const d = data as Record<string, unknown>;
      return Array.isArray(d.chats) ? d.chats
        : Array.isArray(d.data) ? d.data
        : Array.isArray(d.records) ? d.records
        : [];
    };

    let raw: unknown[] = [];

    // findChats POST {} — padrão Evolution API v2 (mais simples e confiável)
    try {
      const data = await this.request(`/chat/findChats/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      raw = toArray(data);
    } catch { /* try GET */ }

    // Fallback GET
    if (raw.length === 0) {
      try {
        const data = await this.request(`/chat/findChats/${instanceName}`);
        raw = toArray(data);
      } catch { return []; }
    }

    if (raw.length === 0) return [];

    // Normaliza + deduplica (@lid e @s.whatsapp.net do mesmo contato viram 1 entrada)
    const phoneMap = new Map<string, EvoChat>();

    for (const item of raw) {
      const c = normalizeChat(item as Record<string, unknown>);
      if (!c) continue;

      // Chave de dedup: para @lid usa o telefone real (remoteJidAlt), senão usa o número do JID
      const dedupKey = (c.remoteJid.includes("@lid") && c.remoteJidAlt)
        ? c.remoteJidAlt.replace(/@.*/, "")
        : c.remoteJid.replace(/@.*/, "");

      if (!dedupKey) continue;

      const existing = phoneMap.get(dedupKey);
      if (!existing) {
        phoneMap.set(dedupKey, c);
      } else {
        // Merge: mantém o mais recente, preserva nome e unread
        const newer = c.lastMessageTimestamp >= existing.lastMessageTimestamp ? c : existing;
        const older = newer === c ? existing : c;
        phoneMap.set(dedupKey, {
          ...newer,
          name: newer.name || older.name,
          unreadCount: Math.max(newer.unreadCount, older.unreadCount),
        });
      }
    }

    return Array.from(phoneMap.values())
      .sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0))
      .slice(0, limit);
  }

  async connectInstance(instanceName: string): Promise<{ pairingCode?: string; code?: string } | null> {
    try {
      return await this.request<{ pairingCode?: string; code?: string }>(
        `/instance/connect/${instanceName}`
      );
    } catch {
      return null;
    }
  }

  async fetchMessages(instanceName: string, remoteJid: string, limit = 50): Promise<EvoMessage[]> {
    try {
      const data = await this.request<{ messages: { records: EvoMessage[] } }>(
        `/chat/findMessages/${instanceName}`,
        {
          method: "POST",
          body: JSON.stringify({ where: { key: { remoteJid } }, limit }),
        }
      );
      return data?.messages?.records ?? [];
    } catch {
      return [];
    }
  }

  async sendTextMessage(instanceName: string, to: string, text: string) {
    return this.request(`/message/sendText/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({ number: to, text }),
    });
  }

  extractMessageText(msg: EvoMessage): string {
    const m = msg.message;
    if (!m) return "";
    return (
      m.conversation ??
      m.extendedTextMessage?.text ??
      m.imageMessage?.caption ??
      m.documentMessage?.caption ??
      m.documentMessage?.title ??
      m.reactionMessage?.text ??
      (m.audioMessage ? "[Áudio]" : undefined) ??
      (m.videoMessage ? "[Vídeo]" : undefined) ??
      (m.stickerMessage ? "[Sticker]" : undefined) ??
      ""
    );
  }
}

export const evolutionApi = new EvolutionAPIService();
