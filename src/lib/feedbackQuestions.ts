// Perguntas padrão usadas como fallback quando o coach não configurou as suas
export interface FeedbackQuestion {
  id: string;           // chave usada no objeto answers
  label: string;
  type: "rating" | "text" | "number";
  unit?: string;
  has_motivo: boolean;
  required: boolean;
  active: boolean;
  order_index: number;
}

export const DEFAULT_FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  { id: "weight_kg",          label: "Peso desta semana",          type: "number", unit: "Kg", has_motivo: false, required: false, active: true, order_index: 0 },
  { id: "plano_alimentar",    label: "Plano alimentar",            type: "rating", has_motivo: true,  required: true,  active: true, order_index: 1 },
  { id: "hidratacao",         label: "Hidratação",                 type: "rating", has_motivo: true,  required: true,  active: true, order_index: 2 },
  { id: "plano_treino",       label: "Plano de treino",            type: "rating", has_motivo: true,  required: true,  active: true, order_index: 3 },
  { id: "exercicio_aerobico", label: "Exercício aeróbico",         type: "rating", has_motivo: true,  required: true,  active: true, order_index: 4 },
  { id: "desempenho_treino",  label: "Desempenho no treino",       type: "rating", has_motivo: false, required: true,  active: true, order_index: 5 },
  { id: "recuperacao_treino", label: "Recuperação do treino",      type: "rating", has_motivo: false, required: true,  active: true, order_index: 6 },
  { id: "disposicao_dia",     label: "Disposição no dia a dia",    type: "rating", has_motivo: false, required: true,  active: true, order_index: 7 },
  { id: "qualidade_sono",     label: "Qualidade do sono",          type: "rating", has_motivo: false, required: true,  active: true, order_index: 8 },
  { id: "obs_geral",          label: "Observação para o coach",    type: "text",   has_motivo: false, required: false, active: true, order_index: 9 },
];

// Busca perguntas configuradas pelo coach; se não houver, usa as padrão
import { supabase } from "@/lib/supabase";

export async function loadCoachQuestions(coachId: string): Promise<FeedbackQuestion[]> {
  const { data, error } = await supabase
    .from("feedback_question_configs")
    .select("*")
    .eq("coach_id", coachId)
    .eq("active", true)
    .order("order_index");

  if (error || !data || data.length === 0) {
    return DEFAULT_FEEDBACK_QUESTIONS.filter(q => q.active);
  }

  return data.map((row: any) => ({
    id: row.id,
    label: row.label,
    type: row.type,
    unit: row.unit ?? undefined,
    has_motivo: row.has_motivo,
    required: row.required,
    active: row.active,
    order_index: row.order_index,
  }));
}
