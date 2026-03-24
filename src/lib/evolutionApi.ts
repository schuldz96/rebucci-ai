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
  id: string;
  remoteJid: string;
  name?: string;
  pushName?: string;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  unreadMessages?: number;
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
    // Estrutura v2 nested: { instance: { instanceName, status, ... }, chats, contacts, messages }
    if (item.instance && typeof item.instance === "object") {
      const inst = item.instance as Record<string, unknown>;
      return {
        instance: {
          instanceName: (inst.instanceName ?? inst.name ?? "") as string,
          owner: (inst.owner ?? inst.ownerJid ?? "") as string,
          profileName: (inst.profileName ?? inst.name ?? inst.instanceName ?? "") as string,
          status: normalizeStatus(inst.status ?? inst.state),
        },
        chats: (item.chats ?? inst.chats) as number | undefined,
        contacts: (item.contacts ?? inst.contacts) as number | undefined,
        messages: (item.messages ?? inst.messages) as number | undefined,
      };
    }

    // Estrutura v1 flat: { instanceName, status/state, owner, ... }
    if (item.instanceName || item.name) {
      return {
        instance: {
          instanceName: (item.instanceName ?? item.name ?? "") as string,
          owner: (item.owner ?? item.ownerJid ?? "") as string,
          profileName: (item.profileName ?? item.instanceName ?? item.name ?? "") as string,
          status: normalizeStatus(item.status ?? item.state),
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

    try {
      return await tryRequest("POST", JSON.stringify({}));
    } catch {
      try {
        return await tryRequest("GET");
      } catch {
        return [];
      }
    }
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
