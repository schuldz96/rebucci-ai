import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  sort_order: number;
}

// ─── Categorias padrão ────────────────────────────────────────────────────────

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

// ─── Campos de resposta ───────────────────────────────────────────────────────

const ScaleInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(String(n))}
        className={cn(
          "w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all",
          value === String(n)
            ? "bg-violet-600 text-white border-violet-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-violet-400"
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
        type="button"
        onClick={() => onChange(opt)}
        className={cn(
          "flex-1 max-w-[140px] py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
          value === opt
            ? "bg-violet-600 text-white border-violet-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-violet-400"
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

const SelectInput = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={cn(
          "px-4 py-2 rounded-xl text-sm border-2 transition-all",
          value === opt
            ? "bg-violet-600 text-white border-violet-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-violet-400"
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

// ─── Bloco de pergunta ────────────────────────────────────────────────────────

const QuestionBlock = ({
  index,
  question,
  value,
  onChange,
  error,
}: {
  index: number;
  question: Question;
  value: string;
  onChange: (v: string) => void;
  error: boolean;
}) => (
  <div className={cn("bg-white rounded-2xl border-2 p-5 transition-all", error ? "border-red-300" : "border-gray-100")}>
    <p className="text-sm font-semibold text-gray-900 mb-3">
      <span className="text-violet-500 mr-1.5">{index + 1}.</span>
      {question.label}
      {question.required && <span className="text-red-400 ml-1">*</span>}
    </p>

    {question.type === "scale" && <ScaleInput value={value} onChange={onChange} />}
    {question.type === "yesno" && <YesNoInput value={value} onChange={onChange} />}
    {question.type === "select" && question.options && (
      <SelectInput value={value} onChange={onChange} options={question.options} />
    )}
    {question.type === "textarea" && (
      <textarea
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none bg-gray-50"
        rows={3}
        placeholder="Descreva aqui..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
    {(question.type === "text" || question.type === "number") && (
      <Input
        type={question.type === "number" ? "number" : "text"}
        placeholder="Digite aqui..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-violet-400"
      />
    )}

    {error && <p className="text-xs text-red-400 mt-2">Esta pergunta é obrigatória.</p>}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AnamnesisFormPage = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired" | "done">("loading");
  const [tokenData, setTokenData] = useState<{ id: string; coach_id: string; customer_id: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // O CSS global define overflow:hidden no body/#root para o layout do CRM.
  // Esta página pública precisa de scroll normal.
  useEffect(() => {
    const root = document.getElementById("root");
    const prev = root?.style.overflow ?? "";
    if (root) root.style.overflow = "auto";
    document.body.style.overflow = "auto";
    return () => {
      if (root) root.style.overflow = prev;
      document.body.style.overflow = "";
    };
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenData) return;

    // Validação
    const missing = new Set<string>();
    questions.forEach((q) => {
      if (q.required && !answers[q.id]?.trim()) missing.add(q.id);
    });
    if (missing.size > 0) {
      setErrors(missing);
      const firstId = questions.find((q) => missing.has(q.id))?.id;
      if (firstId) document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

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

  const answered = Object.values(answers).filter((v) => v.trim()).length;
  const progress = Math.round((answered / questions.length) * 100);

  return (
    <div className="bg-gray-50" style={{ minHeight: "100vh", overflowY: "auto", position: "relative" }}>
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-violet-600 px-4 pt-8 pb-5 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-violet-300 uppercase tracking-widest font-medium mb-1">Anamnese</p>
          <h1 className="text-xl font-bold text-white">Formulário inicial</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-1.5 bg-violet-500/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-violet-200 shrink-0">{answered}/{questions.length}</span>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} id={`q-${q.id}`}>
            <QuestionBlock
              index={i}
              question={q}
              value={answers[q.id] ?? ""}
              onChange={(v) => {
                setAnswers((p) => ({ ...p, [q.id]: v }));
                if (errors.has(q.id)) setErrors((prev) => { const s = new Set(prev); s.delete(q.id); return s; });
              }}
              error={errors.has(q.id)}
            />
          </div>
        ))}

        {errors.size > 0 && (
          <p className="text-sm text-red-500 text-center">
            Preencha todas as perguntas obrigatórias antes de enviar.
          </p>
        )}

        <div className="pt-2 pb-8">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-semibold bg-violet-600 hover:bg-violet-700 rounded-2xl gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> Enviar anamnese</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AnamnesisFormPage;
