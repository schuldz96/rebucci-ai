import { create } from "zustand";
import { mockConversations, mockMessages, mockInstances, type ChatMessage, type Conversation, type Instance } from "@/data/mockData";

interface ChatState {
  instances: Instance[];
  conversations: Conversation[];
  messages: ChatMessage[];
  selectedInstanceId: string | null;
  selectedConversationId: string | null;
  selectInstance: (id: string) => void;
  selectConversation: (id: string) => void;
  sendMessage: (content: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  instances: mockInstances,
  conversations: mockConversations,
  messages: mockMessages,
  selectedInstanceId: mockInstances[0]?.id ?? null,
  selectedConversationId: null,
  selectInstance: (id) => set({ selectedInstanceId: id, selectedConversationId: null }),
  selectConversation: (id) => set({ selectedConversationId: id }),
  sendMessage: (content) => {
    const { selectedConversationId, messages } = get();
    if (!selectedConversationId) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      content,
      type: "text",
      direction: "sent",
      timestamp: timeStr,
    };
    set({ messages: [...messages, newMsg] });
    // Simulate auto-reply
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        conversationId: selectedConversationId,
        content: "Mensagem recebida! Vou verificar e retorno em breve. 👍",
        type: "text",
        direction: "received",
        timestamp: timeStr,
      };
      set((state) => ({ messages: [...state.messages, reply] }));
    }, 1500);
  },
}));
