import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  sort_order: number;
}

// ─── Categorias padrão (espelhadas das configurações) ─────────────────────────

const CATEGORY_QUESTIONS: Record<string, { label: string; type: string; options?: string[] }[]> = {
  habVida: [
    { label: "Possui alguma restrição alimentar?", type: "textarea" },
    { label: "Qual o horário habitual das suas refeições?", type: "text" },
    { label: "Descreva um dia típico de suas refeições", type: "textarea" },
    { label: "Ingere bebida alcoólica?", type: "yesno" },
    { label: "É fumante?", type: "yesno" },
    { label: "Come fora de casa com frequência?", type: "yesno" },
  ],
  habSono: [
    { label: "Quantas horas dorme por noite?", type: "number" },
    { label: "Como avalia a qualidade do seu sono? (1-10)", type: "scale" },
    { label: "Tem dificuldade para dormir?", type: "yesno" },
    { label: "Usa algum recurso para dormir melhor?", type: "text" },
  ],
  saude: [
    { label: "Possui alguma doença diagnosticada?", type: "textarea" },
    { label: "Usa algum medicamento?", type: "text" },
    { label: "Já fez cirurgias?", type: "textarea" },
    { label: "Tem lesões ou limitações físicas?", type: "textarea" },
    { label: "Histórico familiar de doenças?", type: "textarea" },
  ],
  atividadeFisica: [
    { label: "Pratica atividade física atualmente?", type: "yesno" },
    { label: "Qual modalidade?", type: "text" },
    { label: "Quantas vezes por semana treina?", type: "number" },
    { label: "Há quanto tempo treina?", type: "text" },
    { label: "Como avalia seu nível de experiência?", type: "select", options: ["Iniciante", "Intermediário", "Avançado"] },
  ],
  objetivos: [
    { label: "Qual é o seu objetivo principal?", type: "textarea" },
    { label: "Peso desejado (kg)", type: "number" },
    { label: "Prazo para atingir o objetivo", type: "text" },
    { label: "Já tentou outros métodos antes?", type: "textarea" },
  ],
};

// ─── Componentes de resposta ──────────────────────────────────────────────────

const ScaleInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
      <button
        key={n}
        onClick={() => onChange(String(n))}
        className={cn(
          "w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all",
          value === String(n)
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border text-foreground hover:border-primary/50"
        )}
      >
        {n}
      </button>
    ))}
  </div>
);

const YesNoInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-3">
    {["Sim", "Não"].map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={cn(
          "flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
          value === opt
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border text-foreground hover:border-primary/50"
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

const SelectInput = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <div className="space-y-2">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={cn(
          "w-full text-left px-4 py-3 rounded-xl text-sm border-2 transition-all",
          value === opt
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border text-foreground hover:border-primary/50"
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AnamnesisFormPage = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired" | "done">("loading");
  const [tokenData, setTokenData] = useState<{ id: string; coach_id: string; customer_id: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) { setStatus("invalid"); return; }

      const { data: tk } = await supabase
        .from("anamnesis_tokens")
        .select("id, coach_id, customer_id, expires_at, used_at")
        .eq("token", token)
        .maybeSingle();

      if (!tk) { setStatus("invalid"); return; }
      if (tk.used_at) { setStatus("done"); return; }
      if (tk.expires_at && new Date(tk.expires_at) < new Date()) { setStatus("expired"); return; }

      setTokenData({ id: tk.id, coach_id: tk.coach_id, customer_id: tk.customer_id });

      // Buscar configurações do coach
      const { data: settings } = await supabase
        .from("coach_settings")
        .select("anamnesis_mode, anamnesis_categories")
        .eq("coach_id", tk.coach_id)
        .maybeSingle();

      const mode = settings?.anamnesis_mode ?? "default";

      if (mode === "custom") {
        const { data: qs } = await supabase
          .from("anamnesis_questions")
          .select("*")
          .eq("coach_id", tk.coach_id)
          .eq("active", true)
          .order("sort_order");
        setQuestions(qs ?? []);
      } else {
        const categories: string[] = settings?.anamnesis_categories ?? ["habVida", "habSono", "saude", "atividadeFisica"];
        const qs: Question[] = [];
        categories.forEach((cat, ci) => {
          (CATEGORY_QUESTIONS[cat] ?? []).forEach((q, qi) => {
            qs.push({ id: `${cat}_${qi}`, ...q, required: true, sort_order: ci * 100 + qi });
          });
        });
        setQuestions(qs);
      }

      setStatus("valid");
    };
    load();
  }, [token]);

  const current = questions[step];
  const progress = questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;
  const canNext = !current?.required || !!answers[current?.id];

  const handleSubmit = async () => {
    if (!tokenData) return;
    setSubmitting(true);

    // Salva ou atualiza anamnese
    const { data: existing } = await supabase
      .from("anamnesis")
      .select("id")
      .eq("customer_id", tokenData.customer_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("anamnesis").update({ answers, submitted_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("anamnesis").insert({
        coach_id: tokenData.coach_id,
        customer_id: tokenData.customer_id,
        answers,
        submitted_at: new Date().toISOString(),
      });
    }

    await supabase.from("anamnesis_tokens").update({ used_at: new Date().toISOString() }).eq("id", tokenData.id);
    setStatus("done");
  };

  // ── Estados de tela ────────────────────────────────────────────────────────

  if (status === "loading") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (status === "invalid") return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold text-gray-800">Link inválido</h2>
      <p className="text-sm text-gray-500 mt-2">Este link de anamnese não existe ou foi removido.</p>
    </div>
  );

  if (status === "expired") return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-12 h-12 text-orange-400 mb-4" />
      <h2 className="text-xl font-semibold text-gray-800">Link expirado</h2>
      <p className="text-sm text-gray-500 mt-2">O prazo para preencher este formulário já encerrou. Entre em contato com seu coach.</p>
    </div>
  );

  if (status === "done") return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-violet-800 flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-16 h-16 text-white mb-4" />
      <h2 className="text-2xl font-bold text-white">Anamnese enviada!</h2>
      <p className="text-sm text-violet-200 mt-2 max-w-xs">Suas informações foram recebidas pelo seu coach. Obrigado por preencher!</p>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-sm text-gray-500">Nenhuma pergunta configurada ainda.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-violet-800 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 text-white">
        <p className="text-xs text-violet-300 uppercase tracking-widest font-medium mb-1">Anamnese</p>
        <h1 className="text-xl font-bold">Formulário inicial</h1>
        <p className="text-xs text-violet-200 mt-1">{step + 1} de {questions.length}</p>
        <div className="mt-4 h-1.5 bg-violet-500/40 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Pergunta */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-lg font-semibold text-gray-900 mb-6">{current.label}</p>

            {current.type === "scale" && (
              <ScaleInput value={answers[current.id] ?? ""} onChange={(v) => setAnswers((p) => ({ ...p, [current.id]: v }))} />
            )}
            {current.type === "yesno" && (
              <YesNoInput value={answers[current.id] ?? ""} onChange={(v) => setAnswers((p) => ({ ...p, [current.id]: v }))} />
            )}
            {current.type === "select" && current.options && (
              <SelectInput value={answers[current.id] ?? ""} onChange={(v) => setAnswers((p) => ({ ...p, [current.id]: v }))} options={current.options} />
            )}
            {current.type === "textarea" && (
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={4}
                placeholder="Descreva aqui..."
                value={answers[current.id] ?? ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [current.id]: e.target.value }))}
              />
            )}
            {(current.type === "text" || current.type === "number") && (
              <Input
                type={current.type === "number" ? "number" : "text"}
                className="text-base"
                placeholder="Digite aqui..."
                value={answers[current.id] ?? ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [current.id]: e.target.value }))}
              />
            )}

            {current.required && !answers[current.id] && (
              <p className="text-xs text-gray-400 mt-3">* Resposta obrigatória</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navegação */}
        <div className="flex items-center justify-between mt-8 gap-3">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="gap-2">
            <ChevronLeft className="w-4 h-4" />Anterior
          </Button>

          {step < questions.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="gap-2 bg-violet-600 hover:bg-violet-700">
              Próxima<ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext || submitting} className="gap-2 bg-violet-600 hover:bg-violet-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enviar anamnese
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnamnesisFormPage;
