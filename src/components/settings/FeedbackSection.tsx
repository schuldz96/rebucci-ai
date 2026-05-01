import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  GripVertical, Plus, Trash2, Save, RotateCcw, Loader2,
  ToggleLeft, ToggleRight, ChevronDown, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { DEFAULT_FEEDBACK_QUESTIONS, FeedbackQuestion } from "@/lib/feedbackQuestions";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface LocalQuestion extends FeedbackQuestion {
  dbId?: string;     // id no banco (undefined = nova, ainda não salva)
  dirty?: boolean;   // foi editada localmente
  deleted?: boolean; // marcada para exclusão
}

const TYPE_LABELS: Record<string, string> = {
  rating: "Avaliação (estrelas)",
  text:   "Texto livre",
  number: "Número",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

// ─── Linha de pergunta ────────────────────────────────────────────────────────

const QuestionRow = ({
  q, index, onChange, onDelete,
}: {
  q: LocalQuestion;
  index: number;
  onChange: (updated: LocalQuestion) => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Draggable draggableId={q.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "border border-border rounded-xl overflow-hidden transition-shadow",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/30",
            !q.active && "opacity-50"
          )}
        >
          {/* Linha principal */}
          <div className="flex items-center gap-3 px-3 py-3 bg-card">
            {/* Handle drag */}
            <div
              {...provided.dragHandleProps}
              className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", !q.active && "line-through text-muted-foreground")}>
                {q.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {TYPE_LABELS[q.type]}
                {q.type === "number" && q.unit ? ` · ${q.unit}` : ""}
                {q.has_motivo ? " · com motivo" : ""}
                {!q.required ? " · opcional" : ""}
              </p>
            </div>

            {/* Toggle ativo */}
            <button
              onClick={() => onChange({ ...q, active: !q.active })}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title={q.active ? "Desativar" : "Ativar"}
            >
              {q.active
                ? <ToggleRight className="w-5 h-5 text-primary" />
                : <ToggleLeft className="w-5 h-5" />}
            </button>

            {/* Expandir */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
            </button>

            {/* Excluir */}
            <button
              onClick={onDelete}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              title="Remover pergunta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Painel expandido */}
          {expanded && (
            <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Pergunta / rótulo</label>
                <Input
                  value={q.label}
                  onChange={(e) => onChange({ ...q, label: e.target.value })}
                  placeholder="Ex: Como foi sua semana?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de resposta</label>
                  <select
                    value={q.type}
                    onChange={(e) => onChange({ ...q, type: e.target.value as FeedbackQuestion["type"] })}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    {TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {q.type === "number" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Unidade (ex: Kg, cm)</label>
                    <Input
                      value={q.unit ?? ""}
                      onChange={(e) => onChange({ ...q, unit: e.target.value || undefined })}
                      placeholder="Kg"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={q.has_motivo}
                    onChange={(e) => onChange({ ...q, has_motivo: e.target.checked })}
                    className="rounded"
                    disabled={q.type !== "rating"}
                  />
                  Solicitar motivo (campo de texto após a nota)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => onChange({ ...q, required: e.target.checked })}
                    className="rounded"
                  />
                  Obrigatório
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

// ─── FeedbackSection ──────────────────────────────────────────────────────────

const FeedbackSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [coachId]);

  const loadQuestions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feedback_question_configs")
      .select("*")
      .eq("coach_id", coachId)
      .order("order_index");

    if (!data || data.length === 0) {
      // Nenhuma configuração salva — exibe as padrão como ponto de partida
      setQuestions(DEFAULT_FEEDBACK_QUESTIONS.map(q => ({ ...q, dbId: undefined, dirty: false })));
    } else {
      setQuestions(data.map((row: any) => ({
        id: row.id,
        dbId: row.id,
        label: row.label,
        type: row.type,
        unit: row.unit ?? undefined,
        has_motivo: row.has_motivo,
        required: row.required,
        active: row.active,
        order_index: row.order_index,
        dirty: false,
      })));
    }
    setLoading(false);
    setHasChanges(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(questions);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setQuestions(items.map((q, i) => ({ ...q, order_index: i, dirty: true })));
    setHasChanges(true);
  };

  const updateQuestion = (index: number, updated: LocalQuestion) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...updated, dirty: true } : q));
    setHasChanges(true);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const addQuestion = () => {
    const newQ: LocalQuestion = {
      id: `new_${Date.now()}`,
      dbId: undefined,
      label: "Nova pergunta",
      type: "rating",
      has_motivo: false,
      required: true,
      active: true,
      order_index: questions.length,
      dirty: true,
    };
    setQuestions(prev => [...prev, newQ]);
    setHasChanges(true);
  };

  const resetToDefault = async () => {
    // Apaga configurações salvas e volta ao padrão
    await supabase.from("feedback_question_configs").delete().eq("coach_id", coachId);
    setQuestions(DEFAULT_FEEDBACK_QUESTIONS.map(q => ({ ...q, dbId: undefined, dirty: false })));
    setHasChanges(false);
    toast({ title: "Perguntas restauradas para o padrão" });
  };

  const save = async () => {
    setSaving(true);

    // Apaga tudo do coach e reinsere na ordem atual
    await supabase.from("feedback_question_configs").delete().eq("coach_id", coachId);

    const rows = questions.map((q, i) => ({
      coach_id: coachId,
      order_index: i,
      label: q.label,
      type: q.type,
      unit: q.unit ?? null,
      has_motivo: q.has_motivo,
      required: q.required,
      active: q.active,
    }));

    const { error } = await supabase.from("feedback_question_configs").insert(rows);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perguntas salvas com sucesso!" });
      await loadQuestions();
    }

    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Perguntas do Feedback</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize quais perguntas aparecem no formulário enviado ao aluno. Arraste para reordenar.
        </p>
      </div>

      {/* Preview count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
        <Check className="w-3.5 h-3.5 text-primary" />
        {questions.filter(q => q.active).length} pergunta{questions.filter(q => q.active).length !== 1 ? "s" : ""} ativa{questions.filter(q => q.active).length !== 1 ? "s" : ""}
        · {questions.filter(q => q.active && q.has_motivo).length} com campo de motivo
      </div>

      {/* Lista drag-and-drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="feedback-questions">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {questions.map((q, index) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  index={index}
                  onChange={(updated) => updateQuestion(index, updated)}
                  onDelete={() => deleteQuestion(index)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Adicionar pergunta */}
      <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addQuestion}>
        <Plus className="w-4 h-4" />
        Adicionar pergunta
      </Button>

      {/* Ações */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={resetToDefault}
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar padrão
        </Button>
        <Button
          size="sm"
          className="gap-2"
          onClick={save}
          disabled={!hasChanges || saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar configuração
        </Button>
      </div>
    </div>
  );
};

export default FeedbackSection;
