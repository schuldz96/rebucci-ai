import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDealStore } from "@/store/dealStore";
import { useContactStore } from "@/store/contactStore";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Bot, Search, Filter, BarChart3, ArrowDownUp, ChevronDown, Star, Minus, User } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import AIAgentModal from "@/components/deals/AIAgentModal";
import DealDetailPanel from "@/components/deals/DealDetailPanel";
import { type Deal, type Contact } from "@/data/mockData";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const stageColors: Record<string, string> = {
  "Novo Lead": "bg-blue-500",
  "Tentativa de Contato": "bg-purple-500",
  "Conectado": "bg-emerald-500",
  "Qualificado": "bg-green-500",
  "Reunião Agendada": "bg-cyan-500",
  "No-Show": "bg-yellow-500",
  "Fechado": "bg-pink-500",
};

const agentNames: Record<string, string> = {
  "Novo Lead": "Marco Rebucci",
  "Tentativa de Contato": "Marco Rebucci",
  "Conectado": "Marco Rebucci",
  "Qualificado": "Agente",
  "Reunião Agendada": "Agente",
  "No-Show": "Agente",
  "Fechado": "Agente",
};

interface NewDealForm {
  title: string;
  contactName: string;
  contactId: string | undefined;
  phone: string;
  value: number;
  priority: "low" | "medium" | "high";
  stage: string;
}

const emptyForm: NewDealForm = {
  title: "",
  contactName: "",
  contactId: undefined,
  phone: "",
  value: 0,
  priority: "medium",
  stage: "",
};

const DealsPage = () => {
  const { deals, stages, moveDeal, addDeal, updateDeal, loadDeals } = useDealStore();
  const { contacts, loadContacts } = useContactStore();
  const navigate = useNavigate();
  const { dealId } = useParams<{ dealId: string }>();
  const [aiModalStage, setAiModalStage] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedDeal = dealId ? (deals.find((d) => d.id === dealId) ?? null) : null;
  const [newDeal, setNewDeal] = useState<NewDealForm>(emptyForm);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDeals();
    loadContacts();
  }, [loadDeals, loadContacts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) {
        setShowContactDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredContacts = contacts.filter((c) =>
    contactSearch
      ? c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.phone.includes(contactSearch)
      : true
  );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    moveDeal(result.draggableId, result.destination.droppableId);
  };

  const handleSelectContact = (contact: Contact) => {
    setNewDeal((prev) => ({
      ...prev,
      contactName: contact.name,
      contactId: contact.id,
      phone: contact.phone,
    }));
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const handleClearContact = () => {
    setNewDeal((prev) => ({ ...prev, contactName: "", contactId: undefined, phone: "" }));
    setContactSearch("");
  };

  const handleCreateDeal = async () => {
    setSaveError("");
    if (!newDeal.title) { setSaveError("Título é obrigatório"); return; }
    if (!newDeal.stage) { setSaveError("Selecione a etapa"); return; }
    if (!newDeal.contactName) { setSaveError("Nome do contato é obrigatório"); return; }
    setSaving(true);
    try {
      await addDeal({
        title: newDeal.title,
        contactName: newDeal.contactName,
        value: newDeal.value,
        priority: newDeal.priority,
        stage: newDeal.stage,
        contactId: newDeal.contactId,
        phone: newDeal.phone || undefined,
      });
      setNewDeal(emptyForm);
      setContactSearch("");
      setShowNewDeal(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar negócio");
    } finally {
      setSaving(false);
    }
  };

  const openNewDeal = (stage = "") => {
    setNewDeal({ ...emptyForm, stage });
    setContactSearch("");
    setSaveError("");
    setShowNewDeal(true);
  };

  return (
    <div className="p-6 lg:p-8 space-y-4 h-screen flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground cursor-pointer">
              <Bot className="w-4 h-4" />
              <span>Pipeline IA</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground">
              <span>Todos os registros</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-xs font-semibold">{deals.length}</span>
            </div>
          </div>
          <button onClick={() => openNewDeal()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Criar registro
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquisar por título, telefone..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground cursor-pointer">
            <span>Atendimento IA</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"><Filter className="w-4 h-4" /> Filtros</button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"><ArrowDownUp className="w-4 h-4" /> Classificar</button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"><BarChart3 className="w-4 h-4" /> Métrica</button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const q = searchQuery.toLowerCase();
            const stageDeals = deals.filter((d) => d.stage === stage && (!q || d.title.toLowerCase().includes(q) || d.contactName.toLowerCase().includes(q)));
            const agentName = agentNames[stage] || "Agente";
            const colorBar = stageColors[stage] || "bg-primary";
            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={cn("w-[260px] shrink-0 rounded-2xl border border-border flex flex-col transition-colors", snapshot.isDraggingOver ? "bg-secondary/80" : "bg-card/50")}>
                    <div className="px-3 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary border border-border text-[10px] font-medium text-foreground">
                        <Bot className="w-3 h-3" />
                        {agentName}
                      </div>
                      <button onClick={() => setAiModalStage(stage)} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Configurar IA">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="px-3 pt-2 pb-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">{stage}</p>
                        <span className="text-[10px] text-muted-foreground">{stageDeals.length}</span>
                      </div>
                      <div className={cn("h-1 rounded-full", colorBar)} />
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                      {stageDeals.map((deal, idx) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} onClick={() => navigate(`/deals/${deal.id}`)} className={cn("p-3 rounded-xl border border-border bg-card transition-shadow cursor-pointer hover:border-primary/30", snap.isDragging && "shadow-lg")}>
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-primary truncate">{deal.title}</p>
                                <Star className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{deal.phone ? `Tel: ${formatPhone(deal.phone)}` : deal.contactName}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", priorityColors[deal.priority])}>
                                  {deal.priority === "high" ? "Alta" : deal.priority === "medium" ? "Média" : "Baixa"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                                <Minus className="w-3 h-3" />
                                <span className="text-[10px]">24/03/2026</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <button onClick={() => openNewDeal(stage)} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 border border-dashed border-border rounded-xl hover:border-primary/30">
                        <Plus className="w-3 h-3" /> Adicionar registro
                      </button>
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <AnimatePresence>
        {aiModalStage && <AIAgentModal stage={aiModalStage} onClose={() => setAiModalStage(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDeal && (
          <DealDetailPanel
            deal={selectedDeal}
            onClose={() => navigate("/deals")}
            onLinkContact={(id, contactId) => {
              updateDeal(id, { contactId });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewDeal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="surface-elevated p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Criar registro</h3>
                <button onClick={() => setShowNewDeal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {/* Título */}
                <input
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  placeholder="Título"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />

                {/* Vincular contato existente */}
                <div ref={contactRef} className="relative">
                  <label className="block text-xs text-muted-foreground mb-1.5">Vincular contato existente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value);
                        setShowContactDropdown(true);
                        if (!e.target.value) handleClearContact();
                      }}
                      onFocus={() => setShowContactDropdown(true)}
                      placeholder="Buscar por nome ou telefone..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {newDeal.contactId && (
                      <button
                        onClick={handleClearContact}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showContactDropdown && filteredContacts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-44 overflow-y-auto">
                      {filteredContacts.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={() => handleSelectContact(c)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-semibold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{c.company} · {c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {newDeal.contactId && (
                    <p className="mt-1 text-[11px] text-success">✓ Contato vinculado</p>
                  )}
                </div>

                {/* Nome do contato (editável se sem vínculo) */}
                <input
                  value={newDeal.contactName}
                  onChange={(e) => setNewDeal({ ...newDeal, contactName: e.target.value })}
                  placeholder="Nome do contato"
                  readOnly={!!newDeal.contactId}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
                    newDeal.contactId && "opacity-60 cursor-default"
                  )}
                />

                <input
                  type="number"
                  value={newDeal.value || ""}
                  onChange={(e) => setNewDeal({ ...newDeal, value: Number(e.target.value) })}
                  placeholder="Valor (R$)"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <select
                  value={newDeal.priority}
                  onChange={(e) => setNewDeal({ ...newDeal, priority: e.target.value as "low" | "medium" | "high" })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
                <select
                  value={newDeal.stage}
                  onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground"
                >
                  <option value="">Selecione a etapa</option>
                  {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                <button
                  onClick={handleCreateDeal}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Criar registro"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealsPage;
