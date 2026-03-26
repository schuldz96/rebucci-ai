import { useState } from "react";
import { type Deal, mockDealMessages } from "@/data/mockData";
import { useContactStore } from "@/store/contactStore";
import { X, ChevronLeft, Send, Sparkles, Plus, UserPlus } from "lucide-react";
import { cn, formatPhone, stripPhone } from "@/lib/utils";
import { motion } from "framer-motion";

const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

interface Props {
  deal: Deal;
  onClose: () => void;
  onLinkContact: (dealId: string, contactId: string) => void;
}

const DealDetailPanel = ({ deal, onClose, onLinkContact }: Props) => {
  const { contacts } = useContactStore();
  const [chatInput, setChatInput] = useState("");
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const linkedContact = deal.contactId
    ? contacts.find((c) => c.id === deal.contactId) || null
    : null;

  const messages = mockDealMessages.filter((m) => m.conversationId === deal.id);

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    const phoneDigits = stripPhone(contactSearch);
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (phoneDigits && c.phone.includes(phoneDigits))
    );
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        className="flex w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl"
      >
        {/* LEFT: Lead Info */}
        <div className="w-[380px] shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <span className="text-xs text-muted-foreground">Lead #{deal.id.replace("deal-", "")}</span>
            </div>
            <h2 className="text-lg font-bold text-foreground">{deal.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{deal.stage}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato vinculado</label>
              {linkedContact ? (
                <div className="p-3 rounded-xl bg-secondary border border-border">
                  <p className="text-sm font-medium text-foreground">{linkedContact.name}</p>
                  <p className="text-xs text-muted-foreground">{linkedContact.email}</p>
                  <p className="text-xs text-muted-foreground">{formatPhone(linkedContact.phone)}</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkContact(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Adicionar contato</span>
                </button>
              )}
            </div>

            {showLinkContact && (
              <div className="p-3 rounded-xl bg-secondary border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Vincular contato existente</p>
                  <button onClick={() => setShowLinkContact(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar por nome, email ou telefone..."
                  className={inputCls}
                />
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onLinkContact(deal.id, c.id);
                        setShowLinkContact(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-secondary/80 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatPhone(c.phone)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {[
                { label: "Usuário responsável", value: deal.responsibleUser || "..." },
                { label: "Venda", value: formatCurrency(deal.value) },
                { label: "Telefone", value: deal.phone ? formatPhone(deal.phone) : "..." },
                { label: "Grupo", value: deal.group || "..." },
                { label: "Prioridade", value: deal.priority === "high" ? "Alta" : deal.priority === "medium" ? "Média" : "Baixa" },
              ].map((field) => (
                <div key={field.label} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">{field.label}</span>
                  <span className="text-xs text-foreground font-medium">{field.value}</span>
                </div>
              ))}
            </div>

            {linkedContact && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do contato</p>
                {[
                  { label: "Empresa", value: linkedContact.company },
                  { label: "Data Ativação", value: linkedContact.activationDate || "..." },
                  { label: "Data Término", value: linkedContact.endDate || "..." },
                  { label: "Último Feedback", value: linkedContact.lastFeedback || "..." },
                  { label: "Próximo Feedback", value: linkedContact.nextFeedback || "..." },
                ].map((field) => (
                  <div key={field.label} className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <span className="text-xs text-foreground font-medium">{field.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <p className="text-sm font-semibold text-foreground">{deal.contactName}</p>
              <p className="text-xs text-muted-foreground">{deal.phone ? formatPhone(deal.phone) : "Sem telefone"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Resumir
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                Fechar conversa
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                Colocar em espera
              </button>
              <span className="text-[10px] px-2 py-1 rounded-lg border border-primary/30 text-primary font-mono">
                Conversa Nº A4060{deal.id.replace("deal-", "")}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Nenhuma mensagem nesta conversa
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.direction === "sent" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                  msg.direction === "sent"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                )}>
                  <p>{msg.content}</p>
                  <p className={cn("text-[10px] mt-1", msg.direction === "sent" ? "text-primary-foreground/60" : "text-muted-foreground")}>{msg.timestamp}</p>
                </div>
              </div>
            ))}

            <div className="space-y-1 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Hoje Usuário responsável foi alterado: 2 eventos <span className="text-primary cursor-pointer">Expandir</span></p>
              <p className="text-[10px] text-muted-foreground">
                Hoje SalesBot movido para:{" "}
                <span className="px-1.5 py-0.5 rounded bg-secondary border border-border text-foreground">Consultoria</span>{" "}
                de Incoming leads
              </p>
            </div>
          </div>

          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-warning">⏰</span>
              <span>Nenhuma tarefa planejada, comece <span className="text-primary underline cursor-pointer">adicionando uma</span></span>
            </div>
            <span>Participantes: 0</span>
          </div>

          <div className="p-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border">
                <span className="text-xs text-primary cursor-pointer hover:underline shrink-0">Bate-papo</span>
                <span className="text-xs text-muted-foreground shrink-0">com</span>
                <span className="text-xs text-primary cursor-pointer hover:underline shrink-0">todos os</span>
                <span className="text-xs text-muted-foreground shrink-0">:</span>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DealDetailPanel;
