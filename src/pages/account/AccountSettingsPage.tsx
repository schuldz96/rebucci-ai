import { useState, useEffect } from "react";
import { User, Dumbbell, Zap, DollarSign, Plug, Loader2, Save, ClipboardList, Plus, Trash2, GripVertical, Edit2, X, Check, MessageSquare } from "lucide-react";
import FeedbackSection from "@/components/settings/FeedbackSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";

const SECTIONS = [
  { id: "profile", label: "Perfil do Coach", icon: User },
  { id: "coaching", label: "Coaching", icon: Dumbbell },
  { id: "automations", label: "Automações", icon: Zap },
  { id: "financial", label: "Financeiro", icon: DollarSign },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "anamnesis", label: "Anamnese", icon: ClipboardList },
  { id: "feedback", label: "Feedbacks", icon: MessageSquare },
];

const FEEDBACK_FREQ_OPTIONS = [7, 14, 15, 21, 30];

// ─── Profile Section ──────────────────────────────────────────────────────────

const ProfileSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", bio: "", specialty: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, phone, bio, specialty")
        .eq("id", coachId)
        .maybeSingle();
      if (data) setForm({ name: data.name ?? "", phone: data.phone ?? "", bio: data.bio ?? "", specialty: data.specialty ?? "" });
      setLoading(false);
    };
    load();
  }, [coachId]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = { id: coachId, name: form.name, phone: form.phone || null, bio: form.bio || null };
    if (form.specialty) payload.specialty = form.specialty;
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: "Perfil salvo com sucesso!" });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Perfil do Coach</h2>
      <div>
        <label className="text-sm font-medium text-foreground">Nome completo</label>
        <Input className="mt-1" placeholder="Seu nome completo" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Telefone / WhatsApp</label>
        <Input className="mt-1" placeholder="+55 11 99999-9999" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Especialidade</label>
        <Input className="mt-1" placeholder="Ex: Personal Trainer, Nutricionista..." value={form.specialty} onChange={(e) => set("specialty", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Bio</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={4}
          placeholder="Conte um pouco sobre você, sua experiência e abordagem..."
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar alterações</>}
      </Button>
    </div>
  );
};

// ─── Coaching Section ─────────────────────────────────────────────────────────

const CoachingSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackFreq, setFeedbackFreq] = useState(14);
  const [autoSend, setAutoSend] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("coach_settings")
        .select("feedback_freq_days, auto_send_feedback")
        .eq("coach_id", coachId)
        .maybeSingle();
      if (data) {
        setFeedbackFreq(data.feedback_freq_days ?? 14);
        setAutoSend(data.auto_send_feedback ?? true);
      }
      setLoading(false);
    };
    load();
  }, [coachId]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({
      coach_id: coachId,
      feedback_freq_days: feedbackFreq,
      auto_send_feedback: autoSend,
    });
    setSaving(false);
    toast({ title: "Configurações de coaching salvas!" });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Configurações de Coaching</h2>

      <div>
        <label className="text-sm font-medium text-foreground">Frequência padrão de feedback</label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Intervalo padrão ao criar novos planos</p>
        <div className="flex items-center gap-2 flex-wrap">
          {FEEDBACK_FREQ_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setFeedbackFreq(d)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                feedbackFreq === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Envio automático de feedback</p>
          <p className="text-xs text-muted-foreground mt-0.5">Envia o formulário automaticamente na data configurada</p>
        </div>
        <button
          onClick={() => setAutoSend((v) => !v)}
          className={cn(
            "w-10 h-6 rounded-full transition-colors relative shrink-0",
            autoSend ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", autoSend ? "translate-x-4" : "translate-x-0.5")} />
        </button>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
      </Button>
    </div>
  );
};

// ─── Automations Section ──────────────────────────────────────────────────────

const AutomationsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [birthdayMsg, setBirthdayMsg] = useState(true);
  const [expiringMsg, setExpiringMsg] = useState(true);
  const [expiringDays, setExpiringDays] = useState("7");

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({
      coach_id: coachId,
      auto_birthday_msg: birthdayMsg,
      auto_expiring_msg: expiringMsg,
      expiring_alert_days: parseInt(expiringDays) || 7,
    });
    setSaving(false);
    toast({ title: "Automações salvas!" });
  };

  const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: () => void; label: string; desc: string }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", value ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
      </button>
    </div>
  );

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Automações</h2>
      <Toggle value={birthdayMsg} onChange={() => setBirthdayMsg((v) => !v)} label="Mensagem de aniversário" desc="Envia parabéns automático no WhatsApp do aluno" />
      <Toggle value={expiringMsg} onChange={() => setExpiringMsg((v) => !v)} label="Alerta de vencimento próximo" desc="Notifica o aluno antes do plano expirar" />
      {expiringMsg && (
        <div>
          <label className="text-sm font-medium text-foreground">Avisar quantos dias antes?</label>
          <div className="flex items-center gap-2 mt-2">
            {[3, 5, 7, 14].map((d) => (
              <button
                key={d}
                onClick={() => setExpiringDays(String(d))}
                className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  expiringDays === String(d) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      )}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
      </Button>
    </div>
  );
};

// ─── Financial Section ────────────────────────────────────────────────────────

const FinancialSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [defaultMethod, setDefaultMethod] = useState("pix");

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({
      coach_id: coachId,
      pix_key: pixKey || null,
      default_payment_method: defaultMethod,
    });
    setSaving(false);
    toast({ title: "Configurações financeiras salvas!" });
  };

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Configurações Financeiras</h2>
      <div>
        <label className="text-sm font-medium text-foreground">Chave PIX</label>
        <Input className="mt-1" placeholder="CPF, e-mail, telefone ou chave aleatória" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Método de pagamento padrão</label>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {["pix", "cartao", "boleto", "dinheiro"].map((m) => (
            <button
              key={m}
              onClick={() => setDefaultMethod(m)}
              className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors",
                defaultMethod === m ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {m === "cartao" ? "Cartão" : m === "boleto" ? "Boleto" : m === "dinheiro" ? "Dinheiro" : "PIX"}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
      </Button>
    </div>
  );
};

// ─── Integrations Section ─────────────────────────────────────────────────────

const IntegrationsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const webhookUrl = `${window.location.origin}/api/webhook/${coachId}`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada!" });
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Integrações</h2>

      <div className="rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <p className="font-semibold text-foreground">Digital Manager Guru</p>
            <p className="text-xs text-muted-foreground">Webhook de venda → cria aluno automaticamente</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-green-400 bg-green-400/10">Ativo</span>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL do Webhook</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono text-foreground truncate">{webhookUrl}</code>
            <Button variant="outline" size="sm" onClick={copyWebhook}>Copiar</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Cole esta URL no campo "Webhook de compra" no painel do Digital Manager Guru. Ao receber uma venda, o aluno e a consultoria serão criados automaticamente.</p>
      </div>

      {[
        { name: "Hotmart", icon: "🔥", desc: "Integração via webhook de compra" },
        { name: "Eduzz", icon: "📦", desc: "Integração via webhook de compra" },
        { name: "Portal do Aluno", icon: "👤", desc: "Link único para o aluno ver treinos e feedbacks" },
      ].map((app) => (
        <div key={app.name} className="rounded-xl border border-border p-5 opacity-60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{app.icon}</span>
            <div>
              <p className="font-semibold text-foreground">{app.name}</p>
              <p className="text-xs text-muted-foreground">{app.desc}</p>
            </div>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-muted-foreground bg-muted">Em breve</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Categorias padrão ────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  {
    id: "habVida", label: "Hábitos de Vida",
    questions: ["Restrição alimentar", "Horário das refeições", "Descreva um dia típico de suas refeições", "Ingere bebida alcoólica?", "Fumante?", "Come fora de casa com frequência?"],
  },
  {
    id: "habSono", label: "Hábitos de Sono",
    questions: ["Quantas horas dorme por noite?", "Qualidade do sono (1-10)", "Tem dificuldade para dormir?", "Usa algum recurso para dormir melhor?"],
  },
  {
    id: "saude", label: "Histórico de Saúde",
    questions: ["Possui alguma doença diagnosticada?", "Usa algum medicamento?", "Já fez cirurgias?", "Tem lesões ou limitações físicas?", "Histórico familiar de doenças?"],
  },
  {
    id: "atividadeFisica", label: "Atividade Física",
    questions: ["Pratica atividade física atualmente?", "Qual modalidade?", "Quantas vezes por semana?", "Há quanto tempo treina?", "Nível de experiência"],
  },
  {
    id: "objetivos", label: "Objetivos",
    questions: ["Qual é o seu objetivo principal?", "Peso desejado (kg)", "Prazo para atingir o objetivo", "Já tentou outros métodos antes?"],
  },
];

const QUESTION_TYPES = [
  { value: "text",     label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "yesno",    label: "Sim / Não" },
  { value: "scale",    label: "Escala 1-10" },
  { value: "number",   label: "Número" },
  { value: "select",   label: "Múltipla escolha" },
];

interface AnamnesisQuestion {
  id: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  sort_order: number;
}

const QuestionModal = ({
  question,
  onClose,
  onSave,
}: {
  question?: AnamnesisQuestion;
  onClose: () => void;
  onSave: (q: Omit<AnamnesisQuestion, "id" | "sort_order">) => void;
}) => {
  const [label, setLabel] = useState(question?.label ?? "");
  const [type, setType] = useState(question?.type ?? "text");
  const [required, setRequired] = useState(question?.required ?? true);
  const [options, setOptions] = useState<string[]>(question?.options ?? ["", ""]);

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({ label, type, required, options: type === "select" ? options.filter(Boolean) : undefined });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{question ? "Editar pergunta" : "Nova pergunta"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Pergunta *</label>
            <Input className="mt-1" placeholder="Ex: Tem alguma restrição alimentar?" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de resposta</label>
            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {type === "select" && (
            <div>
              <label className="text-sm font-medium">Opções</label>
              <div className="space-y-2 mt-1">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder={`Opção ${i + 1}`} value={opt} onChange={(e) => setOptions((o) => o.map((x, j) => j === i ? e.target.value : x))} />
                    {options.length > 2 && (
                      <button onClick={() => setOptions((o) => o.filter((_, j) => j !== i))} className="text-destructive"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setOptions((o) => [...o, ""])} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"><Plus className="w-3 h-3" />Adicionar opção</button>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
            <span className="text-sm">Resposta obrigatória</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!label.trim()}>Salvar</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AnamnesisSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [enabledCategories, setEnabledCategories] = useState<string[]>(["habVida", "habSono", "saude", "atividadeFisica"]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AnamnesisQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AnamnesisQuestion | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: settings } = await supabase
        .from("coach_settings").select("anamnesis_mode, anamnesis_categories").eq("coach_id", coachId).maybeSingle();
      if (settings) {
        setMode(settings.anamnesis_mode ?? "default");
        setEnabledCategories(settings.anamnesis_categories ?? ["habVida", "habSono", "saude", "atividadeFisica"]);
      }
      const { data: qs } = await supabase
        .from("anamnesis_questions").select("*").eq("coach_id", coachId).eq("active", true).order("sort_order");
      setQuestions(qs ?? []);
      setLoading(false);
    };
    load();
  }, [coachId]);

  const saveSettings = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({ coach_id: coachId, anamnesis_mode: mode, anamnesis_categories: enabledCategories });
    setSaving(false);
    toast({ title: "Configurações salvas!" });
  };

  const toggleCategory = (id: string) =>
    setEnabledCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const handleSaveQuestion = async (data: Omit<AnamnesisQuestion, "id" | "sort_order">) => {
    if (editing) {
      await supabase.from("anamnesis_questions").update({ label: data.label, type: data.type, options: data.options, required: data.required }).eq("id", editing.id);
      setQuestions((prev) => prev.map((q) => q.id === editing.id ? { ...q, ...data } : q));
      toast({ title: "Pergunta atualizada" });
    } else {
      const sort_order = questions.length;
      const { data: inserted } = await supabase.from("anamnesis_questions")
        .insert({ coach_id: coachId, ...data, sort_order }).select().single();
      if (inserted) setQuestions((prev) => [...prev, inserted]);
      toast({ title: "Pergunta adicionada" });
    }
    setShowModal(false);
    setEditing(undefined);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("anamnesis_questions").update({ active: false }).eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast({ title: "Pergunta removida" });
  };

  const moveQuestion = async (idx: number, dir: -1 | 1) => {
    const newQs = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= newQs.length) return;
    [newQs[idx], newQs[target]] = [newQs[target], newQs[idx]];
    setQuestions(newQs);
    await Promise.all(newQs.map((q, i) => supabase.from("anamnesis_questions").update({ sort_order: i }).eq("id", q.id)));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Anamnese</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure o formulário enviado ao aluno no início da consultoria</p>
      </div>

      {/* Toggle modo */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Anamnese personalizada</p>
            <p className="text-xs text-muted-foreground mt-0.5">Crie suas próprias perguntas em vez de usar as categorias padrão</p>
          </div>
          <button
            onClick={() => setMode((m) => m === "custom" ? "default" : "custom")}
            className={cn("relative w-11 h-6 rounded-full transition-colors", mode === "custom" ? "bg-primary" : "bg-muted")}
          >
            <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", mode === "custom" && "translate-x-5")} />
          </button>
        </div>
      </div>

      {mode === "custom" ? (
        <>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-primary flex gap-3">
            <ClipboardList className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Adicione e ordene suas perguntas. O objetivo do aluno já é coletado automaticamente pelo sistema.</span>
          </div>

          <div className="space-y-2">
            {questions.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                Nenhuma pergunta criada ainda. Clique em "Nova pergunta" para começar.
              </div>
            )}
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">▲</button>
                  <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">▼</button>
                </div>
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.label}</p>
                  <p className="text-xs text-muted-foreground">{QUESTION_TYPES.find((t) => t.value === q.type)?.label}{q.required ? "" : " · Opcional"}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(q); setShowModal(true); }} className="p-1.5 rounded text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>

          <Button size="sm" variant="outline" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" />Nova pergunta
          </Button>
        </>
      ) : (
        <>
          <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-muted-foreground flex gap-3">
            <ClipboardList className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Selecione as categorias predefinidas que deseja incluir no formulário de anamnese do aluno.</span>
          </div>

          <div className="space-y-3">
            {DEFAULT_CATEGORIES.map((cat) => (
              <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => setExpandedCat((p) => p === cat.id ? null : cat.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors text-xs"
                    >
                      {expandedCat === cat.id ? "▼" : "▶"}
                    </button>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", enabledCategories.includes(cat.id) ? "bg-primary" : "bg-muted")}
                  >
                    <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", enabledCategories.includes(cat.id) && "translate-x-5")} />
                  </button>
                </div>
                {expandedCat === cat.id && (
                  <div className="px-4 pb-3 bg-muted/20">
                    <ul className="space-y-1 pl-7">
                      {cat.questions.map((q) => (
                        <li key={q} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Button onClick={saveSettings} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configurações
      </Button>

      <AnimatePresence>
        {showModal && (
          <QuestionModal
            question={editing}
            onClose={() => { setShowModal(false); setEditing(undefined); }}
            onSave={handleSaveQuestion}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AccountSettingsPage = () => {
  const { user } = useAuthStore();
  const [section, setSection] = useState("profile");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configurações do coach e da plataforma</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 border-r border-border shrink-0 py-4 px-2 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors",
                section === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-auto p-6">
          {user && (
            <>
              {section === "profile" && <ProfileSection coachId={user.id} />}
              {section === "coaching" && <CoachingSection coachId={user.id} />}
              {section === "automations" && <AutomationsSection coachId={user.id} />}
              {section === "financial" && <FinancialSection coachId={user.id} />}
              {section === "integrations" && <IntegrationsSection coachId={user.id} />}
              {section === "anamnesis" && <AnamnesisSection coachId={user.id} />}
              {section === "feedback" && <FeedbackSection coachId={user.id} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
