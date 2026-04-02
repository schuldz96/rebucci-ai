import { useState, useRef, useEffect, useMemo } from "react";
import { useChatStore } from "@/store/chatStore";
import { evolutionApi } from "@/lib/evolutionApi";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Paperclip, Mic, Bot, Wifi, WifiOff,
  Phone, MessageSquare, Loader2,
} from "lucide-react";

type ConvFilter = "all" | "pending" | "unanswered" | "answered";
type SortMode = "recent" | "old" | "az" | "za";
type InstanceFilter = "all" | "online" | "offline";

const POLL_INTERVAL = 8000;

const WhatsAppPage = () => {
  const {
    instances, conversations, messages,
    selectedInstanceId, selectedConversationId,
    loading, loadingMessages,
    loadInstances, selectInstance, selectConversation, sendMessage, pollMessages,
  } = useChatStore();

  const [convFilter, setConvFilter] = useState<ConvFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [instFilter, setInstFilter] = useState<InstanceFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inicializa Evolution API com config salva
  useEffect(() => {
    const init = async () => {
      if (!evolutionApi.isConfigured()) {
        const { data } = await supabase.from("evolution_config").select("*").order("created_at", { ascending: false }).limit(1).single();
        if (data) evolutionApi.configure(data.api_url, data.api_token);
      }
      loadInstances();
    };
    init();
  }, []);

  // Polling quando há conversa selecionada — para quando aba está oculta
  const visibleRef = useRef(!document.hidden);

  useEffect(() => {
    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (selectedConversationId && visibleRef.current) {
        pollRef.current = setInterval(() => { pollMessages(); }, POLL_INTERVAL);
      }
    };

    const handleVisibility = () => {
      visibleRef.current = !document.hidden;
      if (document.hidden) {
        // Tab oculta → para polling
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } else {
        // Tab visível → poll imediato + retoma intervalo
        if (selectedConversationId) {
          pollMessages();
          startPolling();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    startPolling();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const filteredInstances = instances.filter((i) =>
    instFilter === "all" ? true : i.status === instFilter
  );

  const filteredConversations = useMemo(() => conversations
    .filter((c) => c.instanceId === selectedInstanceId)
    .filter((c) => convFilter === "all" ? true : c.status === convFilter)
    .filter((c) => searchTerm ? c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    .sort((a, b) => {
      if (sortMode === "az") return a.contactName.localeCompare(b.contactName);
      if (sortMode === "za") return b.contactName.localeCompare(a.contactName);
      if (sortMode === "old") return (a.lastMessageTimestamp ?? 0) - (b.lastMessageTimestamp ?? 0);
      return (b.lastMessageTimestamp ?? 0) - (a.lastMessageTimestamp ?? 0); // recent: mais recentes primeiro
    }), [conversations, selectedInstanceId, convFilter, searchTerm, sortMode]);

  const activeConversation = conversations.find((c) => c.id === selectedConversationId);

  const handleSend = async () => {
    if (!msgInput.trim()) return;
    const txt = msgInput.trim();
    setMsgInput("");
    await sendMessage(txt);
  };

  const convTabs: { key: ConvFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "pending", label: "Pendentes" },
    { key: "unanswered", label: "Não respondidas" },
    { key: "answered", label: "Respondidas" },
  ];

  const instTabs: { key: InstanceFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "online", label: "Online" },
    { key: "offline", label: "Offline" },
  ];

  return (
    <div className="flex h-full overflow-hidden">

      {/* Col 1: Instances */}
      <div className="w-[220px] border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground mb-3">Instâncias</h2>
          <div className="flex gap-1 flex-wrap">
            {instTabs.map((t) => (
              <button key={t.key} onClick={() => setInstFilter(t.key)}
                className={cn("text-xs px-2 py-1 rounded-lg transition-colors",
                  instFilter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                )}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && instances.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {filteredInstances.map((inst) => (
            <button key={inst.id} onClick={() => selectInstance(inst.id)}
              className={cn("w-full text-left p-3 rounded-xl transition-colors",
                selectedInstanceId === inst.id ? "bg-secondary" : "hover:bg-secondary/50"
              )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">{inst.name}</span>
                {inst.status === "online" ? <Wifi className="w-3.5 h-3.5 text-success shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              </div>
              <span className="text-xs text-muted-foreground">{inst.phone}</span>
            </button>
          ))}
          {!loading && filteredInstances.length === 0 && instances.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-2">Configure a EvolutionAPI em Configurações.</p>
          )}
        </div>
      </div>

      {/* Col 2: Conversations */}
      <div className="w-[300px] border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {convTabs.map((t) => (
              <button key={t.key} onClick={() => setConvFilter(t.key)}
                className={cn("text-xs px-2.5 py-1 rounded-lg transition-colors",
                  convFilter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                )}>{t.label}</button>
            ))}
          </div>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground">
            <option value="recent">Recente</option>
            <option value="old">Antigo</option>
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && filteredConversations.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {filteredConversations.map((conv) => (
            <button key={conv.id} onClick={() => selectConversation(conv.id)}
              className={cn("w-full text-left px-4 py-3 border-b border-border transition-colors",
                selectedConversationId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
              )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate mr-2">{conv.contactName}</span>
                <span className="text-xs text-muted-foreground shrink-0">{conv.lastMessageTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate mr-2">{conv.lastMessage}</p>
                {conv.unreadCount > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
          {!loading && selectedInstanceId && filteredConversations.length === 0 && (
            <p className="text-center text-muted-foreground text-sm p-8">Nenhuma conversa encontrada</p>
          )}
        </div>
      </div>

      {/* Col 3: Active Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {activeConversation.contactName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeConversation.contactName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />{activeConversation.contactPhone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ao vivo</span>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                  <Bot className="w-4 h-4" /> IA
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", msg.direction === "sent" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                      msg.direction === "sent"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn("text-[10px] mt-1 text-right",
                        msg.direction === "sent" ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>{msg.timestamp}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border shrink-0">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <button className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button onClick={handleSend} disabled={!msgInput.trim()}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppPage;
