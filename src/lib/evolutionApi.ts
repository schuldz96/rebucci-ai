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
  remoteJid: string;        // JID normalizado (sempre preenchido após normalização)
  name: string;             // nome do contato
  lastMessage: string;      // texto da última mensagem
  lastMessageTimestamp: number; // unix timestamp
  unreadCount: number;
}

// Normaliza qualquer estrutura de chat da Evolution API para EvoChat
export function normalizeChat(raw: Record<string, unknown>): EvoChat | null {
  try {
    // JID: pode ser remoteJid, id, ou key.remoteJid
    const jid = (raw.remoteJid ?? raw.id ?? "") as string;
    if (!jid || (!jid.includes("@") && !jid.includes("-"))) return null;

    // Nome do contato
    const name = ((raw.pushName ?? raw.name ?? jid.split("@")[0] ?? "") as string).trim();

    // Timestamp da última mensagem — vários campos possíveis
    let ts = 0;
    if (typeof raw.lastMsgTimestamp === "number") ts = raw.lastMsgTimestamp;
    else if (typeof raw.lastMessageTimestamp === "number") ts = raw.lastMessageTimestamp;
    else if (raw.lastMessage && typeof raw.lastMessage === "object") {
      const lm = raw.lastMessage as Record<string, unknown>;
      const innerTs = lm.messageTimestamp ?? lm.timestamp;
      if (typeof innerTs === "number") ts = innerTs;
    }

    // Texto da última mensagem
    let lastText = "";
    if (typeof raw.lastMessage === "string") {
      lastText = raw.lastMessage;
    } else if (raw.lastMessage && typeof raw.lastMessage === "object") {
      const lm = raw.lastMessage as Record<string, unknown>;
      const msg = lm.message as Record<string, unknown> | undefined;
      lastText =
        (msg?.conversation as string) ??
        ((msg?.extendedTextMessage as Record<string, unknown>)?.text as string) ??
        (lm.body as string) ??
        "";
    }

    // Unread
    const unread = ((raw.unreadCount ?? raw.unreadMessages ?? 0) as number);

    return { remoteJid: jid, name, lastMessage: lastText, lastMessageTimestamp: ts, unreadCount: unread };
  } catch {
    return null;
  }
}

export interface EvoMessage {
  key: { remoteJid: string; fromMe: boolean; id: string };
  pushName?: string;
  messageTimestamp: number;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string };
    audioMessage?: Record<string, unknown>;
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

  async fetchChats(instanceName: string): Promise<EvoChat[]> {
    // Evolution API v2 usa POST para findChats
    const tryRequest = async (method: string, body?: string) => {
      const data = await this.request<unknown>(`/chat/findChats/${instanceName}`, {
        method,
        ...(body ? { body } : {}),
      });
      // Normaliza: array direto ou { chats: [...] }
      if (Array.isArray(data)) return data as EvoChat[];
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.chats)) return d.chats as EvoChat[];
      if (Array.isArray(d.data)) return d.data as EvoChat[];
      return [];
    };

    let raw: unknown[] = [];
    try {
      raw = await tryRequest("POST", JSON.stringify({}));
    } catch {
      try {
        raw = await tryRequest("GET");
      } catch {
        return [];
      }
    }
    return raw
      .map((item) => normalizeChat(item as Record<string, unknown>))
      .filter((c): c is EvoChat => c !== null);
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
    return (
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      msg.message?.imageMessage?.caption ??
      (msg.message?.audioMessage ? "[Áudio]" : "[Mensagem]")
    );
  }
}

export const evolutionApi = new EvolutionAPIService();
