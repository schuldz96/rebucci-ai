import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Eye, EyeOff, TrendingUp, TrendingDown, Minus,
  Scale, Utensils, Dumbbell, Activity, MessageSquare, Star,
  Calendar, User, ArrowLeftRight, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FeedbackDetail {
  id: string;
  customer_id: string;
  consultoria_id?: string;
  status: string;
  scheduled_at: string;
  notes?: string;
  answers?: Record<string, unknown>;
  customer?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  planName?: string;
  weight?: number;
}

interface WeightLog {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

interface PreviousFeedback {
  id: string;
  scheduled_at: string;
  notes?: string;
  weight?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarColors = [
  "bg-violet-500/30 text-violet-300",
  "bg-blue-500/30 text-blue-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-orange-500/30 text-orange-300",
  "bg-pink-500/30 text-pink-300",
];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];
const avatarInitials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const Delta = ({ current, previous, unit = "" }: { current?: number; previous?: number; unit?: string }) => {
  if (!current || !previous) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  if (diff === 0) return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      <Minus className="w-3 h-3" /> 0{unit}
    </span>
  );
  const pos = diff > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
      pos ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
    )}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? "+" : ""}{diff.toFixed(1)}{unit} ({pos ? "+" : ""}{pct}%)
    </span>
  );
};

const StarRating = ({ value }: { value: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={cn("w-4 h-4", i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
    ))}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const FeedbackDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [previousFeedbacks, setPreviousFeedbacks] = useState<PreviousFeedback[]>([]);
  const [selectedPrev, setSelectedPrev] = useState<string>("");
  const [prevDetail, setPrevDetail] = useState<PreviousFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  // Photo comparison state
  const [leftDate, setLeftDate] = useState("");
  const [rightDate, setRightDate] = useState("");
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    load();
  }, [id, user]);

  const load = async () => {
    setLoading(true);

    // Busca o appointment (feedback)
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, customer_id, status, scheduled_at, notes, coach_id")
      .eq("id", id)
      .eq("coach_id", user!.id)
      .maybeSingle();

    if (!apt) { setLoading(false); return; }

    // Busca customer + consultoria ativa
    const [{ data: customer }, { data: consultoria }] = await Promise.all([
      supabase.from("customers").select("id, name, avatar_url").eq("id", apt.customer_id).maybeSingle(),
      supabase.from("consultorias").select("id, plans(name)").eq("customer_id", apt.customer_id).eq("coach_id", user!.id).eq("status", "active").limit(1).maybeSingle(),
    ]);

    // Weight log mais próximo da data do feedback
    const { data: wLogs } = await supabase
      .from("weight_logs")
      .select("id, weight_kg, recorded_at")
      .eq("customer_id", apt.customer_id)
      .order("recorded_at", { ascending: false });

    // Peso mais próximo antes do feedback
    const feedbackDate = new Date(apt.scheduled_at).getTime();
    const closestWeight = (wLogs ?? []).find(w => new Date(w.recorded_at).getTime() <= feedbackDate + 7 * 86400000);

    setFeedback({
      id: apt.id,
      customer_id: apt.customer_id,
      status: apt.status,
      scheduled_at: apt.scheduled_at,
      notes: apt.notes,
      customer: customer ?? undefined,
      planName: (consultoria as any)?.plans?.name,
      weight: closestWeight?.weight_kg,
    });

    setWeightLogs(wLogs ?? []);

    // Feedbacks anteriores do mesmo customer (para comparação)
    const { data: prevApts } = await supabase
      .from("appointments")
      .select("id, scheduled_at, notes")
      .eq("customer_id", apt.customer_id)
      .eq("coach_id", user!.id)
      .eq("type", "feedback")
      .neq("id", id)
      .order("scheduled_at", { ascending: false })
      .limit(10);

    // Para cada feedback anterior, busca o peso mais próximo
    const prevWithWeight: PreviousFeedback[] = (prevApts ?? []).map(p => {
      const pDate = new Date(p.scheduled_at).getTime();
      const pw = (wLogs ?? []).find(w => new Date(w.recorded_at).getTime() <= pDate + 7 * 86400000);
      return { id: p.id, scheduled_at: p.scheduled_at, notes: p.notes, weight: pw?.weight_kg };
    });

    setPreviousFeedbacks(prevWithWeight);
    setLoading(false);
  };

  const handleSelectPrev = (val: string) => {
    setSelectedPrev(val);
    const found = previousFeedbacks.find(p => p.id === val);
    setPrevDetail(found ?? null);
  };

  const markUnread = async () => {
    await supabase.from("appointments").update({ status: "scheduled" }).eq("id", id);
    navigate("/customers/feedbacks");
  };

  // Datas disponíveis para comparação de fotos — usamos as datas dos feedbacks como referência
  const availableDates = [feedback, ...previousFeedbacks]
    .filter(Boolean)
    .map(f => f!.scheduled_at?.split("T")[0])
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando feedback...</p>
      </div>
    </div>
  );

  if (!feedback) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <MessageSquare className="w-12 h-12 opacity-30" />
      <p className="text-sm">Feedback não encontrado</p>
      <Button variant="outline" size="sm" onClick={() => navigate("/customers/feedbacks")}>Voltar</Button>
    </div>
  );

  const currentWeight = feedback.weight;
  const prevWeight = prevDetail?.weight;
  const feedbackDate = feedback.scheduled_at ? parseISO(feedback.scheduled_at) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link
            to="/customers/feedbacks"
            className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Visualizar</h1>
            {feedback.customer && (
              <p className="text-sm text-muted-foreground">Feedback de {feedback.customer.name}</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={markUnread}>
            <Eye className="w-4 h-4" />
            Marcar como não lido
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Cabeçalho do aluno */}
          {feedback.customer && (
            <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0", getAvatarColor(feedback.customer.name))}>
                {avatarInitials(feedback.customer.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{feedback.customer.name}</p>
                {feedback.planName && <p className="text-sm text-muted-foreground">{feedback.planName}</p>}
              </div>
              {feedbackDate && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Data do feedback</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(feedbackDate, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comparação de fotos */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">
              Selecione as datas para comparar as fotos
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ChevronLeft className="w-3.5 h-3.5 text-primary" /> Lado esquerdo
                </label>
                <Select value={leftDate} onValueChange={setLeftDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map(d => (
                      <SelectItem key={d} value={d}>
                        {format(parseISO(d), "dd/MM/yyyy", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  Lado direito <ChevronLeft className="w-3.5 h-3.5 text-primary rotate-180" />
                </label>
                <Select value={rightDate} onValueChange={setRightDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map(d => (
                      <SelectItem key={d} value={d}>
                        {format(parseISO(d), "dd/MM/yyyy", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2"
                disabled={!leftDate || !rightDate}
                onClick={() => setShowComparison(true)}
              >
                <ArrowLeftRight className="w-4 h-4" />
                Visualizar Comparativo
              </Button>
              {showComparison && (
                <Button variant="outline" className="gap-2" onClick={() => setShowComparison(false)}>
                  <EyeOff className="w-4 h-4" />
                  Ocultar
                </Button>
              )}
            </div>

            {/* Placeholder comparativo de fotos */}
            {showComparison && leftDate && rightDate && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[leftDate, rightDate].map((d, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 aspect-[3/4] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-10 h-10 opacity-30" />
                    <p className="text-xs">{format(parseISO(d), "dd/MM/yyyy", { locale: ptBR })}</p>
                    <p className="text-[10px] opacity-60">Foto não disponível</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparar com feedback anterior */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Comparar com feedback anterior
            </h3>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Selecione uma outra data para comparar:
              </label>
              <Select value={selectedPrev} onValueChange={handleSelectPrev} disabled={previousFeedbacks.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={previousFeedbacks.length === 0 ? "Nenhum feedback anterior" : "Selecione uma data"} />
                </SelectTrigger>
                <SelectContent>
                  {previousFeedbacks.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {format(parseISO(p.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de comparação */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/3"></th>
                  {prevDetail && (
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {format(parseISO(prevDetail.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                    </th>
                  )}
                  <th className="px-5 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                    {feedbackDate ? format(feedbackDate, "dd/MM/yyyy", { locale: ptBR }) : "Atual"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Peso */}
                <tr className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Scale className="w-4 h-4" />
                      <span className="text-sm font-medium">Peso</span>
                    </div>
                  </td>
                  {prevDetail && (
                    <td className="px-5 py-4 text-center text-sm text-muted-foreground">
                      {prevWeight ? `${prevWeight} Kg` : "—"}
                    </td>
                  )}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {prevDetail && <Delta current={currentWeight} previous={prevWeight} unit=" Kg" />}
                      <span className="text-sm font-medium text-foreground">
                        {currentWeight ? `${currentWeight} Kg` : "—"}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Plano alimentar */}
                <tr className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Utensils className="w-4 h-4" />
                      <span className="text-sm font-medium">Plano alimentar</span>
                    </div>
                  </td>
                  {prevDetail && (
                    <td className="px-5 py-4 text-center text-muted-foreground text-xs">—</td>
                  )}
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs text-muted-foreground">Não informado</span>
                  </td>
                </tr>

                {/* Treino */}
                <tr className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Dumbbell className="w-4 h-4" />
                      <span className="text-sm font-medium">Treino</span>
                    </div>
                  </td>
                  {prevDetail && (
                    <td className="px-5 py-4 text-center text-muted-foreground text-xs">—</td>
                  )}
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs text-muted-foreground">Não informado</span>
                  </td>
                </tr>

                {/* Cardio */}
                <tr className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">Cardio</span>
                    </div>
                  </td>
                  {prevDetail && (
                    <td className="px-5 py-4 text-center text-muted-foreground text-xs">—</td>
                  )}
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs text-muted-foreground">Não informado</span>
                  </td>
                </tr>

                {/* Motivo / Observação */}
                <tr className="hover:bg-muted/20">
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">Motivo / Obs.</span>
                    </div>
                  </td>
                  {prevDetail && (
                    <td className="px-5 py-4 text-center text-xs text-muted-foreground align-top">
                      {prevDetail.notes ?? "—"}
                    </td>
                  )}
                  <td className="px-5 py-4 text-center text-sm text-foreground align-top">
                    {feedback.notes ?? <span className="text-muted-foreground text-xs">Não informado</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Histórico de peso */}
          {weightLogs.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Histórico de peso
              </h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {weightLogs.slice(0, 10).map(w => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(w.recorded_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="text-sm font-medium text-foreground">{w.weight_kg} Kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetailPage;
