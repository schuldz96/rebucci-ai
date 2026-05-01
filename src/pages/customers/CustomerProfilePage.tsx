import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Calendar, ClipboardList, Star, Salad, Dumbbell,
  Activity, FlaskConical, MessageCircle, Camera, StickyNote,
  Check, Eye, Mail, CalendarDays, MessageSquare, Pin, Loader2,
  Plus, Trash2, Weight, Droplets, Percent, Edit2, X, Link, Upload, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore, Customer, Consultoria, CustomerNote, WeightLog, Feedback } from "@/store/customerStore";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "progress",    label: "Progresso",     icon: TrendingUp },
  { id: "scheduling",  label: "Agendamentos",   icon: Calendar },
  { id: "anamnesis",   label: "Anamnese",       icon: ClipboardList },
  { id: "evaluations", label: "Avaliações",     icon: Star },
  { id: "diets",       label: "Dietas",         icon: Salad },
  { id: "workouts",    label: "Treinos",        icon: Dumbbell },
  { id: "cardio",      label: "Cardio",         icon: Activity },
  { id: "exams",       label: "Exames",         icon: FlaskConical },
  { id: "feedbacks",   label: "Feedbacks",      icon: MessageCircle },
  { id: "photos",      label: "Fotos",          icon: Camera },
  { id: "notes",       label: "Notas",          icon: StickyNote },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendente",   color: "text-blue-400 bg-blue-400/10" },
  partial:   { label: "Parcial",    color: "text-yellow-400 bg-yellow-400/10" },
  answered:  { label: "Respondido", color: "text-green-400 bg-green-400/10" },
  seen:      { label: "Visto",      color: "text-muted-foreground bg-muted" },
  expired:   { label: "Expirado",   color: "text-destructive bg-destructive/10" },
  scheduled: { label: "Agendado",   color: "text-blue-400 bg-blue-400/10" },
  completed: { label: "Concluído",  color: "text-green-400 bg-green-400/10" },
  cancelled: { label: "Cancelado",  color: "text-muted-foreground bg-muted" },
};

const APPT_TYPE: Record<string, string> = {
  feedback: "Feedback", checkin: "Check-in", consultation: "Consulta",
  birthday: "Aniversário", renewal: "Renovação",
};

// ─── Tab: Progresso ───────────────────────────────────────────────────────────

const ProgressTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { fetchWeightLogs, addWeightLog } = useCustomerStore();
  const { toast } = useToast();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [bodyFatLogs, setBodyFatLogs] = useState<{ id: string; body_fat_pct: number; recorded_at: string }[]>([]);
  const [newFat, setNewFat] = useState("");
  const [savingFat, setSavingFat] = useState(false);

  useEffect(() => {
    fetchWeightLogs(customerId).then(setLogs);
    supabase.from("body_fat_logs").select("*").eq("customer_id", customerId).order("recorded_at").then(({ data }) => setBodyFatLogs(data ?? []));
  }, [customerId]);

  const handleAddWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w) return;
    setSaving(true);
    const ok = await addWeightLog(coachId, customerId, w, format(new Date(), "yyyy-MM-dd"));
    if (ok) {
      const updated = await fetchWeightLogs(customerId);
      setLogs(updated);
      setNewWeight("");
      toast({ title: "Peso registrado!" });
    }
    setSaving(false);
  };

  const handleAddFat = async () => {
    const f = parseFloat(newFat);
    if (!f) return;
    setSavingFat(true);
    const { data } = await supabase.from("body_fat_logs").insert({
      coach_id: coachId, customer_id: customerId,
      body_fat_pct: f, recorded_at: format(new Date(), "yyyy-MM-dd"),
    }).select().single();
    if (data) {
      setBodyFatLogs((prev) => [...prev, data]);
      setNewFat("");
      toast({ title: "% gordura registrada!" });
    }
    setSavingFat(false);
  };

  const lastWeight = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;
  const firstWeight = logs.length > 0 ? logs[0].weight_kg : null;
  const diff = lastWeight && firstWeight ? (lastWeight - firstWeight).toFixed(1) : null;
  const lastFat = bodyFatLogs.length > 0 ? bodyFatLogs[bodyFatLogs.length - 1].body_fat_pct : null;

  return (
    <div className="space-y-6">
      {/* Peso */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Weight className="w-4 h-4 text-primary" /> Evolução de Peso
        </h3>
        {logs.length > 0 ? (
          <>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Peso atual</p>
                <p className="text-2xl font-bold text-foreground">{lastWeight} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
              </div>
              {diff && (
                <div>
                  <p className="text-xs text-muted-foreground">Variação total</p>
                  <p className={cn("text-lg font-semibold", parseFloat(diff) <= 0 ? "text-green-400" : "text-orange-400")}>
                    {parseFloat(diff) > 0 ? "+" : ""}{diff} kg
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...logs].reverse().map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{format(parseISO(l.recorded_at), "dd/MM/yyyy")}</span>
                  <span className="font-medium text-foreground">{l.weight_kg} kg</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">Nenhum peso registrado ainda.</p>
        )}
        <div className="flex items-center gap-2 mt-4">
          <Input type="number" step="0.1" placeholder="Ex: 75.5" className="max-w-[140px]" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
          <span className="text-sm text-muted-foreground">kg</span>
          <Button size="sm" onClick={handleAddWeight} disabled={saving || !newWeight}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Registrar
          </Button>
        </div>
      </div>

      {/* % Gordura */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Percent className="w-4 h-4 text-primary" /> Percentual de Gordura
        </h3>
        {bodyFatLogs.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto mb-4">
            {[...bodyFatLogs].reverse().map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                <span className="text-muted-foreground">{format(parseISO(l.recorded_at), "dd/MM/yyyy")}</span>
                <span className="font-medium text-foreground">{l.body_fat_pct}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">Nenhum registro ainda.</p>
        )}
        <div className="flex items-center gap-2">
          <Input type="number" step="0.1" placeholder="Ex: 18.5" className="max-w-[140px]" value={newFat} onChange={(e) => setNewFat(e.target.value)} />
          <span className="text-sm text-muted-foreground">%</span>
          <Button size="sm" onClick={handleAddFat} disabled={savingFat || !newFat}>
            {savingFat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Registrar
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Agendamentos ────────────────────────────────────────────────────────

const SchedulingTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "checkin", title: "", scheduled_at: "", notes: "" });
  const [pickerDate, setPickerDate] = useState<Date | undefined>(undefined);
  const [pickerTime, setPickerTime] = useState("09:00");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("appointments").select("*")
      .eq("customer_id", customerId).order("scheduled_at", { ascending: false });
    setAppts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleSave = async () => {
    if (!form.scheduled_at) { toast({ title: "Data obrigatória", variant: "destructive" }); return; }
    setSaving(true);
    await supabase.from("appointments").insert({
      coach_id: coachId, customer_id: customerId,
      type: form.type, title: form.title || APPT_TYPE[form.type],
      scheduled_at: form.scheduled_at, notes: form.notes || null, status: "scheduled",
    });
    toast({ title: "Agendamento criado!" });
    setShowForm(false);
    setForm({ type: "checkin", title: "", scheduled_at: "", notes: "" });
    setPickerDate(undefined);
    setPickerTime("09:00");
    await load();
    setSaving(false);
  };

  const handleToggle = async (appt: any) => {
    const status = appt.status === "completed" ? "scheduled" : "completed";
    await supabase.from("appointments").update({ status }).eq("id", appt.id);
    setAppts((prev) => prev.map((a) => a.id === appt.id ? { ...a, status } : a));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("appointments").delete().eq("id", id);
    setAppts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Agendamento excluído" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Agendamentos</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5" /> Novo agendamento
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Tipo</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {Object.entries(APPT_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Data e hora</label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "mt-1 w-full flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-left transition-colors hover:border-primary/60",
                    !pickerDate && "text-muted-foreground"
                  )}>
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    {pickerDate
                      ? `${format(pickerDate, "dd/MM/yyyy", { locale: ptBR })} às ${pickerTime}`
                      : "Selecionar data e hora"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarUI
                    mode="single"
                    selected={pickerDate}
                    onSelect={(d) => {
                      setPickerDate(d);
                      if (d) {
                        const [h, m] = pickerTime.split(":");
                        const dt = new Date(d);
                        dt.setHours(parseInt(h), parseInt(m));
                        setForm((p) => ({ ...p, scheduled_at: format(dt, "yyyy-MM-dd'T'HH:mm") }));
                      }
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                  <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Hora:</span>
                    <Input
                      type="time"
                      value={pickerTime}
                      className="w-28 h-8 text-sm"
                      onChange={(e) => {
                        setPickerTime(e.target.value);
                        if (pickerDate) {
                          const [h, m] = e.target.value.split(":");
                          const dt = new Date(pickerDate);
                          dt.setHours(parseInt(h), parseInt(m));
                          setForm((p) => ({ ...p, scheduled_at: format(dt, "yyyy-MM-dd'T'HH:mm") }));
                        }
                      }}
                    />
                    <Button size="sm" className="ml-auto" onClick={() => setPickerOpen(false)}>OK</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Título (opcional)</label>
            <Input className="mt-1" placeholder="Ex: Check-in semanal" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Observações</label>
            <Input className="mt-1" placeholder="Opcional..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {appts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhum agendamento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appts.map((a) => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.scheduled;
            return (
              <div key={a.id} className="rounded-xl border border-border p-3 flex items-center gap-3">
                <button onClick={() => handleToggle(a)} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  a.status === "completed" ? "border-green-400 bg-green-400" : "border-border hover:border-primary"
                )}>
                  {a.status === "completed" && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.title || APPT_TYPE[a.type] || a.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(a.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
                <button onClick={() => handleDelete(a.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Anamnese ────────────────────────────────────────────────────────────

const AnamnesisTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<{ id: string; label: string; type: string }[]>([]);
  const [anamnesisId, setAnamnesisId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: anam } = await supabase.from("anamnesis").select("*").eq("customer_id", customerId).maybeSingle();
      if (anam) { setAnswers(anam.answers ?? {}); setAnamnesisId(anam.id); setSubmittedAt(anam.submitted_at); }

      const { data: settings } = await supabase.from("coach_settings").select("anamnesis_mode, anamnesis_categories").eq("coach_id", coachId).maybeSingle();
      const mode = settings?.anamnesis_mode ?? "default";

      if (mode === "custom") {
        const { data: qs } = await supabase.from("anamnesis_questions").select("id, label, type").eq("coach_id", coachId).eq("active", true).order("sort_order");
        setQuestions(qs ?? []);
      } else {
        const CATEGORY_QUESTIONS: Record<string, { label: string; type: string }[]> = {
          habVida: [{ label: "Possui alguma restrição alimentar?", type: "textarea" }, { label: "Qual o horário habitual das suas refeições?", type: "text" }, { label: "Descreva um dia típico de suas refeições", type: "textarea" }, { label: "Ingere bebida alcoólica?", type: "text" }, { label: "É fumante?", type: "text" }],
          habSono: [{ label: "Quantas horas dorme por noite?", type: "text" }, { label: "Qualidade do sono (1-10)", type: "text" }, { label: "Tem dificuldade para dormir?", type: "text" }],
          saude: [{ label: "Possui alguma doença diagnosticada?", type: "textarea" }, { label: "Usa algum medicamento?", type: "text" }, { label: "Tem lesões ou limitações físicas?", type: "textarea" }],
          atividadeFisica: [{ label: "Pratica atividade física atualmente?", type: "text" }, { label: "Qual modalidade?", type: "text" }, { label: "Quantas vezes por semana treina?", type: "text" }],
          objetivos: [{ label: "Qual é o seu objetivo principal?", type: "textarea" }, { label: "Peso desejado (kg)", type: "text" }],
        };
        const cats: string[] = settings?.anamnesis_categories ?? ["habVida", "habSono", "saude", "atividadeFisica"];
        const qs: { id: string; label: string; type: string }[] = [];
        cats.forEach((cat, ci) => (CATEGORY_QUESTIONS[cat] ?? []).forEach((q, qi) => qs.push({ id: `${cat}_${qi}`, ...q })));
        setQuestions(qs);
      }
      setLoading(false);
    };
    load();
  }, [customerId, coachId]);

  const sendLink = async () => {
    setSendingLink(true);
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await supabase.from("anamnesis_tokens").insert({ coach_id: coachId, customer_id: customerId, token });
    const url = `${window.location.origin}/anamnese/${token}`;
    await navigator.clipboard.writeText(url);
    setSendingLink(false);
    toast({ title: "Link copiado!", description: "Envie para o aluno via WhatsApp ou e-mail." });
  };

  const hasConfig = questions.length > 0;

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // Sem configuração → bloqueia e orienta
  if (!hasConfig) {
    return (
      <div className="max-w-md">
        <h3 className="font-semibold text-foreground mb-1">Anamnese</h3>
        <div className="mt-4 rounded-xl border border-dashed border-orange-400/40 bg-orange-400/5 p-6 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="w-10 h-10 text-orange-400/60" />
          <div>
            <p className="font-medium text-foreground">Nenhum formulário configurado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Antes de enviar a anamnese ao aluno, você precisa configurar quais perguntas serão incluídas.
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2 mt-1"
            onClick={() => window.location.href = "/settings/anamnese"}
          >
            <ClipboardList className="w-4 h-4" />
            Configurar anamnese
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Header com status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Anamnese</h3>
          {submittedAt ? (
            <p className="text-xs text-green-400 mt-0.5">Preenchida em {new Date(submittedAt).toLocaleDateString("pt-BR")}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Ainda não preenchida pelo aluno</p>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={sendLink} disabled={sendingLink}>
          {sendingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
          Copiar link
        </Button>
      </div>

      {/* Respostas preenchidas */}
      {anamnesisId && questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q) => answers[q.id] ? (
            <div key={q.id} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{q.label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{answers[q.id]}</p>
            </div>
          ) : null)}
        </div>
      ) : (
        /* Preview das perguntas que o aluno vai receber */
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Preview — {questions.length} perguntas serão enviadas ao aluno
          </p>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {questions.map((q, i) => (
              <div key={q.id} className="px-4 py-2.5 bg-muted/10 flex items-start gap-3">
                <span className="text-xs text-muted-foreground/50 mt-0.5 shrink-0 w-4">{i + 1}.</span>
                <p className="text-sm text-foreground">{q.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Clique em "Copiar link" para enviar este formulário ao aluno via WhatsApp ou e-mail.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Avaliações ──────────────────────────────────────────────────────────

const EvaluationsTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [evals, setEvals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight_kg: "", body_fat_pct: "", arm_cm: "", waist_cm: "", hip_cm: "", thigh_cm: "", calf_cm: "", notes: "", evaluated_at: format(new Date(), "yyyy-MM-dd") });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("customer_evaluations").select("*").eq("customer_id", customerId).order("evaluated_at", { ascending: false });
    setEvals(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = { coach_id: coachId, customer_id: customerId, evaluated_at: form.evaluated_at };
    if (form.weight_kg) payload.weight_kg = parseFloat(form.weight_kg);
    if (form.body_fat_pct) payload.body_fat_pct = parseFloat(form.body_fat_pct);
    if (form.arm_cm) payload.arm_cm = parseFloat(form.arm_cm);
    if (form.waist_cm) payload.waist_cm = parseFloat(form.waist_cm);
    if (form.hip_cm) payload.hip_cm = parseFloat(form.hip_cm);
    if (form.thigh_cm) payload.thigh_cm = parseFloat(form.thigh_cm);
    if (form.calf_cm) payload.calf_cm = parseFloat(form.calf_cm);
    if (form.notes) payload.notes = form.notes;
    await supabase.from("customer_evaluations").insert(payload);
    toast({ title: "Avaliação registrada!" });
    setShowForm(false);
    setForm({ weight_kg: "", body_fat_pct: "", arm_cm: "", waist_cm: "", hip_cm: "", thigh_cm: "", calf_cm: "", notes: "", evaluated_at: format(new Date(), "yyyy-MM-dd") });
    await load();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("customer_evaluations").delete().eq("id", id);
    setEvals((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Avaliação excluída" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const fields = [
    { key: "weight_kg", label: "Peso (kg)" }, { key: "body_fat_pct", label: "% Gordura" },
    { key: "arm_cm", label: "Braço (cm)" }, { key: "waist_cm", label: "Cintura (cm)" },
    { key: "hip_cm", label: "Quadril (cm)" }, { key: "thigh_cm", label: "Coxa (cm)" },
    { key: "calf_cm", label: "Panturrilha (cm)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Avaliações Físicas</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5" /> Nova avaliação
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Data da avaliação</label>
            <Input type="date" className="mt-1 max-w-[180px]" value={form.evaluated_at} onChange={(e) => setForm((p) => ({ ...p, evaluated_at: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs font-medium text-foreground">{f.label}</label>
                <Input type="number" step="0.1" className="mt-1" value={(form as any)[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Observações</label>
            <Input className="mt-1" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar avaliação"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {evals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Star className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhuma avaliação registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evals.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-foreground text-sm">{format(parseISO(ev.evaluated_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                <button onClick={() => handleDelete(ev.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {fields.map((f) => ev[f.key] != null && (
                  <div key={f.key} className="text-xs">
                    <p className="text-muted-foreground">{f.label}</p>
                    <p className="font-semibold text-foreground">{ev[f.key]}</p>
                  </div>
                ))}
              </div>
              {ev.notes && <p className="text-xs text-muted-foreground mt-2">{ev.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Treinos ─────────────────────────────────────────────────────────────

const WorkoutsTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from("customer_workout_plans").select("*, workout_plans(id,name,description,goal,level)").eq("customer_id", customerId).order("assigned_at", { ascending: false }),
      supabase.from("workout_plans").select("id,name,description,goal,level").eq("coach_id", coachId),
    ]);
    setAssigned(a ?? []);
    setLibrary(l ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleAssign = async (planId: string) => {
    setSaving(true);
    await supabase.from("customer_workout_plans").insert({ coach_id: coachId, customer_id: customerId, workout_plan_id: planId, active: true });
    toast({ title: "Treino atribuído!" });
    setShowPicker(false);
    await load();
    setSaving(false);
  };

  const handleToggleActive = async (item: any) => {
    await supabase.from("customer_workout_plans").update({ active: !item.active }).eq("id", item.id);
    setAssigned((prev) => prev.map((a) => a.id === item.id ? { ...a, active: !item.active } : a));
  };

  const handleRemove = async (id: string) => {
    await supabase.from("customer_workout_plans").delete().eq("id", id);
    setAssigned((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Treino removido" });
  };

  const assignedIds = new Set(assigned.map((a) => a.workout_plan_id));

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Treinos do Aluno</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowPicker((v) => !v)}>
          <Plus className="w-3.5 h-3.5" /> Atribuir treino
        </Button>
      </div>

      {showPicker && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground mb-2">Selecionar da biblioteca:</p>
          {library.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treino na biblioteca. Crie em Bibliotecas → Treinos.</p>
          ) : (
            library.filter((p) => !assignedIds.has(p.id)).map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{plan.name}</p>
                  {plan.goal && <p className="text-xs text-muted-foreground">{plan.goal}</p>}
                </div>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => handleAssign(plan.id)}>Atribuir</Button>
              </div>
            ))
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowPicker(false)}>Cancelar</Button>
        </div>
      )}

      {assigned.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Dumbbell className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhum treino atribuído</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assigned.map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.workout_plans?.name}</p>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", item.active ? "text-green-400 bg-green-400/10" : "text-muted-foreground bg-muted")}>
                    {item.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                {item.workout_plans?.goal && <p className="text-xs text-muted-foreground">{item.workout_plans.goal}</p>}
              </div>
              <button onClick={() => handleToggleActive(item)} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors">
                {item.active ? "Desativar" : "Ativar"}
              </button>
              <button onClick={() => handleRemove(item.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Dietas ──────────────────────────────────────────────────────────────

const DietsTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from("customer_diet_plans").select("*, diet_plans(id,name,description,goal,calorie_target)").eq("customer_id", customerId).order("assigned_at", { ascending: false }),
      supabase.from("diet_plans").select("id,name,description,goal,calorie_target").eq("coach_id", coachId),
    ]);
    setAssigned(a ?? []);
    setLibrary(l ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleAssign = async (planId: string) => {
    setSaving(true);
    await supabase.from("customer_diet_plans").insert({ coach_id: coachId, customer_id: customerId, diet_plan_id: planId, active: true });
    toast({ title: "Dieta atribuída!" });
    setShowPicker(false);
    await load();
    setSaving(false);
  };

  const handleToggleActive = async (item: any) => {
    await supabase.from("customer_diet_plans").update({ active: !item.active }).eq("id", item.id);
    setAssigned((prev) => prev.map((a) => a.id === item.id ? { ...a, active: !item.active } : a));
  };

  const handleRemove = async (id: string) => {
    await supabase.from("customer_diet_plans").delete().eq("id", id);
    setAssigned((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Dieta removida" });
  };

  const assignedIds = new Set(assigned.map((a) => a.diet_plan_id));

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Dietas do Aluno</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowPicker((v) => !v)}>
          <Plus className="w-3.5 h-3.5" /> Atribuir dieta
        </Button>
      </div>

      {showPicker && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground mb-2">Selecionar da biblioteca:</p>
          {library.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma dieta na biblioteca. Crie em Bibliotecas → Dietas.</p>
          ) : (
            library.filter((p) => !assignedIds.has(p.id)).map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{plan.name}</p>
                  {plan.calorie_target && <p className="text-xs text-muted-foreground">{plan.calorie_target} kcal</p>}
                </div>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => handleAssign(plan.id)}>Atribuir</Button>
              </div>
            ))
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowPicker(false)}>Cancelar</Button>
        </div>
      )}

      {assigned.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Salad className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhuma dieta atribuída</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assigned.map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.diet_plans?.name}</p>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", item.active ? "text-green-400 bg-green-400/10" : "text-muted-foreground bg-muted")}>
                    {item.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                {item.diet_plans?.calorie_target && <p className="text-xs text-muted-foreground">{item.diet_plans.calorie_target} kcal</p>}
              </div>
              <button onClick={() => handleToggleActive(item)} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors">
                {item.active ? "Desativar" : "Ativar"}
              </button>
              <button onClick={() => handleRemove(item.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Cardio ──────────────────────────────────────────────────────────────

const CardioTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ cardio_type: "Corrida", duration_min: "", distance_km: "", logged_at: format(new Date(), "yyyy-MM-dd") });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("cardio_logs").select("*").eq("customer_id", customerId).order("logged_at", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleSave = async () => {
    if (!form.duration_min) { toast({ title: "Duração obrigatória", variant: "destructive" }); return; }
    setSaving(true);
    await supabase.from("cardio_logs").insert({
      coach_id: coachId, customer_id: customerId,
      cardio_type: form.cardio_type,
      duration_min: parseInt(form.duration_min),
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      logged_at: form.logged_at,
    });
    toast({ title: "Cardio registrado!" });
    setForm({ cardio_type: "Corrida", duration_min: "", distance_km: "", logged_at: format(new Date(), "yyyy-MM-dd") });
    await load();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cardio_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Registro excluído" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Registros de Cardio</h3>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Novo registro</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground">Tipo</label>
            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              value={form.cardio_type} onChange={(e) => setForm((p) => ({ ...p, cardio_type: e.target.value }))}>
              {["Corrida", "Caminhada", "Ciclismo", "Natação", "Elíptico", "Pular corda", "Outro"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Duração (min) *</label>
            <Input type="number" className="mt-1" value={form.duration_min} onChange={(e) => setForm((p) => ({ ...p, duration_min: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Distância (km)</label>
            <Input type="number" step="0.1" className="mt-1" value={form.distance_km} onChange={(e) => setForm((p) => ({ ...p, distance_km: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Data</label>
            <Input type="date" className="mt-1" value={form.logged_at} onChange={(e) => setForm((p) => ({ ...p, logged_at: e.target.value }))} />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Registrar
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Activity className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhum cardio registrado</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Data", "Tipo", "Duração", "Distância", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground">{format(parseISO(l.logged_at), "dd/MM/yyyy")}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{l.cardio_type}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.duration_min} min</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.distance_km ? `${l.distance_km} km` : "—"}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(l.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Exames ──────────────────────────────────────────────────────────────

const ExamsTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", file_url: "", exam_date: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("exams").select("*").eq("customer_id", customerId).order("uploaded_at", { ascending: false });
    setExams(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleSave = async () => {
    if (!form.name || !form.file_url) { toast({ title: "Nome e URL são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    await supabase.from("exams").insert({
      coach_id: coachId, customer_id: customerId,
      name: form.name, file_url: form.file_url,
      exam_date: form.exam_date || null,
    });
    toast({ title: "Exame adicionado!" });
    setShowForm(false);
    setForm({ name: "", file_url: "", exam_date: "" });
    await load();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("exams").delete().eq("id", id);
    setExams((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Exame removido" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Exames</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5" /> Adicionar exame
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Nome do exame *</label>
            <Input className="mt-1" placeholder="Ex: Hemograma completo" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground flex items-center gap-1"><Link className="w-3 h-3" /> URL do arquivo *</label>
            <Input className="mt-1" placeholder="https://drive.google.com/..." value={form.file_url} onChange={(e) => setForm((p) => ({ ...p, file_url: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Cole o link do Google Drive, Dropbox ou qualquer URL pública</p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Data do exame</label>
            <Input type="date" className="mt-1 max-w-[180px]" value={form.exam_date} onChange={(e) => setForm((p) => ({ ...p, exam_date: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FlaskConical className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhum exame cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exams.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-border p-3 flex items-center gap-3">
              <FlaskConical className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ex.name}</p>
                {ex.exam_date && <p className="text-xs text-muted-foreground">{format(parseISO(ex.exam_date), "dd/MM/yyyy")}</p>}
              </div>
              <a href={ex.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Link className="w-3 h-3" /> Abrir
              </a>
              <button onClick={() => handleDelete(ex.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Fotos ───────────────────────────────────────────────────────────────

const PHOTO_TYPES = [
  { value: "front", label: "Frente" }, { value: "back", label: "Costas" },
  { value: "side_left", label: "Lado Esq." }, { value: "side_right", label: "Lado Dir." },
];

const PhotosTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("front");
  const [takenAt, setTakenAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("progress_photos").select("*").eq("customer_id", customerId).order("taken_at", { ascending: false });
    setPhotos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!file) { toast({ title: "Selecione uma foto", variant: "destructive" }); return; }
    setSaving(true);
    const ext = file.name.split(".").pop();
    const path = `${coachId}/${customerId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("progress-photos").upload(path, file, { upsert: false });
    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: uploadError.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("progress-photos").getPublicUrl(path);
    await supabase.from("progress_photos").insert({
      coach_id: coachId, customer_id: customerId,
      photo_url: publicUrl, type, taken_at: takenAt,
    });
    toast({ title: "Foto adicionada!" });
    setShowForm(false);
    setFile(null);
    setPreview(null);
    setType("front");
    setTakenAt(format(new Date(), "yyyy-MM-dd"));
    await load();
    setSaving(false);
  };

  const handleDelete = async (id: string, photoUrl: string) => {
    // Remove from storage if it's a Supabase Storage URL
    if (photoUrl.includes("progress-photos")) {
      const pathMatch = photoUrl.match(/progress-photos\/(.+)$/);
      if (pathMatch) await supabase.storage.from("progress-photos").remove([pathMatch[1]]);
    }
    await supabase.from("progress_photos").delete().eq("id", id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Foto removida" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Fotos de Progresso</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5" /> Adicionar foto
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> Foto *</label>
            <label className="mt-1 flex items-center gap-3 cursor-pointer">
              <div className="flex-1 h-9 rounded-lg border border-input bg-background px-3 flex items-center gap-2 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                <Camera className="w-4 h-4 shrink-0" />
                <span className="truncate">{file ? file.name : "Clique para selecionar imagem..."}</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {preview && (
              <div className="mt-2 relative w-24 h-32 rounded-lg overflow-hidden border border-border">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Ângulo</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                value={type} onChange={(e) => setType(e.target.value)}>
                {PHOTO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Data</label>
              <Input type="date" className="mt-1" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Enviando...</> : "Salvar"}</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setFile(null); setPreview(null); }}>Cancelar</Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Requer bucket <code>progress-photos</code> público no Supabase Storage.</p>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Camera className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhuma foto de progresso</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border">
              <img src={photo.photo_url} alt={photo.type} className="w-full aspect-[3/4] object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                  <span className="text-[10px] text-white font-medium">{PHOTO_TYPES.find((t) => t.value === photo.type)?.label}</span>
                  <button onClick={() => handleDelete(photo.id, photo.photo_url)} className="p-1 rounded bg-destructive/80 text-white hover:bg-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center py-1 bg-muted/30">{format(parseISO(photo.taken_at), "dd/MM/yy")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Notas ───────────────────────────────────────────────────────────────

const NotesTab = ({ customerId, coachId }: { customerId: string; coachId: string }) => {
  const { fetchNotes, createNote, updateNote, deleteNote } = useCustomerStore();
  const { toast } = useToast();
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [pinNew, setPinNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); setNotes(await fetchNotes(customerId)); setLoading(false); };
  useEffect(() => { load(); }, [customerId]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    await createNote(coachId, customerId, newContent.trim(), pinNew);
    setNewContent(""); setPinNew(false);
    await load();
    toast({ title: "Nota adicionada!" });
    setSaving(false);
  };

  const handleDelete = async (id: string) => { await deleteNote(id); await load(); toast({ title: "Nota excluída" }); };
  const handleTogglePin = async (note: CustomerNote) => { await updateNote(note.id, note.content, !note.is_pinned); await load(); };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Nova Nota</h3>
        <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={3} placeholder="Escreva uma observação sobre o aluno..." value={newContent} onChange={(e) => setNewContent(e.target.value)} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={pinNew} onChange={(e) => setPinNew(e.target.checked)} className="rounded" />
            <Pin className="w-3.5 h-3.5" /> Fixar nota
          </label>
          <Button size="sm" onClick={handleAdd} disabled={saving || !newContent.trim()}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />} Adicionar
          </Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <StickyNote className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">Nenhuma nota ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className={cn("rounded-xl border p-4", note.is_pinned ? "border-primary/40 bg-primary/5" : "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleTogglePin(note)} className={cn("p-1 rounded transition-colors", note.is_pinned ? "text-primary" : "text-muted-foreground hover:text-primary")} title={note.is_pinned ? "Desafixar" : "Fixar"}>
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {format(parseISO(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {note.is_pinned && <span className="ml-2 text-primary font-medium">• Fixada</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Feedbacks ───────────────────────────────────────────────────────────

const FeedbacksTab = ({ customerId }: { customerId: string }) => {
  const { fetchFeedbacksByCustomer, markFeedbackSeen } = useCustomerStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFeedbacksByCustomer(customerId).then((data) => { setFeedbacks(data); setLoading(false); }); }, [customerId]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (feedbacks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <MessageCircle className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">Nenhum feedback ainda</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {feedbacks.map((fb) => {
        const cfg = STATUS_CONFIG[fb.status] ?? STATUS_CONFIG.pending;
        return (
          <div key={fb.id} className="rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
                {fb.has_photos && <span className="text-[10px] text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full">Com fotos</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fb.answered_at ? `Respondido em ${format(parseISO(fb.answered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : fb.scheduled_for ? `Previsto para ${format(parseISO(fb.scheduled_for), "dd/MM/yyyy", { locale: ptBR })}`
                  : `Criado em ${format(parseISO(fb.created_at), "dd/MM/yyyy", { locale: ptBR })}`}
              </p>
            </div>
            {(fb.status === "answered" || fb.status === "partial") && (
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={async () => { await markFeedbackSeen(fb.id); setFeedbacks((prev) => prev.map((f) => f.id === fb.id ? { ...f, status: "seen" as const } : f)); }}>
                Marcar visto
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCustomerById, fetchConsultoriaByCustomer } = useCustomerStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("progress");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [consultoria, setConsultoria] = useState<Consultoria | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [c, cons] = await Promise.all([fetchCustomerById(id), fetchConsultoriaByCustomer(id, user.id)]);
      setCustomer(c);
      setConsultoria(cons);
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando aluno...
    </div>
  );

  if (!customer) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <p className="text-sm font-medium">Aluno não encontrado</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(-1)}>Voltar</Button>
    </div>
  );

  const initials = customer.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const age = customer.birthdate ? differenceInYears(new Date(), parseISO(customer.birthdate)) : null;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <div className="px-6 pt-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        <div className="px-6 pb-0 mt-4">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-background shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                {customer.app_installed && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">App instalado</span>}
                {consultoria?.plans && <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">{consultoria.plans.name}</span>}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {customer.height_cm && <span>{customer.height_cm} cm</span>}
                {age && <span>{age} anos</span>}
                {customer.gender && <span className="capitalize">{customer.gender}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 pb-2 shrink-0">
              {[
                { icon: Check, title: "Marcar entregue", action: () => toast({ title: "Marcado como entregue!" }) },
                { icon: Mail, title: "Enviar e-mail", action: () => customer.email && (window.location.href = `mailto:${customer.email}`) },
                { icon: CalendarDays, title: "Agendar", action: () => navigate("/schedule") },
                { icon: MessageSquare, title: "WhatsApp", action: () => customer.whatsapp && window.open(`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`) },
              ].map(({ icon: Icon, title, action }) => (
                <button key={title} title={title} onClick={action} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 px-6 border-b border-border">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                  activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {user && id && (
          <>
            {activeTab === "progress"    && <ProgressTab    customerId={id} coachId={user.id} />}
            {activeTab === "scheduling"  && <SchedulingTab  customerId={id} coachId={user.id} />}
            {activeTab === "anamnesis"   && <AnamnesisTab   customerId={id} coachId={user.id} />}
            {activeTab === "evaluations" && <EvaluationsTab customerId={id} coachId={user.id} />}
            {activeTab === "diets"       && <DietsTab       customerId={id} coachId={user.id} />}
            {activeTab === "workouts"    && <WorkoutsTab    customerId={id} coachId={user.id} />}
            {activeTab === "cardio"      && <CardioTab      customerId={id} coachId={user.id} />}
            {activeTab === "exams"       && <ExamsTab       customerId={id} coachId={user.id} />}
            {activeTab === "feedbacks"   && <FeedbacksTab   customerId={id} />}
            {activeTab === "photos"      && <PhotosTab      customerId={id} coachId={user.id} />}
            {activeTab === "notes"       && <NotesTab       customerId={id} coachId={user.id} />}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerProfilePage;
