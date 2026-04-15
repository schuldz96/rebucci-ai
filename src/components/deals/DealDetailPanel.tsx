import { useState, useRef, useEffect, useCallback } from "react";
import { type Deal } from "@/data/mockData";
import { useContactStore } from "@/store/contactStore";
import { useDealStore } from "@/store/dealStore";
import { evolutionApi, isFromMe, type EvoInstance } from "@/lib/evolutionApi";
import { supabase } from "@/lib/supabase";
import { X, ChevronLeft, Send, Plus, UserPlus, Pencil, Check, Loader2, RefreshCw, Paperclip, Mic, Image as ImageIcon, Video, File, Trash2 } from "lucide-react";
import { cn, formatPhone, stripPhone, getPhoneVariants } from "@/lib/utils";
import { motion } from "framer-motion";

const inputCls = "w-full px-3 py-1.5 rounded-lg bg-background border border-ring text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type DealEditKey = "responsibleUser" | "value" | "phone" | "group" | "priority";
type ContactEditKey = "company" | "activationDate" | "endDate" | "lastFeedback" | "nextFeedback";
type EditKey = DealEditKey | ContactEditKey;

interface ChatMsg { id: string; content: string; direction: "sent" | "received"; timestamp: string; type: string; ts: number; }

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
  const [clearingHistory, setClearingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ file: File; base64: string; preview?: string } | null>(null);
  const [allInstances, setAllInstances] = useState<string[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>("MarcoR");
  const [crmUsers, setCrmUsers] = useState<{ id: string; name: string }[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatInstanceRef = useRef<string | null>(null);
  const chatRemoteJidRef = useRef<string | null>(null);
  const chatAltJidRef = useRef<string | null>(null); // @s.whatsapp.net quando conversa usa @lid
  const lastTimestampRef = useRef<number>(0);

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

  const searchInInstance = async (instanceName: string, variants: string[]): Promise<{ remoteJid: string; altRemoteJid?: string; msgs: ReturnType<typeof processMsgs> } | null> => {
    const chats = await evolutionApi.fetchChats(instanceName, 500);
    const found = chats.find((c) => {
      const chatPhone = (c.remoteJidAlt ?? c.remoteJid).split("@")[0];
      return variants.some((v) => chatPhone === v || chatPhone === v.slice(2));
    });
    if (found) {
      const altRemoteJid = found.remoteJidAlt ?? undefined;
      const msgs = await evolutionApi.fetchMessages(instanceName, found.remoteJid, 100, altRemoteJid);
      if (msgs.length > 0) {
        // Salva no banco em background para próximas cargas
        persistMessages(instanceName, found.remoteJid, altRemoteJid, msgs);
        return { remoteJid: found.remoteJid, altRemoteJid, msgs: processMsgs(msgs, true) };
      }
    }
    for (const variant of variants) {
      const remoteJid = `${variant}@s.whatsapp.net`;
      const msgs = await evolutionApi.fetchMessages(instanceName, remoteJid, 100);
      if (msgs.length > 0) {
        persistMessages(instanceName, remoteJid, undefined, msgs);
        return { remoteJid, msgs: processMsgs(msgs, true) };
      }
    }
    return null;
  };

  // Salva mensagens da API no banco para consultas futuras (fire-and-forget)
  const persistMessages = (instanceName: string, remoteJid: string, altJid: string | undefined, rawMsgs: Parameters<typeof evolutionApi.extractMessageText>[0][]) => {
    const batch = rawMsgs.filter((m) => m?.key?.id).map((m) => ({
      instance_name: instanceName,
      remote_jid: m.key.remoteJid || remoteJid,
      push_name: (m as { pushName?: string }).pushName || null,
      corpo: evolutionApi.extractMessageText(m) || "",
      tipo: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
      direcao: isFromMe(m) ? "saida" : "entrada",
      external_message_id: m.key.id,
      message_timestamp: m.messageTimestamp || null,
      enviada_em: m.messageTimestamp ? new Date(m.messageTimestamp * 1000).toISOString() : null,
    }));
    // Insere em background (não bloqueia a UI)
    for (let b = 0; b < batch.length; b += 200) {
      supabase.from("mensagens_whatsapp")
        .upsert(batch.slice(b, b + 200), { onConflict: "instance_name,external_message_id", ignoreDuplicates: true })
        .then(() => {});
    }
    // Upsert conversa
    const phone = (altJid || remoteJid).split("@")[0]?.replace(/\D/g, "") || "";
    supabase.from("conversas_whatsapp")
      .upsert({
        instance_name: instanceName,
        remote_jid: remoteJid,
        remote_jid_alt: altJid || null,
        contato_nome: (rawMsgs[0] as { pushName?: string })?.pushName || phone,
        contato_telefone: phone,
        status: "answered",
      }, { onConflict: "instance_name,remote_jid" })
      .then(() => {});
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

      // ── Busca via Evolution API (fonte de verdade) + salva no banco ──
      const instances: EvoInstance[] = await evolutionApi.fetchInstances();
      const activeInstances = instances.filter(i => i.instance.status === "open");
      const names = activeInstances.map(i => i.instance.instanceName);
      setAllInstances(names);

      const instancesToSearch = forceInstance ? [forceInstance] : names;

      const searchResults = await Promise.all(
        instancesToSearch.map(async (instanceName) => {
          const result = await searchInInstance(instanceName, variants);
          return result ? { instanceName, result } : null;
        })
      );

      const found = searchResults.find(r => r !== null);
      if (found) {
        setChatInstance(found.instanceName);
        setChatRemoteJid(found.result.remoteJid);
        chatAltJidRef.current = found.result.altRemoteJid ?? null;

        // Merge: API + banco, deduplicado por ID
        const apiMsgs = found.result.msgs;
        const jids = [found.result.remoteJid];
        if (found.result.altRemoteJid) jids.push(found.result.altRemoteJid);

        const { data: dbRows } = await supabase
          .from("mensagens_whatsapp")
          .select("*")
          .eq("instance_name", found.instanceName)
          .in("remote_jid", jids)
          .order("message_timestamp", { ascending: true })
          .limit(300);

        const dbMsgs: ChatMsg[] = (dbRows ?? []).map((m) => ({
          id: m.external_message_id || m.id,
          content: m.corpo || "",
          type: (m.tipo === "audio" ? "audio" : m.tipo === "image" ? "image" : "text") as ChatMsg["type"],
          direction: (m.direcao === "saida" ? "sent" : "received") as ChatMsg["direction"],
          timestamp: m.enviada_em ? safeTime(Math.floor(new Date(m.enviada_em).getTime() / 1000)) : "",
          ts: m.message_timestamp ?? 0,
        }));

        // Dedup por ID: prioridade para API (mais fresco), complementa com banco
        const seenIds = new Set(apiMsgs.map((m) => m.id));
        const extra = dbMsgs.filter((m) => !seenIds.has(m.id));
        const merged = [...apiMsgs, ...extra].sort((a, b) => a.ts - b.ts);

        const maxTs = merged.length > 0 ? merged[merged.length - 1].ts : 0;
        if (maxTs > lastTimestampRef.current) lastTimestampRef.current = maxTs;

        setChatMessages(merged);
        setLoadingChat(false);
        return;
      }

      const ctx = forceInstance ? `na instância "${forceInstance}"` : "nas instâncias ativas";
      setChatError(`Nenhuma conversa encontrada para este número ${ctx}.`);
    } catch (e) {
      setChatError("Erro ao buscar conversa: " + (e instanceof Error ? e.message : String(e)));
    }
    setLoadingChat(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.phone, linkedContact?.phone]);

  function processMsgs(raw: Parameters<typeof evolutionApi.extractMessageText>[0][], updateLastTs = false): ChatMsg[] {
    const sorted = [...raw]
      .filter((m) => m?.key)
      .sort((a, b) => (a.messageTimestamp ?? 0) - (b.messageTimestamp ?? 0));

    if (updateLastTs && sorted.length > 0) {
      const maxTs = sorted[sorted.length - 1].messageTimestamp ?? 0;
      if (maxTs > lastTimestampRef.current) lastTimestampRef.current = maxTs;
    }

    return sorted.map((m) => ({
      id: m.key?.id ?? `msg-${Math.random()}`,
      content: evolutionApi.extractMessageText(m) || "",
      type: m.message?.audioMessage ? "audio" : m.message?.imageMessage ? "image" : "text",
      direction: isFromMe(m) ? "sent" : "received",
      timestamp: m.messageTimestamp ? safeTime(m.messageTimestamp) : "",
      ts: m.messageTimestamp ?? 0,
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

  // Carrega lista de usuários do sistema
  useEffect(() => {
    supabase.from("crm_users").select("id, name").eq("status", "active").order("name").then(({ data }) => {
      if (data) setCrmUsers(data);
    });
  }, []);

  // Polling incremental: busca apenas mensagens após o último timestamp conhecido
  // Para após 5 polls vazios consecutivos (15s sem novidades); retoma ao enviar mensagem
  const emptyPollCountRef = useRef(0);
  const pollingStoppedRef = useRef(false);

  const resumePolling = useCallback(() => {
    if (!pollingStoppedRef.current) return;
    pollingStoppedRef.current = false;
    emptyPollCountRef.current = 0;
    // Re-trigger the polling effect by clearing and restarting
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(pollFn, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollFn = useCallback(async () => {
    const inst = chatInstanceRef.current;
    const jid = chatRemoteJidRef.current;
    if (!inst || !jid) return;
    try {
      const afterTs = lastTimestampRef.current;
      if (afterTs === 0) return;

      // ── 1) Busca do banco (rápido) ──
      const alt = chatAltJidRef.current ?? undefined;
      const jids = [jid];
      if (alt) jids.push(alt);

      const { data: dbRows } = await supabase
        .from("mensagens_whatsapp")
        .select("*")
        .eq("instance_name", inst)
        .in("remote_jid", jids)
        .gt("message_timestamp", afterTs)
        .order("message_timestamp", { ascending: true })
        .limit(50);

      if (dbRows && dbRows.length > 0) {
        const incoming: ChatMsg[] = dbRows.map((m) => ({
          id: m.external_message_id || m.id,
          content: m.corpo || "",
          type: m.tipo === "audio" ? "audio" : m.tipo === "image" ? "image" : "text",
          direction: m.direcao === "saida" ? "sent" : "received",
          timestamp: m.enviada_em ? safeTime(Math.floor(new Date(m.enviada_em).getTime() / 1000)) : "",
          ts: m.message_timestamp ?? 0,
        }));

        const maxTs = incoming[incoming.length - 1].ts;
        if (maxTs > lastTimestampRef.current) lastTimestampRef.current = maxTs;

        if (emptyPollCountRef.current >= 10 && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = setInterval(pollFn, 3000);
        }
        emptyPollCountRef.current = 0;

        setChatMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = incoming.filter(m => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          const base = prev.filter(m => !m.id.startsWith("temp-"));
          return [...base, ...newMsgs].sort((a, b) => a.ts - b.ts);
        });
        return;
      }

      // ── 2) Fallback: busca da Evolution API ──
      const raw = await evolutionApi.fetchMessagesAfter(inst, jid, afterTs + 1, 50, alt);
      if (raw.length === 0) {
        emptyPollCountRef.current += 1;
        if (emptyPollCountRef.current >= 10 && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = setInterval(pollFn, 10000);
        }
        return;
      }

      if (emptyPollCountRef.current >= 10 && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(pollFn, 3000);
      }
      emptyPollCountRef.current = 0;

      const incoming = processMsgs(raw, true);
      if (incoming.length === 0) return;

      setChatMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = incoming.filter(m => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        const base = prev.filter(m => !m.id.startsWith("temp-"));
        return [...base, ...newMsgs].sort((a, b) => a.ts - b.ts);
      });
    } catch {
      // silencioso
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    emptyPollCountRef.current = 0;
    pollingStoppedRef.current = false;
    pollingRef.current = setInterval(pollFn, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    if (pendingFile) return handleSendMedia();
    if (!chatInput.trim() || !chatInstance || !chatRemoteJid) return;
    resumePolling();
    setSending(true);
    const text = chatInput.trim();
    setChatInput("");
    const nowTs = Math.floor(Date.now() / 1000);
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMsg = { id: tempId, content: text, direction: "sent", timestamp: safeTime(nowTs), type: "text", ts: nowTs };
    setChatMessages((prev) => [...prev, tempMsg]);
    try {
      const phone = chatRemoteJid.split("@")[0];
      const result = await evolutionApi.sendTextMessage(chatInstance, phone, text) as Record<string, unknown>;

      // Persiste no banco
      const sentKey = (result?.key as Record<string, unknown>) ?? {};
      const externalId = (sentKey.id as string) || tempId;
      const now = new Date();
      supabase.from("mensagens_whatsapp").upsert({
        instance_name: chatInstance,
        remote_jid: chatRemoteJid,
        corpo: text,
        tipo: "text",
        direcao: "saida",
        external_message_id: externalId,
        message_timestamp: nowTs,
        enviada_em: now.toISOString(),
      }, { onConflict: "instance_name,external_message_id", ignoreDuplicates: true }).catch(() => {});

      supabase.from("conversas_whatsapp").upsert({
        instance_name: chatInstance,
        remote_jid: chatRemoteJid,
        ultima_mensagem: text,
        ultima_mensagem_em: now.toISOString(),
        status: "answered",
        atualizado_em: now.toISOString(),
      }, { onConflict: "instance_name,remote_jid" }).catch(() => {});

      // Atualiza lastTimestamp para polling pegar mensagens novas após esta
      if (nowTs > lastTimestampRef.current) lastTimestampRef.current = nowTs;

      // Substitui ID temporário pelo real
      setChatMessages((prev) => prev.map(m => m.id === tempId ? { ...m, id: externalId } : m));
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
      setChatInput(text);
    }
    setSending(false);
  };

  const handleClearAIHistory = async () => {
    const phone = chatRemoteJid
      ? chatRemoteJid.split("@")[0]
      : deal.phone ? stripPhone(deal.phone) : null;
    if (!phone) return;
    if (!confirm("Zerar o histórico de memória da IA para este contato? A IA começará a conversa do zero.")) return;
    setClearingHistory(true);
    try {
      let query = supabase.from("ai_conversation_history").delete().eq("phone", phone);
      if (chatInstance) query = query.eq("instance_name", chatInstance);
      await query;
    } catch (e) {
      console.error("Erro ao limpar histórico da IA:", e);
    }
    setClearingHistory(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const preview = file.type.startsWith("image/") ? dataUrl : undefined;
      setPendingFile({ file, base64, preview });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMedia = async () => {
    if (!pendingFile || !chatInstance || !chatRemoteJid) return;
    setSending(true);
    const { file, base64 } = pendingFile;
    const caption = chatInput.trim();
    const phone = chatRemoteJid.split("@")[0];
    const nowTs = Math.floor(Date.now() / 1000);
    const tempMsg: ChatMsg = {
      id: `temp-${Date.now()}`,
      content: caption || `[${file.name}]`,
      direction: "sent",
      timestamp: safeTime(nowTs),
      type: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "text",
      ts: nowTs,
    };
    setChatMessages((prev) => [...prev, tempMsg]);
    setPendingFile(null);
    setChatInput("");
    try {
      if (file.type.startsWith("audio/")) {
        await evolutionApi.sendAudioMessage(chatInstance, phone, base64, file.type);
      } else {
        const mediatype: "image" | "video" | "document" =
          file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
        await evolutionApi.sendMediaMessage(chatInstance, phone, base64, mediatype, file.type, file.name, caption);
      }
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    }
    setSending(false);
  };

  const fileTypeIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith("video/")) return <Video className="w-4 h-4" />;
    if (file.type.startsWith("audio/")) return <Mic className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
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
              <EditableRow label="Usuário responsável" fieldKey="responsibleUser" display={deal.responsibleUser || "—"} rawVal={deal.responsibleUser || ""}
                type="select" options={[{ value: "", label: "Nenhum" }, ...crmUsers.map(u => ({ value: u.name, label: u.name }))]} />
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
                <EditableRow label="Plano" fieldKey="company" display={linkedContact.company || "—"} rawVal={linkedContact.company || ""} />
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
              <button
                onClick={handleClearAIHistory}
                disabled={clearingHistory || (!chatRemoteJid && !deal.phone)}
                className="p-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-40"
                title="Zerar memória da IA"
              >
                <Trash2 className={cn("w-3.5 h-3.5", clearingHistory && "animate-pulse")} />
              </button>
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
                <button onClick={() => findAndLoadChat()} className="text-xs text-primary hover:underline">Tentar novamente</button>
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

          <div className="p-4 border-t border-border shrink-0">
            {/* Preview de arquivo pendente */}
            {pendingFile && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
                {pendingFile.preview ? (
                  <img src={pendingFile.preview} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    {fileTypeIcon(pendingFile.file)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{pendingFile.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(pendingFile.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* Input oculto para arquivos */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!chatInstance || sending}
                className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title="Anexar arquivo"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={pendingFile ? "Adicionar legenda (opcional)..." : chatInstance ? "Escreva uma mensagem..." : "Sem conversa vinculada"}
                  disabled={!chatInstance || sending}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50" />
              </div>
              <button onClick={handleSend} disabled={!chatInstance || sending || (!chatInput.trim() && !pendingFile)}
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
