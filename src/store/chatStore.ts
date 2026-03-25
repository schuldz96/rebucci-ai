import { create } from "zustand";
import { evolutionApi } from "@/lib/evolutionApi";
import type { ChatMessage, Conversation, Instance } from "@/data/mockData";

interface ChatState {
  instances: Instance[];
  conversations: Conversation[];
  messages: ChatMessage[];
  selectedInstanceId: string | null;
  selectedConversationId: string | null;
  loading: boolean;
  loadingMessages: boolean;

  loadInstances: () => Promise<void>;
  loadConversations: (instanceName: string) => Promise<void>;
  loadMessages: (instanceName: string, remoteJid: string) => Promise<void>;
  selectInstance: (id: string) => void;
  selectConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  pollMessages: () => Promise<void>;
}

async function ensureConfigured(): Promise<boolean> {
  if (evolutionApi.isConfigured()) return true;
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("evolution_config")
      .select("api_url, api_token")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data?.api_url && data?.api_token) {
      evolutionApi.configure(data.api_url, data.api_token);
      return true;
    }
  } catch { /* sem config salva */ }
  return false;
}

function safeTimestamp(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  instances: [],
  conversations: [],
  messages: [],
  selectedInstanceId: null,
  selectedConversationId: null,
  loading: false,
  loadingMessages: false,

  loadInstances: async () => {
    const ok = await ensureConfigured();
    if (!ok) return;
    set({ loading: true });
    try {
      const { supabase } = await import("@/lib/supabase");
      const [raw, { data: webhookRows }] = await Promise.all([
        evolutionApi.fetchInstances(),
        supabase.from("instance_webhooks").select("instance_name, display_name"),
      ]);

      const displayNames: Record<string, string> = {};
      (webhookRows ?? []).forEach((r: { instance_name: string; display_name: string | null }) => {
        if (r.display_name) displayNames[r.instance_name] = r.display_name;
      });

      const instances: Instance[] = raw.map((r) => ({
        id: r.instance.instanceName,
        name: displayNames[r.instance.instanceName] ?? r.instance.profileName ?? r.instance.instanceName,
        phone: (r.instance.owner ?? "").replace(/@s\.whatsapp\.net|@g\.us/g, ""),
        status: r.instance.status === "open" ? "online" : "offline",
      }));

      set({ instances, loading: false });

      // Auto-seleciona apenas sem disparar loadConversations automaticamente
      // (o usuário clica para carregar)
      if (!get().selectedInstanceId && instances.length > 0) {
        const first = instances.find((i) => i.status === "online") ?? instances[0];
        set({ selectedInstanceId: first.id });
      }
    } catch {
      set({ loading: false });
    }
  },

  loadConversations: async (instanceName: string) => {
    const ok = await ensureConfigured();
    if (!ok) return;
    set({ loading: true, conversations: [] });
    try {
      const chats = await evolutionApi.fetchChats(instanceName, 100);
      const conversations: Conversation[] = chats
        .filter((c) => c.remoteJid)
        .sort((a, b) => {
          // Sem timestamp vai pro fim
          if (!a.lastMessageTimestamp && !b.lastMessageTimestamp) return 0;
          if (!a.lastMessageTimestamp) return 1;
          if (!b.lastMessageTimestamp) return -1;
          return b.lastMessageTimestamp - a.lastMessageTimestamp;
        })
        .map((c) => {
          // Para JIDs @lid, o número real fica em remoteJidAlt
          const phoneJid = c.remoteJidAlt || c.remoteJid;
          const phone = phoneJid.split("@")[0] || "";
          return {
            id: c.remoteJid,
            instanceId: instanceName,
            contactName: c.name || phone || "Desconhecido",
            contactPhone: phone,
            lastMessage: c.lastMessage || "",
            lastMessageTime: c.lastMessageTimestamp ? safeTimestamp(c.lastMessageTimestamp) : "",
            unreadCount: c.unreadCount || 0,
            status: (c.unreadCount || 0) > 0 ? "pending" : "answered",
          };
        });
      set({ conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMessages: async (instanceName: string, remoteJid: string) => {
    const ok = await ensureConfigured();
    if (!ok) return;
    set({ loadingMessages: true, messages: [] });
    try {
      const raw = await evolutionApi.fetchMessages(instanceName, remoteJid, 100);
      const sorted = [...raw].sort((a, b) =>
        (a.messageTimestamp ?? 0) - (b.messageTimestamp ?? 0)
      );
      const messages: ChatMessage[] = sorted
        .filter((m) => m?.key)
        .map((m) => ({
          id: m.key?.id ?? `msg-${Math.random()}`,
          conversationId: remoteJid,
          content: evolutionApi.extractMessageText(m) || "",
          type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
          direction: m.key?.fromMe ? "sent" : "received",
          timestamp: m.messageTimestamp ? safeTimestamp(m.messageTimestamp) : "",
        }));
      set({ messages, loadingMessages: false });
    } catch {
      set({ loadingMessages: false });
    }
  },

  selectInstance: (id: string) => {
    set({ selectedInstanceId: id, selectedConversationId: null, conversations: [], messages: [] });
    get().loadConversations(id);
  },

  selectConversation: (id: string) => {
    const { selectedInstanceId } = get();
    set({ selectedConversationId: id, messages: [] });
    if (selectedInstanceId) get().loadMessages(selectedInstanceId, id);
  },

  pollMessages: async () => {
    const { selectedInstanceId, selectedConversationId } = get();
    if (!selectedInstanceId || !selectedConversationId) return;
    if (!evolutionApi.isConfigured()) return;
    try {
      const raw = await evolutionApi.fetchMessages(selectedInstanceId, selectedConversationId, 100);
      const sorted = [...raw].sort((a, b) =>
        (a.messageTimestamp ?? 0) - (b.messageTimestamp ?? 0)
      );
      const messages: ChatMessage[] = sorted
        .filter((m) => m?.key)
        .map((m) => ({
          id: m.key?.id ?? `msg-${Math.random()}`,
          conversationId: selectedConversationId,
          content: evolutionApi.extractMessageText(m) || "",
          type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
          direction: m.key?.fromMe ? "sent" : "received",
          timestamp: m.messageTimestamp ? safeTimestamp(m.messageTimestamp) : "",
        }));
      set({ messages });
    } catch { /* silencioso */ }
  },

  sendMessage: async (content: string) => {
    const { selectedInstanceId, selectedConversationId, messages } = get();
    if (!selectedInstanceId || !selectedConversationId) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversationId: selectedConversationId,
      content,
      type: "text",
      direction: "sent",
      timestamp: timeStr,
    };
    set({ messages: [...messages, optimistic] });
    try {
      await evolutionApi.sendTextMessage(selectedInstanceId, selectedConversationId, content);
    } catch { /* mantém mensagem otimista */ }
  },
}));
