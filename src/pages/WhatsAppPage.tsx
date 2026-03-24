import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Send,
  Paperclip,
  Mic,
  Bot,
  Wifi,
  WifiOff,
  Plus,
  QrCode,
  Phone,
} from "lucide-react";

type ConvFilter = "all" | "pending" | "unanswered" | "answered";
type SortMode = "recent" | "old" | "az" | "za";
type InstanceFilter = "all" | "online" | "offline";

const WhatsAppPage = () => {
  const {
    instances,
    conversations,
    messages,
    selectedInstanceId,
    selectedConversationId,
    selectInstance,
    selectConversation,
    sendMessage,
  } = useChatStore();

  const [convFilter, setConvFilter] = useState<ConvFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [instFilter, setInstFilter] = useState<InstanceFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredInstances = instances.filter((i) =>
    instFilter === "all" ? true : i.status === instFilter
  );

  const filteredConversations = conversations
    .filter((c) => c.instanceId === selectedInstanceId)
    .filter((c) => (convFilter === "all" ? true : c.status === convFilter))
    .filter((c) =>
      searchTerm ? c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) : true
    )
    .sort((a, b) => {
      if (sortMode === "az") return a.contactName.localeCompare(b.contactName);
      if (sortMode === "za") return b.contactName.localeCompare(a.contactName);
      if (sortMode === "old") return 0;
      return 0; // recent is default order
    });

  const activeConversation = conversations.find((c) => c.id === selectedConversationId);
  const activeMessages = messages.filter((m) => m.conversationId === selectedConversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  const handleSend = () => {
    if (!msgInput.trim()) return;
    sendMessage(msgInput.trim());
    setMsgInput("");
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
    <div className="flex h-screen">
      {/* Col 1: Instances */}
      <div className="w-[240px] border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">Instâncias</h2>
          <div className="flex gap-1 mb-3">
            {instTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setInstFilter(t.key)}
                className={cn(
                  "text-xs px-2 py-1 rounded-lg transition-colors",
                  instFilter === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredInstances.map((inst) => (
            <button
              key={inst.id}
              onClick={() => selectInstance(inst.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-colors",
                selectedInstanceId === inst.id
                  ? "bg-secondary"
                  : "hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{inst.name}</span>
                {inst.status === "online" ? (
                  <Wifi className="w-3.5 h-3.5 text-success" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{inst.phone}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Nova Instância
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
            <QrCode className="w-4 h-4" /> Conectar via QR
          </button>
        </div>
      </div>

      {/* Col 2: Conversations */}
      <div className="w-[320px] border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {convTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setConvFilter(t.key)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg transition-colors",
                  convFilter === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground"
          >
            <option value="recent">Recente</option>
            <option value="old">Antigo</option>
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border transition-colors",
                selectedConversationId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{conv.contactName}</span>
                <span className="text-xs text-muted-foreground">{conv.lastMessageTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate mr-2">{conv.lastMessage}</p>
                {conv.unreadCount > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <p className="text-center text-muted-foreground text-sm p-8">Nenhuma conversa encontrada</p>
          )}
        </div>
      </div>

      {/* Col 3: Active Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {activeConversation.contactName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeConversation.contactName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {activeConversation.contactPhone}
                  </p>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                <Bot className="w-4 h-4" /> IA
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                {activeMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", msg.direction === "sent" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                        msg.direction === "sent"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      )}
                    >
                      <p>{msg.content}</p>
                      <p className={cn("text-[10px] mt-1 text-right", msg.direction === "sent" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
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
