import { useState } from "react";
import { defaultAgentConfig, mockRAGBases, mockInstances, type AgentConfig } from "@/data/mockData";
import { motion } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["Agente", "Prompt", "Comportamento", "Perguntas", "RAG"];

const AIAgentModal = ({ stage, onClose }: { stage: string; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<AgentConfig>({ ...defaultAgentConfig, name: `Agente - ${stage}` });
  const [newQuestion, setNewQuestion] = useState("");

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setConfig({ ...config, questions: [...config.questions, newQuestion.trim()] });
    setNewQuestion("");
  };

  const removeQuestion = (i: number) => {
    setConfig({ ...config, questions: config.questions.filter((_, idx) => idx !== i) });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="surface-elevated w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-foreground">⚙️ Configurar IA</h3>
            <p className="text-sm text-muted-foreground">Etapa: {stage}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 shrink-0">
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)} className={cn("text-xs px-3 py-1.5 rounded-lg transition-colors", activeTab === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 0 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do agente</label>
                <input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Provedor</label>
                <select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
                  <option value="EvolutionAPI">EvolutionAPI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Instância</label>
                <select value={config.instanceName} onChange={(e) => setConfig({ ...config, instanceName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
                  <option value="">Selecionar...</option>
                  {mockInstances.map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">Status</label>
                <button onClick={() => setConfig({ ...config, active: !config.active })} className={cn("w-12 h-6 rounded-full transition-colors relative", config.active ? "bg-success" : "bg-muted")}>
                  <div className={cn("w-5 h-5 bg-foreground rounded-full absolute top-0.5 transition-transform", config.active ? "translate-x-6" : "translate-x-0.5")} />
                </button>
                <span className="text-sm text-muted-foreground">{config.active ? "Ativo" : "Inativo"}</span>
              </div>
            </>
          )}

          {activeTab === 1 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">System Prompt</label>
                <textarea value={config.systemPrompt} onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })} rows={8} placeholder="Descreva o comportamento do agente..." className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Complemento de Prompt</label>
                <textarea value={config.promptComplement} onChange={(e) => setConfig({ ...config, promptComplement: e.target.value })} rows={4} placeholder="Instruções adicionais..." className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
            </>
          )}

          {activeTab === 2 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Delay de agrupamento: {config.groupingDelay}s</label>
                <p className="text-xs text-muted-foreground mb-2">Aguarda mensagens antes de responder</p>
                <input type="range" min={1} max={30} step={0.5} value={config.groupingDelay} onChange={(e) => setConfig({ ...config, groupingDelay: parseFloat(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Delay de resposta: {config.responseDelay}s</label>
                <p className="text-xs text-muted-foreground mb-2">Simula digitação (máx 60s)</p>
                <input type="range" min={1} max={60} step={0.5} value={config.responseDelay} onChange={(e) => setConfig({ ...config, responseDelay: parseFloat(e.target.value) })} className="w-full accent-primary" />
              </div>
            </>
          )}

          {activeTab === 3 && (
            <>
              <div className="flex gap-2">
                <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuestion()} placeholder="Adicionar pergunta..." className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <button onClick={addQuestion} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {config.questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta adicionada</p>}
                {config.questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border">
                    <span className="flex-1 text-sm text-foreground">{q}</span>
                    <button onClick={() => removeQuestion(i)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 4 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Base RAG</label>
                <select value={config.ragBaseId || ""} onChange={(e) => setConfig({ ...config, ragBaseId: e.target.value || null })} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
                  <option value="">Selecionar base...</option>
                  {mockRAGBases.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.documentCount} docs)</option>)}
                </select>
              </div>
              <button className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Criar nova base
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Salvar</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AIAgentModal;
