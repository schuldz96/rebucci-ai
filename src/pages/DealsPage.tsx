import { useState } from "react";
import { useDealStore } from "@/store/dealStore";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Bot, Search, Filter, BarChart3, ArrowDownUp, ChevronDown, Star, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import AIAgentModal from "@/components/deals/AIAgentModal";

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

const DealsPage = () => {
  const { deals, stages, moveDeal, addDeal } = useDealStore();
  const [aiModalStage, setAiModalStage] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDeal, setNewDeal] = useState<{ title: string; contactName: string; value: number; priority: "low" | "medium" | "high"; stage: string }>({ title: "", contactName: "", value: 0, priority: "medium", stage: "" });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    moveDeal(result.draggableId, result.destination.droppableId);
  };

  const handleCreateDeal = () => {
    if (!newDeal.title || !newDeal.stage) return;
    addDeal(newDeal);
    setNewDeal({ title: "", contactName: "", value: 0, priority: "medium", stage: "" });
    setShowNewDeal(false);
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
          <button onClick={() => setShowNewDeal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
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
                    {/* Agent badge */}
                    <div className="px-3 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary border border-border text-[10px] font-medium text-foreground">
                        <Bot className="w-3 h-3" />
                        {agentName}
                      </div>
                      <button onClick={() => setAiModalStage(stage)} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Configurar IA">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Stage header */}
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
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={cn("p-3 rounded-xl border border-border bg-card transition-shadow cursor-pointer hover:border-primary/30", snap.isDragging && "shadow-lg")}>
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-primary truncate">{deal.title}</p>
                                <Star className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Tel: {deal.contactName}</p>
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
                      <button onClick={() => { setNewDeal({ ...newDeal, stage }); setShowNewDeal(true); }} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 border border-dashed border-border rounded-xl hover:border-primary/30">
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
        {showNewDeal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="surface-elevated p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Criar registro</h3>
                <button onClick={() => setShowNewDeal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} placeholder="Título" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <input value={newDeal.contactName} onChange={(e) => setNewDeal({ ...newDeal, contactName: e.target.value })} placeholder="Nome do contato" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <input type="number" value={newDeal.value || ""} onChange={(e) => setNewDeal({ ...newDeal, value: Number(e.target.value) })} placeholder="Valor (R$)" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <select value={newDeal.priority} onChange={(e) => setNewDeal({ ...newDeal, priority: e.target.value as "low" | "medium" | "high" })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
                <select value={newDeal.stage} onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
                  <option value="">Selecione a etapa</option>
                  {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={handleCreateDeal} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Criar registro</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealsPage;
