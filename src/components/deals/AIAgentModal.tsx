import { useState } from "react";
import { defaultAgentConfig, mockRAGBases, KANBAN_STAGES, type AgentConfig } from "@/data/mockData";
import { motion } from "framer-motion";
import { X, Plus, Trash2, GripVertical, Info, ChevronDown, ChevronUp, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/store/pipelineStore";

const tabs = ["IA", "Prompt", "Comportamento", "Perguntas", "Follow-ups", "RAG", "Transições"];

const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const selectCls = inputCls;
const textareaCls = "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y";

const InfoBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3 p-4 rounded-xl bg-accent/30 border border-accent/50">
    <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
    <div className="text-sm text-accent-foreground">{children}</div>
  </div>
);

const TRIGGER_TYPES = [
  { value: "time_after_stage", label: "X tempo após entrar na etapa", icon: Clock },
  { value: "keyword", label: "Palavra-chave recebida", icon: Info },
  { value: "no_response", label: "Sem resposta do lead", icon: Info },
];

const TRANSITION_TRIGGERS = [
  { value: "welcome_sent", label: "Boas-vindas enviada", description: "Mover imediatamente após enviar a mensagem de boas-vindas" },
  { value: "lead_replied", label: "Lead respondeu", description: "Mover quando o lead enviar qualquer mensagem de resposta" },
  { value: "no_response_all_followups", label: "Sem resposta após todos os follow-ups", description: "Mover quando todos os follow-ups agendados forem enviados sem nenhuma resposta do lead" },
  { value: "ai_condition", label: "IA avalia condição", description: "Descreva em linguagem natural quando mover o lead. A IA avalia automaticamente com base na conversa" },
];

const AIAgentModal = ({ stage, onClose, onRemove }: { stage: string; onClose: () => void; onRemove?: () => void }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { stages: pipelineStages } = usePipelineStore();
  const stageNames = pipelineStages.map((s) => s.name);

  const [config, setConfig] = useState<AgentConfig>({
    ...defaultAgentConfig,
    name: "Marco Rebucci",
    instanceName: "Dados",
    active: true,
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [newQuestionDesc, setNewQuestionDesc] = useState("");
  const [expandedFollowUp, setExpandedFollowUp] = useState<string | null>(null);
  const [addingTransition, setAddingTransition] = useState(false);

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setConfig({ ...config, questions: [...config.questions, { text: newQuestion.trim(), description: newQuestionDesc.trim() }] });
    setNewQuestion("");
    setNewQuestionDesc("");
  };

  const removeQuestion = (i: number) => {
    setConfig({ ...config, questions: config.questions.filter((_, idx) => idx !== i) });
  };

  const addFollowUp = () => {
    const id = `fu-${Date.now()}`;
    setConfig({ ...config, followUps: [...config.followUps, { id, name: `Follow-up ${config.followUps.length + 1}`, triggers: [], contents: [], allowResubscribe: false }] });
    setExpandedFollowUp(id);
  };

  const removeFollowUp = (id: string) => {
    setConfig({ ...config, followUps: config.followUps.filter((f) => f.id !== id) });
    if (expandedFollowUp === id) setExpandedFollowUp(null);
  };

  const addTriggerToFollowUp = (fuId: string) => {
    setConfig({
      ...config,
      followUps: config.followUps.map((fu) =>
        fu.id === fuId
          ? { ...fu, triggers: [...fu.triggers, { id: `ft-${Date.now()}`, type: "time_after_stage", timeValue: 24, timeUnit: "hours" as const }] }
          : fu
      ),
    });
  };

  const removeTriggerFromFollowUp = (fuId: string, triggerId: string) => {
    setConfig({
      ...config,
      followUps: config.followUps.map((fu) =>
        fu.id === fuId ? { ...fu, triggers: fu.triggers.filter((t) => t.id !== triggerId) } : fu
      ),
    });
  };

  const updateFollowUpTrigger = (fuId: string, triggerId: string, updates: Partial<{ type: string; timeValue: number; timeUnit: "minutes" | "hours" | "days" }>) => {
    setConfig({
      ...config,
      followUps: config.followUps.map((fu) =>
        fu.id === fuId
          ? { ...fu, triggers: fu.triggers.map((t) => (t.id === triggerId ? { ...t, ...updates } : t)) }
          : fu
      ),
    });
  };

  const toggleFollowUpResubscribe = (fuId: string) => {
    setConfig({
      ...config,
      followUps: config.followUps.map((fu) =>
        fu.id === fuId ? { ...fu, allowResubscribe: !fu.allowResubscribe } : fu
      ),
    });
  };

  const addTransition = (trigger: string) => {
    const id = `tr-${Date.now()}`;
    setConfig({ ...config, transitions: [...config.transitions, { id, trigger, destination: "" }] });
    setAddingTransition(false);
  };

  const updateTransitionDestination = (id: string, destination: string) => {
    setConfig({ ...config, transitions: config.transitions.map((t) => (t.id === id ? { ...t, destination } : t)) });
  };

  const removeTransition = (id: string) => {
    setConfig({ ...config, transitions: config.transitions.filter((t) => t.id !== id) });
  };

  const tabProgress = ((activeTab + 1) / tabs.length) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="surface-elevated w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-foreground">IA: {stage}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="shrink-0">
          <div className="flex overflow-x-auto px-5 pt-3 gap-1">
            {tabs.map((t, i) => (
              <button key={t} onClick={() => setActiveTab(i)} className={cn("text-xs px-3 py-2 whitespace-nowrap transition-colors border-b-2", activeTab === i ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
                {t}
              </button>
            ))}
          </div>
          <div className="h-1 bg-muted mx-5 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${tabProgress}%` }} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 0: IA */}
          {activeTab === 0 && (
            <>
              <InfoBanner>
                <p className="font-medium">Modelo padrão: GPT-4o mini</p>
                <p className="text-xs mt-1">O token de IA é configurado em <strong>Configurações → Tokens</strong></p>
              </InfoBanner>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome da IA</label>
                <input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Provedor</label>
                <select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })} className={selectCls}>
                  <option value="EvolutionAPI">Evolution API</option>
                  <option value="MetaAPI">Meta API</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Instância conectada</label>
                <select value={config.instanceName} onChange={(e) => setConfig({ ...config, instanceName: e.target.value })} className={selectCls}>
                  <option value="">Selecionar instância...</option>
                  <option value="Dados">Dados</option>
                  <option value="Vendas Principal">Vendas Principal</option>
                  <option value="Suporte">Suporte</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Instância da {config.provider === "MetaAPI" ? "Meta" : "Evolution"} API conectada</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={config.active} onChange={() => setConfig({ ...config, active: !config.active })} className="w-4 h-4 rounded accent-primary" />
                <label className="text-sm font-medium text-foreground">Ativo</label>
              </div>
            </>
          )}

          {/* TAB 1: Prompt */}
          {activeTab === 1 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">System Prompt</label>
                <textarea value={config.systemPrompt} onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })} rows={5} className={textareaCls} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Complemento automático</label>
                <p className="text-xs text-muted-foreground mb-2">Adicionado automaticamente ao final do system prompt a cada mensagem. Por padrão contém as regras de formatação do WhatsApp (multi-mensagem, sem markdown, etc). Edite livremente.</p>
                <textarea value={config.promptComplement} onChange={(e) => setConfig({ ...config, promptComplement: e.target.value })} rows={6} className={cn(textareaCls, "font-mono text-xs")} />
                <button className="text-xs text-primary hover:underline mt-1">Restaurar padrão</button>
              </div>
              {/* Welcome message */}
              <div className="p-4 rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Mensagem de Boas-vindas</span>
                  <button onClick={() => setConfig({ ...config, welcomeMessageEnabled: !config.welcomeMessageEnabled })} className={cn("w-11 h-6 rounded-full transition-colors relative", config.welcomeMessageEnabled ? "bg-primary" : "bg-muted")}>
                    <div className={cn("w-5 h-5 bg-foreground rounded-full absolute top-0.5 transition-transform", config.welcomeMessageEnabled ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Use variáveis: <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{"{{name}}"}</code> <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{"{{first_name}}"}</code> <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{"{{phone}}"}</code></p>
                {config.welcomeMessageEnabled && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Tipo</label>
                      <div className="flex gap-2">
                        {([
                          { value: "text", label: "Texto", icon: "📝" },
                          { value: "image", label: "Imagem", icon: "🖼️" },
                          { value: "audio", label: "Áudio", icon: "🎵" },
                          { value: "video", label: "Vídeo", icon: "🎬" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setConfig({ ...config, welcomeMessageType: opt.value })}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                              config.welcomeMessageType === opt.value
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span>{opt.icon}</span> {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{config.welcomeMessageType === "text" ? "Texto" : "URL do arquivo"}</label>
                      <textarea value={config.welcomeMessageContent} onChange={(e) => setConfig({ ...config, welcomeMessageContent: e.target.value })} rows={3} className={textareaCls} placeholder={config.welcomeMessageType === "text" ? "Olá {{first_name}}! 👋" : "https://..."} />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* TAB 2: Comportamento */}
          {activeTab === 2 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Quando iniciar conversa</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="convStart" checked={config.conversationStart === "on_create"} onChange={() => setConfig({ ...config, conversationStart: "on_create" })} className="accent-primary" />
                    <span className="text-sm text-foreground">Ao criar o registro (envia boas-vindas imediatamente)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="convStart" checked={config.conversationStart === "wait_first_message"} onChange={() => setConfig({ ...config, conversationStart: "wait_first_message" })} className="accent-primary" />
                    <span className="text-sm text-foreground">Aguardar 1ª mensagem do contato</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Delay de agrupamento: {config.groupingDelay}s</label>
                <p className="text-xs text-muted-foreground mb-2">Aguarda esse tempo para agrupar mensagens antes de responder</p>
                <input type="range" min={0} max={60} step={0.5} value={config.groupingDelay} onChange={(e) => setConfig({ ...config, groupingDelay: parseFloat(e.target.value) })} className="w-full accent-primary" />
                <p className="text-xs text-muted-foreground mt-1">0s a 60s</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Delay de resposta: {config.responseDelay}s</label>
                <p className="text-xs text-muted-foreground mb-2">Simula tempo de digitação antes de enviar a resposta (máx 60s)</p>
                <input type="range" min={0} max={60} step={0.5} value={config.responseDelay} onChange={(e) => setConfig({ ...config, responseDelay: parseFloat(e.target.value) })} className="w-full accent-primary" />
                <p className="text-xs text-muted-foreground mt-1">0s a 60s</p>
              </div>
            </>
          )}

          {/* TAB 3: Perguntas */}
          {activeTab === 3 && (
            <>
              <InfoBanner>
                <p className="font-medium">Avaliação Automática Ativada</p>
                <p className="text-xs mt-1">A IA avaliará cada mensagem e marcará perguntas como concluídas automaticamente</p>
              </InfoBanner>
              <div className="space-y-2">
                {config.questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
                    <input type="checkbox" className="w-4 h-4 rounded accent-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{q.text}</p>
                      {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    <button onClick={() => removeQuestion(i)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Pergunta</label>
                  <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Digite uma nova pergunta..." className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Descrição (opcional)</label>
                  <input value={newQuestionDesc} onChange={(e) => setNewQuestionDesc(e.target.value)} placeholder="Ex: Ajuda a IA a entender melhor..." className={inputCls} onKeyDown={(e) => e.key === "Enter" && addQuestion()} />
                </div>
                <button onClick={addQuestion} className="text-sm text-primary hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar</button>
              </div>
            </>
          )}

          {/* TAB 4: Follow-ups */}
          {activeTab === 4 && (
            <>
              <InfoBanner>
                <p className="font-medium">Follow-ups com Gatilhos Avançados</p>
                <p className="text-xs mt-1">Configure acionadores por tempo, mensagem ou palavras-chave com suporte a reinscrição</p>
              </InfoBanner>
              <div className="space-y-3">
                {config.followUps.map((fu) => {
                  const isExpanded = expandedFollowUp === fu.id;
                  return (
                    <div key={fu.id} className="rounded-xl border border-border overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-secondary">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{fu.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{fu.triggers.length} gatilho(s) • {fu.contents.length} conteúdo(s)</span>
                        </div>
                        <button onClick={() => setExpandedFollowUp(isExpanded ? null : fu.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => removeFollowUp(fu.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-card">
                          {/* Gatilhos */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-foreground">Gatilhos</h4>
                              <button onClick={() => addTriggerToFollowUp(fu.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Adicionar Gatilho
                              </button>
                            </div>
                            {fu.triggers.map((trigger) => (
                              <div key={trigger.id} className="p-4 rounded-xl border border-border space-y-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={trigger.type}
                                    onChange={(e) => updateFollowUpTrigger(fu.id, trigger.id, { type: e.target.value })}
                                    className={selectCls}
                                  >
                                    {TRIGGER_TYPES.map((tt) => (
                                      <option key={tt.value} value={tt.value}>{tt.label}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => removeTriggerFromFollowUp(fu.id, trigger.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                {trigger.type === "time_after_stage" && (
                                  <>
                                    <label className="text-xs text-muted-foreground block">Tempo após entrar na etapa</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        value={trigger.timeValue}
                                        onChange={(e) => updateFollowUpTrigger(fu.id, trigger.id, { timeValue: parseInt(e.target.value) || 0 })}
                                        className={cn(inputCls, "flex-1")}
                                      />
                                      <select
                                        value={trigger.timeUnit}
                                        onChange={(e) => updateFollowUpTrigger(fu.id, trigger.id, { timeUnit: e.target.value as "minutes" | "hours" | "days" })}
                                        className={cn(selectCls, "w-32")}
                                      >
                                        <option value="minutes">Minutos</option>
                                        <option value="hours">Horas</option>
                                        <option value="days">Dias</option>
                                      </select>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                            {fu.triggers.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">Nenhum gatilho configurado</p>
                            )}
                          </div>

                          {/* Reinscrição */}
                          <div className="border-t border-border pt-3">
                            <h4 className="text-sm font-semibold text-foreground mb-2">Reinscrição</h4>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={fu.allowResubscribe} onChange={() => toggleFollowUpResubscribe(fu.id)} className="w-4 h-4 rounded accent-primary" />
                              <span className="text-sm text-foreground">Permitir reinscrição (pode ser reenviado)</span>
                            </label>
                          </div>

                          {/* Adicionar Conteúdo */}
                          <button className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Adicionar Conteúdo
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={addFollowUp} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar Follow-up
              </button>
            </>
          )}

          {/* TAB 5: RAG */}
          {activeTab === 5 && (
            <>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/30 border border-accent/50">
                <input type="checkbox" checked={config.ragEnabled} onChange={() => setConfig({ ...config, ragEnabled: !config.ragEnabled })} className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm font-medium text-primary">Habilitar base de conhecimento RAG</span>
              </div>
              {config.ragEnabled && (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Base de Conhecimento RAG</label>
                    <select value={config.ragBaseId || ""} onChange={(e) => setConfig({ ...config, ragBaseId: e.target.value || null })} className={selectCls}>
                      <option value="">Selecionar base...</option>
                      {mockRAGBases.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.documentCount} chunks)</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Selecione a instância com dados RAG já processados</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Máximo de Turnos</label>
                    <input type="number" value={config.ragMaxTurns} onChange={(e) => setConfig({ ...config, ragMaxTurns: parseInt(e.target.value) || 0 })} className={inputCls} />
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB 6: Transições */}
          {activeTab === 6 && (
            <>
              <p className="text-sm text-muted-foreground">Configure quando o lead deve ser movido automaticamente para outra etapa. Cada regra define um gatilho e a etapa de destino.</p>
              <div className="space-y-2">
                {config.transitions.map((tr) => (
                  <div key={tr.id} className="rounded-xl bg-secondary border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">{tr.trigger || "Gatilho"}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <select
                        value={tr.destination}
                        onChange={(e) => updateTransitionDestination(tr.id, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">— Selecione a etapa destino —</option>
                        {stageNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button onClick={() => removeTransition(tr.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add transition */}
              {!addingTransition ? (
                <button onClick={() => setAddingTransition(true)} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Adicionar transição
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Quando mover</h4>
                  {TRANSITION_TRIGGERS.map((tt) => (
                    <button
                      key={tt.value}
                      onClick={() => addTransition(tt.label)}
                      className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">{tt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tt.description}</p>
                    </button>
                  ))}
                  <button onClick={() => setAddingTransition(false)} className="text-xs text-muted-foreground hover:underline mt-2">Cancelar</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border space-y-3 shrink-0">
          <button onClick={onRemove} className="w-full py-2.5 rounded-xl border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">Remover IA desta etapa</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Salvar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AIAgentModal;
