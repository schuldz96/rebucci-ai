import { useState, useRef, useEffect, useCallback } from "react";
import { type Deal } from "@/data/mockData";
import { useContactStore } from "@/store/contactStore";
import { useDealStore } from "@/store/dealStore";
import { evolutionApi, type EvoInstance } from "@/lib/evolutionApi";
import { supabase } from "@/lib/supabase";
import { X, ChevronLeft, Send, Sparkles, Plus, UserPlus, Pencil, Check, Loader2, RefreshCw } from "lucide-react";
import { cn, formatPhone, stripPhone, getPhoneVariants } from "@/lib/utils";
import { motion } from "framer-motion";

const inputCls = "w-full px-3 py-1.5 rounded-lg bg-background border border-ring text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type DealEditKey = "responsibleUser" | "value" | "phone" | "group" | "priority";
type ContactEditKey = "company" | "activationDate" | "endDate" | "lastFeedback" | "nextFeedback";
type EditKey = DealEditKey | ContactEditKey;

interface ChatMsg { id: string; content: string; direction: "sent" | "received"; timestamp: string; type: string; }

interface Props {
  deal: Deal;
  onClose: () => void;
  onLinkContact: (dealId: string, contactId: string) => void;
}

function safeTime(ts: number) {
  try { return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

const DealDetailPanel = ({ deal, onClose, onLinkContact }: Props) => {
  const { contacts, updateContact } = useContactStore();
  const { updateDeal } = useDealStore();
  const [chatInput, setChatInput] = useState("");
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [editing, setEditing] = useState<EditKey | null>(null);
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatInstance, setChatInstance] = useState<string | null>(null);
  const [chatRemoteJid, setChatRemoteJid] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [allInstances, setAllInstances] = useState<string[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>("MarcoR");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatInstanceRef = useRef<string | null>(null);
  const chatRemoteJidRef = useRef<string | null>(null);

  const linkedContact = deal.contactId
    ? contacts.find((c) => c.id === deal.contactId) ?? null
    : null;

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

  // ── Evolution API chat search ────────────────────────────────────────────────
  const ensureConfigured = async (): Promise<boolean> => {
    if (evolutionApi.isConfigured()) return true;
    const { data } = await supabase
      .from("evolution_config")
      .select("api_url, api_token")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!data?.api_url) return false;
    evolutionApi.configure(data.api_url, data.api_token);
    return true;
  };

  const searchInInstance = async (instanceName: string, variants: string[]): Promise<{ remoteJid: string; msgs: ReturnType<typeof processMsgs> } | null> => {
    // Tentativa 1: fetchMessages direto com variantes @s.whatsapp.net
    for (const variant of variants) {
      const remoteJid = `${variant}@s.whatsapp.net`;
      const msgs = await evolutionApi.fetchMessages(instanceName, remoteJid, 50);
      if (msgs.length > 0) return { remoteJid, msgs: processMsgs(msgs) };
    }
    // Tentativa 2: fetchChats (cobre @lid e outros formatos)
    const chats = await evolutionApi.fetchChats(instanceName, 500);
    const found = chats.find((c) => {
      const chatPhone = (c.remoteJidAlt ?? c.remoteJid).split("@")[0];
      return variants.some((v) => chatPhone === v || chatPhone === v.slice(2));
    });
    if (found) {
      const msgs = await evolutionApi.fetchMessages(instanceName, found.remoteJid, 50);
      return { remoteJid: found.remoteJid, msgs: processMsgs(msgs) };
    }
    return null;
  };

  const findAndLoadChat = useCallback(async (forceInstance?: string) => {
    const phone = deal.phone || linkedContact?.phone;
    if (!phone) return;

    setLoadingChat(true);
    setChatError(null);
    setChatMessages([]);
    setChatInstance(null);
    setChatRemoteJid(null);

    try {
      const ok = await ensureConfigured();
      if (!ok) {
        setChatError("Evolution API não configurada. Configure em Configurações → EvolutionAPI.");
        setLoadingChat(false);
        return;
      }

      const variants = getPhoneVariants(phone);
      const instances: EvoInstance[] = await evolutionApi.fetchInstances();
      const activeInstances = instances.filter(i => i.instance.status === "open");
      const names = activeInstances.map(i => i.instance.instanceName);

      // Atualiza lista de instâncias disponíveis
      setAllInstances(names);

      const instancesToSearch = forceInstance
        ? [forceInstance]
        : names;

      for (const instanceName of instancesToSearch) {
        const result = await searchInInstance(instanceName, variants);
        if (result) {
          setChatInstance(instanceName);
          setChatRemoteJid(result.remoteJid);
          setChatMessages(result.msgs);
          setLoadingChat(false);
          return;
        }
      }

      const ctx = forceInstance ? `na instância "${forceInstance}"` : "nas instâncias ativas";
      setChatError(`Nenhuma conversa encontrada para este número ${ctx}.`);
    } catch (e) {
      setChatError("Erro ao buscar conversa: " + (e instanceof Error ? e.message : String(e)));
    }
    setLoadingChat(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.phone, linkedContact?.phone]);

  function processMsgs(raw: Parameters<typeof evolutionApi.extractMessageText>[0][]): ChatMsg[] {
    return [...raw]
      .sort((a, b) => (a.messageTimestamp ?? 0) - (b.messageTimestamp ?? 0))
      .filter((m) => m?.key)
      .map((m) => ({
        id: m.key?.id ?? `msg-${Math.random()}`,
        content: evolutionApi.extractMessageText(m) || "",
        type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
        direction: m.key?.fromMe ? "sent" : "received",
        timestamp: m.messageTimestamp ? safeTime(m.messageTimestamp) : "",
      }));
  }

  // Mantém refs atualizados para o polling acessar sem re-criar o interval
  useEffect(() => { chatInstanceRef.current = chatInstance; }, [chatInstance]);
  useEffect(() => { chatRemoteJidRef.current = chatRemoteJid; }, [chatRemoteJid]);

  // Carregamento inicial usando a instância selecionada por padrão
  useEffect(() => {
    const inst = selectedInstance === "auto" ? undefined : selectedInstance;
    findAndLoadChat(inst);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling silencioso a cada 3s para capturar respostas recebidas
  useEffect(() => {
    const poll = async () => {
      const inst = chatInstanceRef.current;
      const jid = chatRemoteJidRef.current;
      if (!inst || !jid) return;
      try {
        const msgs = await evolutionApi.fetchMessages(inst, jid, 50);
        if (msgs.length > 0) {
          const processed = processMsgs(msgs);
          setChatMessages((prev) => {
            if (processed.length === prev.length && processed[processed.length - 1]?.id === prev[prev.length - 1]?.id) return prev;
            return processed;
          });
        }
      } catch {
        // silencioso — não exibe erro no polling
      }
    };

    pollingRef.current = setInterval(poll, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!chatInput.trim() || !chatInstance || !chatRemoteJid) return;
    setSending(true);
    const text = chatInput.trim();
    setChatInput("");
    // Optimistic
    const tempMsg: ChatMsg = { id: `temp-${Date.now()}`, content: text, direction: "sent", timestamp: safeTime(Date.now() / 1000), type: "text" };
    setChatMessages((prev) => [...prev, tempMsg]);
    try {
      const phone = chatRemoteJid.split("@")[0];
      await evolutionApi.sendTextMessage(chatInstance, phone, text);
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setChatInput(text);
    }
    setSending(false);
  };

  // ── Inline edit ──────────────────────────────────────────────────────────────
  const startEdit = (key: EditKey, val: string) => {
    setEditing(key);
    setEditVal(val);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const dealKeys: DealEditKey[] = ["responsibleUser", "value", "phone", "group", "priority"];
    if (dealKeys.includes(editing as DealEditKey)) {
      const patch: Partial<Deal> = {};
      if (editing === "value") patch.value = Number(editVal) || 0;
      else (patch as Record<string, string>)[editing] = editVal;
      await updateDeal(deal.id, patch);
    } else if (linkedContact) {
      await updateContact(linkedContact.id, { [editing]: editVal || undefined });
    }
    setEditing(null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditing(null);
  };

  const EditableRow = ({ label, fieldKey, display, rawVal, type = "text", options }: {
    label: string; fieldKey: EditKey; display: string; rawVal: string;
    type?: "text" | "number" | "date" | "select"; options?: { value: string; label: string }[];
  }) => {
    const isEditing = editing === fieldKey;
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 group">
        <span className="text-xs text-muted-foreground">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-1.5 ml-4 flex-1 justify-end">
            {type === "select" && options ? (
              <select ref={inputRef as React.RefObject<HTMLSelectElement>} value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={saveEdit}
                className="px-2 py-1 rounded-lg bg-background border border-ring text-xs text-foreground focus:outline-none">
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input ref={inputRef as React.RefObject<HTMLInputElement>} type={type} value={editVal}
                onChange={(e) => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={handleKey}
                className="px-2 py-1 rounded-lg bg-background border border-ring text-xs text-foreground focus:outline-none w-40" />
            )}
            <button onClick={saveEdit} className="text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-foreground font-medium">{display}</span>
            <button onClick={() => startEdit(fieldKey, rawVal)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
        className="flex w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">

        {/* LEFT */}
        <div className="w-[380px] shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <span className="text-xs text-muted-foreground">Lead #{deal.id}</span>
            </div>
            <h2 className="text-lg font-bold text-foreground">{deal.title}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{deal.stage}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Contato vinculado */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato vinculado</label>
              {linkedContact ? (
                <div className="p-3 rounded-xl bg-secondary border border-border">
                  <p className="text-sm font-medium text-foreground">{linkedContact.name}</p>
                  <p className="text-xs text-muted-foreground">{linkedContact.email}</p>
                  <p className="text-xs text-muted-foreground">{formatPhone(linkedContact.phone)}</p>
                </div>
              ) : (
                <button onClick={() => setShowLinkContact(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center"><Plus className="w-4 h-4" /></div>
                  <span className="text-sm">Adicionar contato</span>
                </button>
              )}
            </div>

            {showLinkContact && (
              <div className="p-3 rounded-xl bg-secondary border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Vincular contato existente</p>
                  <button onClick={() => setShowLinkContact(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
                <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Buscar por nome, email ou telefone..." className={inputCls} />
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {filteredContacts.map((c) => (
                    <button key={c.id} onClick={() => { onLinkContact(deal.id, c.id); setShowLinkContact(false); }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-secondary/80 transition-colors">
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

            {/* Negócio */}
            <div className="space-y-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Negócio</p>
              <EditableRow label="Usuário responsável" fieldKey="responsibleUser" display={deal.responsibleUser || "—"} rawVal={deal.responsibleUser || ""} />
              <EditableRow label="Venda" fieldKey="value" display={formatCurrency(deal.value)} rawVal={String(deal.value)} type="number" />
              <EditableRow label="Telefone" fieldKey="phone" display={deal.phone ? formatPhone(deal.phone) : "—"} rawVal={deal.phone || ""} />
              <EditableRow label="Grupo" fieldKey="group" display={deal.group || "—"} rawVal={deal.group || ""} />
              <EditableRow label="Prioridade" fieldKey="priority"
                display={deal.priority === "high" ? "Alta" : deal.priority === "medium" ? "Média" : "Baixa"}
                rawVal={deal.priority} type="select"
                options={[{ value: "high", label: "Alta" }, { value: "medium", label: "Média" }, { value: "low", label: "Baixa" }]} />
            </div>

            {/* Dados do contato */}
            {linkedContact && (
              <div className="space-y-0 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do contato</p>
                <EditableRow label="Empresa" fieldKey="company" display={linkedContact.company || "—"} rawVal={linkedContact.company || ""} />
                <EditableRow label="Data Ativação" fieldKey="activationDate" display={linkedContact.activationDate || "—"} rawVal={linkedContact.activationDate || ""} type="date" />
                <EditableRow label="Data Término" fieldKey="endDate" display={linkedContact.endDate || "—"} rawVal={linkedContact.endDate || ""} type="date" />
                <EditableRow label="Último Feedback" fieldKey="lastFeedback" display={linkedContact.lastFeedback || "—"} rawVal={linkedContact.lastFeedback || ""} type="date" />
                <EditableRow label="Próximo Feedback" fieldKey="nextFeedback" display={linkedContact.nextFeedback || "—"} rawVal={linkedContact.nextFeedback || ""} type="date" />
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
              {/* Seletor de instância */}
              <select
                value={selectedInstance}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedInstance(val);
                  findAndLoadChat(val === "auto" ? undefined : val);
                }}
                className="text-xs px-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="auto">Automático</option>
                {/* Garante que a opção padrão aparece mesmo antes das instâncias carregarem */}
                {!allInstances.includes(selectedInstance) && selectedInstance !== "auto" && (
                  <option value={selectedInstance}>{selectedInstance}</option>
                )}
                {allInstances.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {chatInstance && (
                <span className="text-[10px] text-success shrink-0">● {chatInstance}</span>
              )}
              <button onClick={() => findAndLoadChat(selectedInstance === "auto" ? undefined : selectedInstance)} disabled={loadingChat}
                className="p-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40" title="Recarregar chat">
                <RefreshCw className={cn("w-3.5 h-3.5", loadingChat && "animate-spin")} />
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Resumir
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">Fechar conversa</button>
              <button className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">Colocar em espera</button>
              <span className="text-[10px] px-2 py-1 rounded-lg border border-primary/30 text-primary font-mono">Conversa Nº A4060{deal.id}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingChat && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm">Buscando conversa...</p>
                {deal.phone && (
                  <p className="text-xs opacity-60">
                    Tentando: {getPhoneVariants(deal.phone).join(" / ")}
                  </p>
                )}
              </div>
            )}
            {!loadingChat && chatError && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <p className="text-sm text-muted-foreground text-center max-w-xs">{chatError}</p>
                <button onClick={findAndLoadChat} className="text-xs text-primary hover:underline">Tentar novamente</button>
              </div>
            )}
            {!loadingChat && !chatError && chatMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Nenhuma mensagem nesta conversa
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.direction === "sent" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                  msg.direction === "sent" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md")}>
                  <p>{msg.content}</p>
                  <p className={cn("text-[10px] mt-1", msg.direction === "sent" ? "text-primary-foreground/60" : "text-muted-foreground")}>{msg.timestamp}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
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
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={chatInstance ? "Escreva uma mensagem..." : "Sem conversa vinculada"}
                  disabled={!chatInstance || sending}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50" />
              </div>
              <button onClick={handleSend} disabled={!chatInstance || sending || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DealDetailPanel;
