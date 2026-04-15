import { create } from "zustand";
import { evolutionApi, isFromMe } from "@/lib/evolutionApi";
import { supabase } from "@/lib/supabase";
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

function isoToTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

      if (!get().selectedInstanceId && instances.length > 0) {
        const first = instances.find((i) => i.status === "online") ?? instances[0];
        set({ selectedInstanceId: first.id });
      }
    } catch {
      set({ loading: false });
    }
  },

  // ── Conversas: lê do banco, fallback para Evolution API ──
  loadConversations: async (instanceName: string) => {
    const ok = await ensureConfigured();
    if (!ok) return;
    set({ loading: true, conversations: [] });

    try {
      // 1) Tenta ler do banco (rápido: ~20ms)
      const { data: dbRows } = await supabase
        .from("conversas_whatsapp")
        .select("*")
        .eq("instance_name", instanceName)
        .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
        .limit(500);

      if (dbRows && dbRows.length > 0) {
        const conversations: Conversation[] = dbRows.map((r) => {
          const phone = r.contato_telefone || r.remote_jid?.split("@")[0] || "";
          return {
            id: r.remote_jid,
            instanceId: instanceName,
            contactName: r.contato_nome || phone || "Desconhecido",
            contactPhone: phone,
            lastMessage: r.ultima_mensagem || "",
            lastMessageTime: r.ultima_mensagem_em ? isoToTime(r.ultima_mensagem_em) : "",
            lastMessageTimestamp: r.ultima_mensagem_em ? Math.floor(new Date(r.ultima_mensagem_em).getTime() / 1000) : 0,
            unreadCount: r.nao_lidas || 0,
            status: (r.status as Conversation["status"]) || "pending",
            remoteJidAlt: r.remote_jid_alt || undefined,
          };
        });
        set({ conversations, loading: false });
        return;
      }

      // 2) Fallback: busca da Evolution API e salva no banco para próximas vezes
      const chats = await evolutionApi.fetchChats(instanceName, 200);
      const conversations: Conversation[] = chats
        .filter((c) => c.remoteJid)
        .sort((a, b) => {
          if (!a.lastMessageTimestamp && !b.lastMessageTimestamp) return 0;
          if (!a.lastMessageTimestamp) return 1;
          if (!b.lastMessageTimestamp) return -1;
          return b.lastMessageTimestamp - a.lastMessageTimestamp;
        })
        .map((c) => {
          const phoneJid = c.remoteJidAlt || c.remoteJid;
          const phone = phoneJid.split("@")[0] || "";
          return {
            id: c.remoteJid,
            instanceId: instanceName,
            contactName: c.name || phone || "Desconhecido",
            contactPhone: phone,
            lastMessage: c.lastMessage || "",
            lastMessageTime: c.lastMessageTimestamp ? safeTimestamp(c.lastMessageTimestamp) : "",
            lastMessageTimestamp: c.lastMessageTimestamp || 0,
            unreadCount: c.unreadCount || 0,
            status: (c.unreadCount || 0) > 0 ? "pending" : "answered",
            remoteJidAlt: c.remoteJidAlt,
          };
        });

      // Salva conversas no banco em background (para próximas cargas serem rápidas)
      const toInsert = conversations.map((c) => ({
        instance_name: instanceName,
        remote_jid: c.id,
        remote_jid_alt: c.remoteJidAlt || null,
        contato_nome: c.contactName,
        contato_telefone: c.contactPhone,
        ultima_mensagem: c.lastMessage,
        ultima_mensagem_em: c.lastMessageTimestamp
          ? new Date(c.lastMessageTimestamp * 1000).toISOString()
          : null,
        nao_lidas: c.unreadCount,
        status: c.status,
      }));

      if (toInsert.length > 0) {
        supabase
          .from("conversas_whatsapp")
          .upsert(toInsert, { onConflict: "instance_name,remote_jid" })
          .then(() => {});
      }

      set({ conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  // ── Mensagens: lê do banco, fallback para Evolution API ──
  loadMessages: async (instanceName: string, remoteJid: string) => {
    const ok = await ensureConfigured();
    if (!ok) return;
    set({ loadingMessages: true, messages: [] });

    try {

      const conv = get().conversations.find((c) => c.id === remoteJid);

      // Monta lista de JIDs para buscar (principal + alt para @lid)
      const jids = [remoteJid];
      if (conv?.remoteJidAlt) jids.push(conv.remoteJidAlt);

      // 1) Tenta ler do banco (rápido)
      const { data: dbRows } = await supabase
        .from("mensagens_whatsapp")
        .select("*")
        .eq("instance_name", instanceName)
        .in("remote_jid", jids)
        .order("message_timestamp", { ascending: true })
        .limit(200);

      if (get().selectedConversationId !== remoteJid) return;

      if (dbRows && dbRows.length > 0) {
        const messages: ChatMessage[] = dbRows.map((m) => ({
          id: m.external_message_id || m.id,
          conversationId: remoteJid,
          content: m.corpo || "",
          type: (m.tipo === "audio" ? "audio" : m.tipo === "image" ? "image" : "text") as ChatMessage["type"],
          direction: m.direcao === "saida" ? "sent" : "received",
          timestamp: m.enviada_em ? isoToTime(m.enviada_em) : "",
        }));
        set({ messages, loadingMessages: false });
        return;
      }

      // 2) Fallback: busca da Evolution API
      const raw = await evolutionApi.fetchMessages(instanceName, remoteJid, 100, conv?.remoteJidAlt);
      if (get().selectedConversationId !== remoteJid) return;

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
          direction: isFromMe(m) ? "sent" : "received",
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

  // ── Poll: lê mensagens novas do banco (rápido) com fallback API ──
  pollMessages: async () => {
    const { selectedInstanceId, selectedConversationId, messages } = get();
    if (!selectedInstanceId || !selectedConversationId) return;

    const snapConvId = selectedConversationId;
    try {

      const conv = get().conversations.find((c) => c.id === snapConvId);

      // JIDs para buscar
      const jids = [snapConvId];
      if (conv?.remoteJidAlt) jids.push(conv.remoteJidAlt);

      // Busca do banco todas as mensagens e compara com estado atual
      const { data: dbRows } = await supabase
        .from("mensagens_whatsapp")
        .select("*")
        .eq("instance_name", selectedInstanceId)
        .in("remote_jid", jids)
        .order("message_timestamp", { ascending: true })
        .limit(200);

      if (get().selectedConversationId !== snapConvId) return;

      if (dbRows && dbRows.length > 0) {
        const newMessages: ChatMessage[] = dbRows.map((m) => ({
          id: m.external_message_id || m.id,
          conversationId: snapConvId,
          content: m.corpo || "",
          type: (m.tipo === "audio" ? "audio" : m.tipo === "image" ? "image" : "text") as ChatMessage["type"],
          direction: m.direcao === "saida" ? "sent" : "received",
          timestamp: m.enviada_em ? isoToTime(m.enviada_em) : "",
        }));

        // Só atualiza se há diferenças
        if (newMessages.length !== messages.length || newMessages.some((m, i) => m.id !== messages[i]?.id)) {
          set({ messages: newMessages });
        }
        return;
      }

      // Fallback: busca da API
      if (!evolutionApi.isConfigured()) return;
      const raw = await evolutionApi.fetchMessages(selectedInstanceId, snapConvId, 30, conv?.remoteJidAlt);
      if (get().selectedConversationId !== snapConvId) return;

      const sorted = [...raw].sort((a, b) =>
        (a.messageTimestamp ?? 0) - (b.messageTimestamp ?? 0)
      );
      const fallbackMessages: ChatMessage[] = sorted
        .filter((m) => m?.key)
        .map((m) => ({
          id: m.key?.id ?? `msg-${Math.random()}`,
          conversationId: snapConvId,
          content: evolutionApi.extractMessageText(m) || "",
          type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
          direction: isFromMe(m) ? "sent" : "received",
          timestamp: m.messageTimestamp ? safeTimestamp(m.messageTimestamp) : "",
        }));
      set({ messages: fallbackMessages });
    } catch { /* silencioso */ }
  },

  // ── Send: envia via API + salva no banco ──
  sendMessage: async (content: string) => {
    const { selectedInstanceId, selectedConversationId, messages } = get();
    if (!selectedInstanceId || !selectedConversationId) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId: selectedConversationId,
      content,
      type: "text",
      direction: "sent",
      timestamp: timeStr,
    };
    set({ messages: [...messages, optimistic] });

    try {
      const result = await evolutionApi.sendTextMessage(selectedInstanceId, selectedConversationId, content) as Record<string, unknown>;

      // Persiste no banco

      const sentKey = (result?.key as Record<string, unknown>) ?? {};
      const externalId = (sentKey.id as string) || tempId;
      const nowTs = Math.floor(now.getTime() / 1000);

      await supabase.from("mensagens_whatsapp").upsert({
        instance_name: selectedInstanceId,
        remote_jid: selectedConversationId,
        corpo: content,
        tipo: "text",
        direcao: "saida",
        external_message_id: externalId,
        message_timestamp: nowTs,
        enviada_em: now.toISOString(),
      }, { onConflict: "instance_name,external_message_id", ignoreDuplicates: true }).catch(() => {});

      // Atualiza conversa
      await supabase.from("conversas_whatsapp").upsert({
        instance_name: selectedInstanceId,
        remote_jid: selectedConversationId,
        ultima_mensagem: content,
        ultima_mensagem_em: now.toISOString(),
        status: "answered",
        atualizado_em: now.toISOString(),
      }, { onConflict: "instance_name,remote_jid" }).catch(() => {});

      // Substitui ID temporário pelo real
      set({
        messages: get().messages.map((m) =>
          m.id === tempId ? { ...m, id: externalId } : m
        ),
      });
    } catch { /* mantém mensagem otimista */ }
  },
}));
