import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Bot, CheckCircle2, Loader2, AlertCircle, ChevronRight, ChevronLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// ─── Perguntas padrão ─────────────────────────────────────────────────────────
// rating: valor 1-5 → porcentagem 20%/40%/60%/80%/100%
// number: peso em Kg
// text: resposta livre

export const FEEDBACK_QUESTIONS = [
  { id: "weight_kg",                 label: "Qual foi o seu peso esta semana?",         type: "number",  unit: "Kg",    motivo: false },
  { id: "plano_alimentar",           label: "Plano alimentar",                           type: "rating",  motivo: true  },
  { id: "hidratacao",                label: "Hidratação",                                type: "rating",  motivo: true  },
  { id: "plano_treino",              label: "Plano de treino",                           type: "rating",  motivo: true  },
  { id: "exercicio_aerobico",        label: "Exercício aeróbico",                        type: "rating",  motivo: true  },
  { id: "desempenho_treino",         label: "Desempenho no treino",                      type: "rating",  motivo: false },
  { id: "recuperacao_treino",        label: "Recuperação do treino",                     type: "rating",  motivo: false },
  { id: "disposicao_dia",            label: "Disposição no dia a dia",                   type: "rating",  motivo: false },
  { id: "qualidade_sono",            label: "Qualidade do sono",                         type: "rating",  motivo: false },
  { id: "obs_geral",                 label: "Alguma observação ou mensagem para o coach?", type: "text", motivo: false },
];

// Cada pergunta com motivo gera dois steps: rating + texto
type Step = { questionId: string; subtype: "rating" | "number" | "text"; label: string; unit?: string };

const buildSteps = (): Step[] => {
  const steps: Step[] = [];
  for (const q of FEEDBACK_QUESTIONS) {
    steps.push({ questionId: q.id, subtype: q.type as any, label: q.label, unit: (q as any).unit });
    if (q.motivo) {
      steps.push({ questionId: `${q.id}_motivo`, subtype: "text", label: `Motivo — ${q.label}` });
    }
  }
  return steps;
};

const STEPS = buildSteps();

const ratingToPercent = (v: number) => `${v * 20}%`;
const percentToStars = (pct: string) => Math.round(parseInt(pct) / 20);

// ─── Componentes de resposta ──────────────────────────────────────────────────

const RatingInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const selected = value ? parseInt(value) : 0;
  const LABELS = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Ótimo"];
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className="flex flex-col items-center gap-1 transition-all"
          >
            <svg
              className={`w-9 h-9 transition-all ${n <= selected ? "text-yellow-400 scale-110" : "text-gray-300 hover:text-yellow-200"}`}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 22 20"
            >
              <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
            </svg>
          </button>
        ))}
      </div>
      {selected > 0 && (
        <p className="text-center text-sm font-medium text-violet-700 bg-violet-50 rounded-lg py-2">
          {ratingToPercent(selected)} — {LABELS[selected]}
        </p>
      )}
    </div>
  );
};

const NumberInput = ({ value, onChange, unit }: { value: string; onChange: (v: string) => void; unit?: string }) => (
  <div className="flex items-center gap-3 justify-center">
    <input
      type="number"
      step="0.1"
      min="0"
      max="500"
      placeholder="0.0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-32 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none py-3 px-4 bg-gray-50"
    />
    {unit && <span className="text-lg text-gray-500 font-medium">{unit}</span>}
  </div>
);

const TextInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <textarea
    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
    rows={4}
    placeholder="Digite sua resposta... (opcional)"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

// ─── Page ─────────────────────────────────────────────────────────────────────

type TokenData = {
  feedback_id: string;
  customer_name: string;
  coach_name: string;
  expires_at: string;
};

const FeedbackFormPage = () => {
  const { token } = useParams<{ token: string }>();

  const [phase, setPhase] = useState<"loading" | "invalid" | "expired" | "form" | "submitting" | "done">("loading");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!token) { setPhase("invalid"); return; }
    (async () => {
      const { data, error } = await supabase
        .from("feedback_tokens")
        .select("id, customer_id, coach_id, expires_at, used_at, customers(name), profiles(name)")
        .eq("token", token)
        .is("used_at", null)
        .maybeSingle();

      if (error || !data) { setPhase("invalid"); return; }
      if (new Date(data.expires_at) < new Date()) { setPhase("expired"); return; }

      const { data: fb } = await supabase
        .from("feedbacks")
        .select("id")
        .eq("token_id", data.id)
        .maybeSingle();

      setTokenData({
        feedback_id: fb?.id ?? "",
        customer_name: (data.customers as any)?.name ?? "Aluno",
        coach_name: (data.profiles as any)?.name ?? "Coach",
        expires_at: data.expires_at,
      });
      setPhase("form");
    })();
  }, [token]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  // Campos de motivo e obs são opcionais
  const isOptional = current?.subtype === "text";
  const canNext = isOptional || !!answers[current?.questionId];

  const handleSubmit = async () => {
    if (!tokenData) return;
    setPhase("submitting");

    // Extrai peso para salvar também em weight_logs
    const weightKg = answers["weight_kg"] ? parseFloat(answers["weight_kg"]) : undefined;

    // Converte ratings de 1-5 para percentagem no objeto de respostas
    const processedAnswers: Record<string, unknown> = {};
    for (const q of FEEDBACK_QUESTIONS) {
      if (answers[q.id] !== undefined) {
        processedAnswers[q.id] = q.type === "rating"
          ? { stars: parseInt(answers[q.id]), percent: parseInt(answers[q.id]) * 20 }
          : answers[q.id];
      }
      if (q.motivo && answers[`${q.id}_motivo`]) {
        processedAnswers[`${q.id}_motivo`] = answers[`${q.id}_motivo`];
      }
    }
    processedAnswers["obs_geral"] = answers["obs_geral"] ?? "";

    await supabase.from("feedbacks").update({
      answers: processedAnswers,
      weight_kg: weightKg ?? null,
      status: "answered",
      answered_at: new Date().toISOString(),
    }).eq("id", tokenData.feedback_id);

    await supabase.from("feedback_tokens").update({ used_at: new Date().toISOString() }).eq("token", token!);

    setPhase("done");
  };

  if (phase === "loading") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (phase === "invalid") return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Link inválido</h2>
        <p className="text-sm text-gray-500 mt-1">Este link de feedback não existe ou já foi utilizado.</p>
      </div>
    </div>
  );

  if (phase === "expired") return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Link expirado</h2>
        <p className="text-sm text-gray-500 mt-1">O prazo para responder este feedback já encerrou.</p>
      </div>
    </div>
  );

  if (phase === "done") return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Feedback enviado!</h2>
        <p className="text-sm text-gray-500 mt-2">
          Obrigado, {tokenData?.customer_name}! Seu coach receberá suas respostas em breve.
        </p>
      </div>
    </div>
  );

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-violet-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Formulário de Feedback</h1>
              <p className="text-xs text-violet-200">Coach {tokenData?.coach_name}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-violet-200 mt-1">{step + 1} de {STEPS.length}</p>
        </div>

        {/* Pergunta */}
        <div className="px-6 py-8 space-y-5">
          <div className="flex items-start gap-2">
            {current.subtype === "number" && <Scale className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />}
            <p className="text-base font-semibold text-gray-900">{current.label}</p>
          </div>

          {isOptional && (
            <p className="text-xs text-gray-400 -mt-3">Campo opcional — pode pular se preferir</p>
          )}

          {current.subtype === "rating" && (
            <RatingInput
              value={answers[current.questionId] ?? ""}
              onChange={(v) => setAnswers(prev => ({ ...prev, [current.questionId]: v }))}
            />
          )}
          {current.subtype === "number" && (
            <NumberInput
              value={answers[current.questionId] ?? ""}
              onChange={(v) => setAnswers(prev => ({ ...prev, [current.questionId]: v }))}
              unit={current.unit}
            />
          )}
          {current.subtype === "text" && (
            <TextInput
              value={answers[current.questionId] ?? ""}
              onChange={(v) => setAnswers(prev => ({ ...prev, [current.questionId]: v }))}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          {isLast ? (
            <Button size="sm" onClick={handleSubmit} disabled={phase === "submitting"} className="bg-violet-600 hover:bg-violet-700">
              {phase === "submitting" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Enviar feedback
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext} className="bg-violet-600 hover:bg-violet-700">
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
