import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Eye, EyeOff, TrendingUp, TrendingDown, Minus,
  Scale, Utensils, Droplets, Dumbbell, Activity, MessageSquare,
  Star, ArrowLeftRight, Image as ImageIcon, ExternalLink,
  Brain, Moon, Zap, HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RatingAnswer { stars: number; percent: number }

type FeedbackAnswers = {
  weight_kg?: string;
  plano_alimentar?: RatingAnswer;
  plano_alimentar_motivo?: string;
  hidratacao?: RatingAnswer;
  hidratacao_motivo?: string;
  plano_treino?: RatingAnswer;
  plano_treino_motivo?: string;
  exercicio_aerobico?: RatingAnswer;
  exercicio_aerobico_motivo?: string;
  desempenho_treino?: RatingAnswer;
  recuperacao_treino?: RatingAnswer;
  disposicao_dia?: RatingAnswer;
  qualidade_sono?: RatingAnswer;
  obs_geral?: string;
};

interface FeedbackRecord {
  id: string;
  customer_id: string;
  status: string;
  answered_at?: string;
  weight_kg?: number;
  answers?: FeedbackAnswers;
}

interface Appointment {
  id: string;
  customer_id: string;
  status: string;
  scheduled_at: string;
  notes?: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  avatar_url?: string;
}

interface WeightLog {
  id: string;
  weight_kg: number;
  recorded_at: string;
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

const StarRating = ({ stars }: { stars: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <svg
        key={i}
        className={cn("w-4 h-4", i <= stars ? "text-yellow-400" : "text-muted-foreground/20")}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 22 20"
      >
        <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
      </svg>
    ))}
  </div>
);

const RatingCell = ({ rating }: { rating?: RatingAnswer }) => {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-sm font-semibold text-foreground">{rating.percent}%</span>
      <StarRating stars={rating.stars} />
    </div>
  );
};

const DeltaPercent = ({ current, previous }: { current?: RatingAnswer; previous?: RatingAnswer }) => {
  if (!current || !previous) return null;
  const diff = current.percent - previous.percent;
  if (diff === 0) return null;
  const pos = diff > 0;
  return (
    <span className={cn(
      "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full mr-1",
      pos ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
    )}>
      {pos ? "+" : ""}{diff}%
    </span>
  );
};

const DeltaWeight = ({ current, previous }: { current?: number; previous?: number }) => {
  if (!current || !previous) return null;
  const diff = parseFloat((current - previous).toFixed(1));
  if (diff === 0) return null;
  const pos = diff > 0;
  return (
    <span className={cn(
      "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full mr-1",
      pos ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
    )}>
      {pos ? "+" : ""}{diff} Kg
    </span>
  );
};

// Linhas da tabela de métricas
const METRIC_ROWS = [
  { id: "plano_alimentar",    label: "Plano alimentar",       icon: Utensils,   motivoId: "plano_alimentar_motivo" },
  { id: "hidratacao",         label: "Hidratação",             icon: Droplets,   motivoId: "hidratacao_motivo" },
  { id: "plano_treino",       label: "Plano de treino",        icon: Dumbbell,   motivoId: "plano_treino_motivo" },
  { id: "exercicio_aerobico", label: "Exercício aeróbico",     icon: Activity,   motivoId: "exercicio_aerobico_motivo" },
  { id: "desempenho_treino",  label: "Desempenho no treino",   icon: Zap,        motivoId: null },
  { id: "recuperacao_treino", label: "Recuperação do treino",  icon: HeartPulse, motivoId: null },
  { id: "disposicao_dia",     label: "Disposição no dia a dia",icon: Brain,      motivoId: null },
  { id: "qualidade_sono",     label: "Qualidade do sono",      icon: Moon,       motivoId: null },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

const FeedbackDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [apt, setApt] = useState<Appointment | null>(null);
  const [fbRecord, setFbRecord] = useState<FeedbackRecord | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [previousFeedbacks, setPreviousFeedbacks] = useState<{ id: string; scheduled_at: string; fbRecord?: FeedbackRecord }[]>([]);
  const [selectedPrev, setSelectedPrev] = useState<string>("");
  const [prevFb, setPrevFb] = useState<FeedbackRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Photo comparison
  const [leftDate, setLeftDate] = useState("");
  const [rightDate, setRightDate] = useState("");
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    load();
  }, [id, user]);

  const load = async () => {
    setLoading(true);

    // Busca appointment
    const { data: aptData } = await supabase
      .from("appointments")
      .select("id, customer_id, status, scheduled_at, notes")
      .eq("id", id)
      .eq("coach_id", user!.id)
      .maybeSingle();

    if (!aptData) { setLoading(false); return; }
    setApt(aptData);

    // Busca customer + consultoria
    const [{ data: cust }, { data: cons }] = await Promise.all([
      supabase.from("customers").select("id, name, avatar_url").eq("id", aptData.customer_id).maybeSingle(),
      supabase.from("consultorias").select("plans(name)").eq("customer_id", aptData.customer_id).eq("coach_id", user!.id).eq("status", "active").limit(1).maybeSingle(),
    ]);
    setCustomer(cust ?? null);
    setPlanName((cons as any)?.plans?.name);

    // Weight logs
    const { data: wLogs } = await supabase
      .from("weight_logs")
      .select("id, weight_kg, recorded_at")
      .eq("customer_id", aptData.customer_id)
      .order("recorded_at", { ascending: false });
    setWeightLogs(wLogs ?? []);

    // Busca registro de feedback (da tabela feedbacks) mais próximo da data do appointment
    const aptDate = new Date(aptData.scheduled_at);
    const from = new Date(aptDate); from.setDate(from.getDate() - 3);
    const to   = new Date(aptDate); to.setDate(to.getDate() + 3);

    const { data: fbData } = await supabase
      .from("feedbacks")
      .select("id, customer_id, status, answered_at, weight_kg, answers")
      .eq("customer_id", aptData.customer_id)
      .eq("coach_id", user!.id)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setFbRecord(fbData ?? null);

    // Feedbacks anteriores (appointments) para comparação
    const { data: prevApts } = await supabase
      .from("appointments")
      .select("id, scheduled_at")
      .eq("customer_id", aptData.customer_id)
      .eq("coach_id", user!.id)
      .eq("type", "feedback")
      .neq("id", id)
      .order("scheduled_at", { ascending: false })
      .limit(10);

    // Para cada anterior, tenta buscar o feedback respondido
    const prevList = await Promise.all((prevApts ?? []).map(async (p) => {
      const pDate = new Date(p.scheduled_at);
      const pFrom = new Date(pDate); pFrom.setDate(pFrom.getDate() - 3);
      const pTo   = new Date(pDate); pTo.setDate(pTo.getDate() + 3);
      const { data: pFb } = await supabase
        .from("feedbacks")
        .select("id, customer_id, status, answered_at, weight_kg, answers")
        .eq("customer_id", aptData.customer_id)
        .eq("coach_id", user!.id)
        .gte("created_at", pFrom.toISOString())
        .lte("created_at", pTo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { id: p.id, scheduled_at: p.scheduled_at, fbRecord: pFb ?? undefined };
    }));

    setPreviousFeedbacks(prevList);
    setLoading(false);
  };

  const handleSelectPrev = (val: string) => {
    setSelectedPrev(val);
    const found = previousFeedbacks.find(p => p.id === val);
    setPrevFb(found?.fbRecord ?? null);
  };

  const markUnread = async () => {
    await supabase.from("appointments").update({ status: "scheduled" }).eq("id", id);
    navigate("/customers/feedbacks");
  };

  const availableDates = [apt?.scheduled_at, ...previousFeedbacks.map(p => p.scheduled_at)]
    .filter(Boolean)
    .map(d => d!.split("T")[0])
    .filter((v, i, a) => a.indexOf(v) === i);

  const currentAnswers = fbRecord?.answers as FeedbackAnswers | undefined;
  const prevAnswers = prevFb?.answers as FeedbackAnswers | undefined;

  // Peso atual: do feedback respondido ou do weight_log mais próximo
  const currentWeight = fbRecord?.weight_kg
    ?? (apt ? weightLogs.find(w => new Date(w.recorded_at).getTime() <= new Date(apt.scheduled_at).getTime() + 7 * 86400000)?.weight_kg : undefined);
  const prevWeight = prevFb?.weight_kg;

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando feedback...</p>
      </div>
    </div>
  );

  if (!apt) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <MessageSquare className="w-12 h-12 opacity-30" />
      <p className="text-sm">Feedback não encontrado</p>
      <Button variant="outline" size="sm" onClick={() => navigate("/customers/feedbacks")}>Voltar</Button>
    </div>
  );

  const aptDate = apt.scheduled_at ? parseISO(apt.scheduled_at) : null;
  const prevAptDate = selectedPrev ? parseISO(previousFeedbacks.find(p => p.id === selectedPrev)?.scheduled_at ?? "") : null;

  const hasPrev = !!selectedPrev;

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
            {customer && <p className="text-sm text-muted-foreground">Feedback de {customer.name}</p>}
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
          {customer && (
            <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0", getAvatarColor(customer.name))}>
                {avatarInitials(customer.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{customer.name}</p>
                {planName && <p className="text-sm text-muted-foreground">{planName}</p>}
              </div>
              {aptDate && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Data do feedback</p>
                  <p className="text-sm font-medium text-foreground">{format(aptDate, "dd/MM/yyyy", { locale: ptBR })}</p>
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
                <label className="block text-xs font-medium text-muted-foreground mb-2">← Lado esquerdo</label>
                <Select value={leftDate} onValueChange={setLeftDate}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma data" /></SelectTrigger>
                  <SelectContent>
                    {availableDates.map(d => (
                      <SelectItem key={d} value={d}>{format(parseISO(d), "dd/MM/yyyy", { locale: ptBR })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Lado direito →</label>
                <Select value={rightDate} onValueChange={setRightDate}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma data" /></SelectTrigger>
                  <SelectContent>
                    {availableDates.map(d => (
                      <SelectItem key={d} value={d}>{format(parseISO(d), "dd/MM/yyyy", { locale: ptBR })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 gap-2" disabled={!leftDate || !rightDate} onClick={() => setShowComparison(true)}>
                <ArrowLeftRight className="w-4 h-4" /> Visualizar Comparativo
              </Button>
              {showComparison && (
                <Button variant="outline" className="gap-2" onClick={() => setShowComparison(false)}>
                  <EyeOff className="w-4 h-4" /> Ocultar
                </Button>
              )}
            </div>
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

          {/* Tabela de comparação */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40"></th>
                  {hasPrev && prevAptDate && (
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {format(prevAptDate, "dd/MM/yyyy", { locale: ptBR })}
                    </th>
                  )}
                  <th className="px-5 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider">
                    {aptDate ? format(aptDate, "dd/MM/yyyy", { locale: ptBR }) : "Atual"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">

                {/* Data do envio */}
                <tr className="bg-muted/10">
                  <td className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data do envio</td>
                  {hasPrev && (
                    <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                      {prevAptDate ? format(prevAptDate, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </td>
                  )}
                  <td className="px-5 py-3 text-right text-sm text-foreground font-medium">
                    {aptDate ? format(aptDate, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </td>
                </tr>

                {/* Peso */}
                <tr className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Scale className="w-4 h-4" />
                      <span className="text-sm font-medium">Peso</span>
                    </div>
                  </td>
                  {hasPrev && (
                    <td className="px-5 py-4 text-right text-sm text-muted-foreground">
                      {prevWeight ? `${prevWeight} Kg` : "—"}
                    </td>
                  )}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPrev && <DeltaWeight current={currentWeight} previous={prevWeight} />}
                      <span className="text-sm font-semibold text-foreground">
                        {currentWeight ? `${currentWeight} Kg` : "—"}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Métricas com rating */}
                {METRIC_ROWS.map(({ id: mId, label, icon: Icon, motivoId }) => {
                  const cur = currentAnswers?.[mId as keyof FeedbackAnswers] as RatingAnswer | undefined;
                  const prv = prevAnswers?.[mId as keyof FeedbackAnswers] as RatingAnswer | undefined;
                  const curMotivo = motivoId ? (currentAnswers?.[motivoId as keyof FeedbackAnswers] as string | undefined) : undefined;
                  const prvMotivo = motivoId ? (prevAnswers?.[motivoId as keyof FeedbackAnswers] as string | undefined) : undefined;

                  return (
                    <>
                      <tr key={mId} className="hover:bg-muted/20">
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-medium leading-tight">{label}</span>
                          </div>
                        </td>
                        {hasPrev && (
                          <td className="px-5 py-4 text-right align-top">
                            <RatingCell rating={prv} />
                          </td>
                        )}
                        <td className="px-5 py-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            {hasPrev && <DeltaPercent current={cur} previous={prv} />}
                            <RatingCell rating={cur} />
                          </div>
                        </td>
                      </tr>
                      {motivoId && (curMotivo || prvMotivo) && (
                        <tr key={`${mId}_motivo`} className="hover:bg-muted/10 bg-muted/5">
                          <td className="px-5 py-3 pl-10 text-xs text-muted-foreground font-medium">Motivo</td>
                          {hasPrev && (
                            <td className="px-5 py-3 text-right text-xs text-muted-foreground leading-relaxed">
                              {prvMotivo ?? "—"}
                            </td>
                          )}
                          <td className="px-5 py-3 text-right text-xs text-foreground leading-relaxed">
                            {curMotivo ?? "—"}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}

                {/* Observação geral */}
                {(currentAnswers?.obs_geral || apt.notes) && (
                  <tr className="hover:bg-muted/20">
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">Observação</span>
                      </div>
                    </td>
                    {hasPrev && (
                      <td className="px-5 py-4 text-right text-xs text-muted-foreground leading-relaxed align-top">
                        {(prevAnswers?.obs_geral) ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-4 text-right text-xs text-foreground leading-relaxed align-top">
                      {currentAnswers?.obs_geral ?? apt.notes ?? "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Rodapé — link para página do aluno */}
            {customer && (
              <div className="px-5 py-3 border-t border-border flex justify-end">
                <button
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  Página do aluno
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default FeedbackDetailPage;
