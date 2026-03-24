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

export const useChatStore = create<ChatState>((set, get) => ({
  instances: [],
  conversations: [],
  messages: [],
  selectedInstanceId: null,
  selectedConversationId: null,
  loading: false,
  loadingMessages: false,

  loadInstances: async () => {
    // Tenta carregar config do Supabase se ainda não configurado
    if (!evolutionApi.isConfigured()) {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.from("evolution_config").select("*").order("created_at", { ascending: false }).limit(1).single();
        if (data) evolutionApi.configure(data.api_url, data.api_token);
        else return;
      } catch {
        return;
      }
    }
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

      const instances: Instance[] = raw.map((r) => {
        const iName = r.instance.instanceName;
        const owner = (r.instance.owner ?? "").replace(/@s\.whatsapp\.net|@g\.us/g, "");
        return {
          id: iName,
          name: displayNames[iName] ?? r.instance.profileName ?? iName,
          phone: owner,
          status: r.instance.status === "open" ? "online" : "offline",
        };
      });
      set({ instances, loading: false });
      // Auto-select first online instance
      const first = instances.find((i) => i.status === "online") ?? instances[0];
      if (first && !get().selectedInstanceId) {
        get().selectInstance(first.id);
      }
    } catch {
      set({ loading: false });
    }
  },

  loadConversations: async (instanceName: string) => {
    if (!evolutionApi.isConfigured()) return;
    set({ loading: true });
    try {
      const chats = await evolutionApi.fetchChats(instanceName);
      const conversations: Conversation[] = chats
        .sort((a, b) => (b.lastMessageTimestamp ?? 0) - (a.lastMessageTimestamp ?? 0))
        .map((c) => ({
          id: c.remoteJid,
          instanceId: instanceName,
          contactName: c.pushName ?? c.name ?? c.remoteJid.split("@")[0],
          contactPhone: c.remoteJid.split("@")[0],
          lastMessage: c.lastMessage ?? "",
          lastMessageTime: c.lastMessageTimestamp
            ? new Date(c.lastMessageTimestamp * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : "",
          unreadCount: c.unreadMessages ?? 0,
          status: (c.unreadMessages ?? 0) > 0 ? "pending" : "answered",
        }));
      set({ conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMessages: async (instanceName: string, remoteJid: string) => {
    if (!evolutionApi.isConfigured()) return;
    set({ loadingMessages: true });
    try {
      const raw = await evolutionApi.fetchMessages(instanceName, remoteJid, 100);
      // Ordenar do mais antigo para o mais recente (para exibir corretamente no chat)
      const sorted = [...raw].sort((a, b) => a.messageTimestamp - b.messageTimestamp);
      const messages: ChatMessage[] = sorted.map((m) => ({
        id: m.key.id,
        conversationId: remoteJid,
        content: evolutionApi.extractMessageText(m),
        type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
        direction: m.key.fromMe ? "sent" : "received",
        timestamp: new Date(m.messageTimestamp * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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
    // Atualiza silenciosamente (sem loading state para não piscar)
    try {
      const raw = await evolutionApi.fetchMessages(selectedInstanceId, selectedConversationId, 100);
      const sorted = [...raw].sort((a, b) => a.messageTimestamp - b.messageTimestamp);
      const messages: ChatMessage[] = sorted.map((m) => ({
        id: m.key.id,
        conversationId: selectedConversationId,
        content: evolutionApi.extractMessageText(m),
        type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
        direction: m.key.fromMe ? "sent" : "received",
        timestamp: new Date(m.messageTimestamp * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      }));
      set({ messages });
    } catch {
      // Silencioso no poll
    }
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
    } catch {
      // Mantém a mensagem otimista mesmo em erro
    }
  },
}));
