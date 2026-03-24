// Serviço para comunicação com a Evolution API

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
    const data = await this.request<EvoInstance[] | { instances: EvoInstance[] }>("/instance/fetchInstances");
    return Array.isArray(data) ? data : data.instances ?? [];
  }

  async fetchChats(instanceName: string): Promise<EvoChat[]> {
    try {
      const data = await this.request<EvoChat[] | { chats: EvoChat[] }>(`/chat/findChats/${instanceName}`);
      return Array.isArray(data) ? data : data.chats ?? [];
    } catch {
      return [];
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
      return data.messages?.records ?? [];
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
