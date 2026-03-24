import { useState } from "react";
import { useDealStore } from "@/store/dealStore";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import AIAgentModal from "@/components/deals/AIAgentModal";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive",
  medium: "bg-warning/20 text-warning",
  low: "bg-muted text-muted-foreground",
};

const DealsPage = () => {
  const { deals, stages, moveDeal, addDeal } = useDealStore();
  const [aiModalStage, setAiModalStage] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: "", contactName: "", value: 0, priority: "medium" as const, stage: "" });

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

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-6 lg:p-8 space-y-6 h-screen flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Negócios</h1>
          <p className="text-muted-foreground mt-1">Pipeline de vendas inteligente</p>
        </div>
        <button
          onClick={() => setShowNewDeal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo Negócio
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const total = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "w-[260px] shrink-0 rounded-2xl border border-border flex flex-col transition-colors",
                      snapshot.isDraggingOver ? "bg-secondary/80" : "bg-card/50"
                    )}
                  >
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{stage}</p>
                        <p className="text-[10px] text-muted-foreground">{stageDeals.length} • {formatCurrency(total)}</p>
                      </div>
                      <button
                        onClick={() => setAiModalStage(stage)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        title="Configurar IA"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                      {stageDeals.map((deal, idx) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={cn(
                                "p-3 rounded-xl border border-border bg-card transition-shadow",
                                snap.isDragging && "shadow-lg"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div {...prov.dragHandleProps} className="mt-0.5">
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{deal.title}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{deal.contactName}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs font-semibold text-foreground">{formatCurrency(deal.value)}</span>
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", priorityColors[deal.priority])}>
                                      {deal.priority === "high" ? "Alta" : deal.priority === "medium" ? "Média" : "Baixa"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* AI Modal */}
      <AnimatePresence>
        {aiModalStage && (
          <AIAgentModal stage={aiModalStage} onClose={() => setAiModalStage(null)} />
        )}
      </AnimatePresence>

      {/* New Deal Modal */}
      <AnimatePresence>
        {showNewDeal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="surface-elevated p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Novo Negócio</h3>
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
                <button onClick={handleCreateDeal} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Criar Negócio</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealsPage;
