import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Bot, CheckCircle2, Loader2, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// ─── Perguntas padrão ─────────────────────────────────────────────────────────

const DEFAULT_QUESTIONS = [
  { id: "q1", label: "Como você se sentiu durante a semana?", type: "scale" },
  { id: "q2", label: "Você seguiu o plano alimentar?", type: "yesno" },
  { id: "q3", label: "Você seguiu o protocolo de treino?", type: "yesno" },
  { id: "q4", label: "Qual foi seu maior desafio esta semana?", type: "text" },
  { id: "q5", label: "Qual foi sua maior vitória esta semana?", type: "text" },
  { id: "q6", label: "Você tem alguma dúvida ou mensagem para o coach?", type: "text" },
];

// ─── Componentes de pergunta ──────────────────────────────────────────────────

const ScaleQuestion = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
      <button
        key={n}
        onClick={() => onChange(String(n))}
        className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
          value === String(n)
            ? "bg-violet-600 text-white shadow-md scale-110"
            : "bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700"
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);

const YesNoQuestion = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-3">
    {["Sim", "Não", "Parcialmente"].map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-5 py-2 rounded-xl font-medium text-sm transition-all border ${
          value === opt
            ? "bg-violet-600 text-white border-violet-600 shadow-md"
            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300"
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const TextQuestion = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <textarea
    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
    rows={3}
    placeholder="Digite sua resposta..."
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

      // Busca o feedback pendente para este token
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

  const current = DEFAULT_QUESTIONS[step];
  const isLast = step === DEFAULT_QUESTIONS.length - 1;
  const canNext = !!answers[current?.id];

  const handleSubmit = async () => {
    if (!tokenData) return;
    setPhase("submitting");

    await supabase.from("feedbacks").update({
      answers,
      status: "answered",
      answered_at: new Date().toISOString(),
    }).eq("id", tokenData.feedback_id);

    await supabase.from("feedback_tokens").update({ used_at: new Date().toISOString() }).eq("token", token!);

    setPhase("done");
  };

  // ── Estados de carregamento/erro ──

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Link inválido</h2>
          <p className="text-sm text-gray-500 mt-1">Este link de feedback não existe ou já foi utilizado.</p>
        </div>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Link expirado</h2>
          <p className="text-sm text-gray-500 mt-1">O prazo para responder este feedback já encerrou.</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
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
  }

  // ── Formulário passo a passo ──

  const progress = ((step + 1) / DEFAULT_QUESTIONS.length) * 100;

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
          {/* Progress */}
          <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-violet-200 mt-1">{step + 1} de {DEFAULT_QUESTIONS.length}</p>
        </div>

        {/* Pergunta */}
        <div className="px-6 py-8 space-y-5">
          <p className="text-base font-semibold text-gray-900">{current.label}</p>

          {current.type === "scale" && (
            <ScaleQuestion value={answers[current.id] ?? ""} onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))} />
          )}
          {current.type === "yesno" && (
            <YesNoQuestion value={answers[current.id] ?? ""} onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))} />
          )}
          {current.type === "text" && (
            <TextQuestion value={answers[current.id] ?? ""} onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          {isLast ? (
            <Button size="sm" onClick={handleSubmit} disabled={!canNext || phase === "submitting"} className="bg-violet-600 hover:bg-violet-700">
              {phase === "submitting" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Enviar feedback
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="bg-violet-600 hover:bg-violet-700">
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
