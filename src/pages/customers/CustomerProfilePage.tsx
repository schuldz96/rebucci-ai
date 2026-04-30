import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Calendar, ClipboardList, Star, Salad, Dumbbell,
  Activity, FlaskConical, MessageCircle, Camera, StickyNote,
  Check, Eye, Mail, CalendarDays, MessageSquare, Pin, Loader2,
  Plus, Trash2, Weight, Droplets, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore, Customer, Consultoria, CustomerNote, WeightLog, Feedback } from "@/store/customerStore";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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
  pending:  { label: "Pendente",   color: "text-blue-400 bg-blue-400/10" },
  partial:  { label: "Parcial",    color: "text-yellow-400 bg-yellow-400/10" },
  answered: { label: "Respondido", color: "text-green-400 bg-green-400/10" },
  seen:     { label: "Visto",      color: "text-muted-foreground bg-muted" },
  expired:  { label: "Expirado",   color: "text-destructive bg-destructive/10" },
};

// ─── Tab: Progresso ───────────────────────────────────────────────────────────

const ProgressTab = ({ customerId }: { customerId: string }) => {
  const { fetchWeightLogs, addWeightLog } = useCustomerStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWeightLogs(customerId).then(setLogs);
  }, [customerId]);

  const handleAddWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w || !user) return;
    setSaving(true);
    const ok = await addWeightLog(user.id, customerId, w, format(new Date(), "yyyy-MM-dd"));
    if (ok) {
      const updated = await fetchWeightLogs(customerId);
      setLogs(updated);
      setNewWeight("");
      toast({ title: "Peso registrado!" });
    }
    setSaving(false);
  };

  const lastWeight = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;
  const firstWeight = logs.length > 0 ? logs[0].weight_kg : null;
  const diff = lastWeight && firstWeight ? (lastWeight - firstWeight).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Registrar peso */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Weight className="w-4 h-4 text-primary" />
          Evolução de Peso
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
          <Input
            type="number"
            step="0.1"
            placeholder="Ex: 75.5"
            className="max-w-[140px]"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">kg</span>
          <Button size="sm" onClick={handleAddWeight} disabled={saving || !newWeight}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Registrar
          </Button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Hidratação", icon: Droplets, text: "Sem dados" },
          { label: "% Gordura Corporal", icon: Percent, text: "Sem dados" },
          { label: "Avaliações", icon: Star, text: "Nenhuma avaliação" },
        ].map(({ label, icon: Icon, text }) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <h4 className="font-medium text-sm text-foreground mb-1 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-primary" />
              {label}
            </h4>
            <p className="text-xs text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tab: Notas ───────────────────────────────────────────────────────────────

const NotesTab = ({ customerId }: { customerId: string }) => {
  const { fetchNotes, createNote, updateNote, deleteNote } = useCustomerStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [pinNew, setPinNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchNotes(customerId);
    setNotes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleAdd = async () => {
    if (!newContent.trim() || !user) return;
    setSaving(true);
    await createNote(user.id, customerId, newContent.trim(), pinNew);
    setNewContent(""); setPinNew(false);
    await load();
    toast({ title: "Nota adicionada!" });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    await load();
    toast({ title: "Nota excluída" });
  };

  const handleTogglePin = async (note: CustomerNote) => {
    await updateNote(note.id, note.content, !note.is_pinned);
    await load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Nova nota */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Nova Nota</h3>
        <textarea
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={3}
          placeholder="Escreva uma observação sobre o aluno..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={pinNew} onChange={(e) => setPinNew(e.target.checked)} className="rounded" />
            <Pin className="w-3.5 h-3.5" />
            Fixar nota
          </label>
          <Button size="sm" onClick={handleAdd} disabled={saving || !newContent.trim()}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
            Adicionar
          </Button>
        </div>
      </div>

      {/* Lista de notas */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <StickyNote className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhuma nota ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className={cn("rounded-xl border p-4", note.is_pinned ? "border-primary/40 bg-primary/5" : "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTogglePin(note)}
                    className={cn("p-1 rounded transition-colors", note.is_pinned ? "text-primary" : "text-muted-foreground hover:text-primary")}
                    title={note.is_pinned ? "Desafixar" : "Fixar"}
                  >
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

  useEffect(() => {
    fetchFeedbacksByCustomer(customerId).then((data) => {
      setFeedbacks(data);
      setLoading(false);
    });
  }, [customerId]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (feedbacks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
      <p className="text-sm">Nenhum feedback ainda</p>
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
                {fb.answered_at
                  ? `Respondido em ${format(parseISO(fb.answered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : fb.scheduled_for
                  ? `Previsto para ${format(parseISO(fb.scheduled_for), "dd/MM/yyyy", { locale: ptBR })}`
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

// ─── Placeholder Tab ──────────────────────────────────────────────────────────

const PlaceholderTab = ({ tab }: { tab: typeof TABS[0] }) => (
  <div className="flex items-center justify-center h-48 text-muted-foreground">
    <div className="text-center">
      <tab.icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">{tab.label}</p>
      <p className="text-xs mt-1 opacity-60">Conteúdo em implementação</p>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCustomerById, fetchConsultoriaByCustomer } = useCustomerStore();

  const [activeTab, setActiveTab] = useState("progress");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [consultoria, setConsultoria] = useState<Consultoria | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [c, cons] = await Promise.all([
        fetchCustomerById(id),
        fetchConsultoriaByCustomer(id, user.id),
      ]);
      setCustomer(c);
      setConsultoria(cons);
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Carregando aluno...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm font-medium">Aluno não encontrado</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const initials = customer.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const age = customer.birthdate ? differenceInYears(new Date(), parseISO(customer.birthdate)) : null;
  const bmi = customer.height_cm && consultoria
    ? null // peso virá do último WeightLog — simplificado aqui
    : null;

  const BANNER_COLORS = ["from-blue-600 to-blue-800", "from-violet-600 to-violet-800", "from-teal-600 to-teal-800", "from-rose-600 to-rose-800"];
  const bannerColor = BANNER_COLORS[customer.name.charCodeAt(0) % BANNER_COLORS.length];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="px-6 pt-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {/* Banner */}
        <div className={`h-28 bg-gradient-to-r ${bannerColor} relative mx-6 mt-3 rounded-xl`} />

        {/* Info */}
        <div className="px-6 pb-0 -mt-8">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-background shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                {customer.app_installed && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">App instalado</span>
                )}
                {consultoria?.plans && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">{consultoria.plans.name}</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {customer.height_cm && <span>{customer.height_cm} cm</span>}
                {age && <span>{age} anos</span>}
                {customer.gender && <span className="capitalize">{customer.gender}</span>}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1.5 pb-2 shrink-0">
              {[
                { icon: Check, title: "Marcar como entregue", action: () => {} },
                { icon: Eye, title: "Ver formulário do aluno", action: () => {} },
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

        {/* Tabs */}
        <div className="mt-4 px-6 border-b border-border">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "progress" && id && <ProgressTab customerId={id} />}
        {activeTab === "notes" && id && <NotesTab customerId={id} />}
        {activeTab === "feedbacks" && id && <FeedbacksTab customerId={id} />}
        {!["progress", "notes", "feedbacks"].includes(activeTab) && (
          <PlaceholderTab tab={TABS.find((t) => t.id === activeTab)!} />
        )}
      </div>
    </div>
  );
};

export default CustomerProfilePage;
