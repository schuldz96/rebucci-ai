import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, UserCheck, CalendarClock, AlertTriangle, MessageCircleWarning,
  Loader2, TrendingUp, DollarSign, Clock, CheckCircle2, ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DashStats {
  totalAtivos: number;
  vencendo7: number;
  vencendo30: number;
  feedbacksPendentes: number;
  feedbacksRespondidos: number;
  receitaMes: number;
  aReceber: number;
}

interface RecentFeedback {
  id: string;
  customerName: string;
  status: string;
  answeredAt: string | null;
  scheduledFor: string | null;
  hasPhotos: boolean;
  customerId: string;
}

interface ExpiringConsultoria {
  id: string;
  customerId: string;
  customerName: string;
  endDate: string;
  planName: string | null;
  daysLeft: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  pending: "text-blue-400 bg-blue-400/10",
  partial: "text-yellow-400 bg-yellow-400/10",
  answered: "text-green-400 bg-green-400/10",
  seen: "text-muted-foreground bg-muted",
  expired: "text-destructive bg-destructive/10",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  answered: "Respondido",
  seen: "Visto",
  expired: "Expirado",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [recentFeedbacks, setRecentFeedbacks] = useState<RecentFeedback[]>([]);
  const [expiring, setExpiring] = useState<ExpiringConsultoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load(user.id);
  }, [user]);

  const load = async (coachId: string) => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const in7 = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");
    const in30 = format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd");
    const firstOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

    const [
      activesRes,
      exp7Res,
      exp30Res,
      feedbacksRes,
      revenueRes,
      pendingRevenueRes,
      recentFbRes,
      expiringRes,
    ] = await Promise.all([
      // Consultorias ativas
      supabase.from("consultorias").select("id", { count: "exact", head: true })
        .eq("coach_id", coachId).eq("status", "active"),

      // Vencendo em 7 dias
      supabase.from("consultorias").select("id", { count: "exact", head: true })
        .eq("coach_id", coachId).eq("status", "active")
        .gte("end_date", today).lte("end_date", in7),

      // Vencendo em 30 dias
      supabase.from("consultorias").select("id", { count: "exact", head: true })
        .eq("coach_id", coachId).eq("status", "active")
        .gte("end_date", today).lte("end_date", in30),

      // Feedbacks pendentes/respondidos
      supabase.from("feedbacks").select("status", { count: "exact" })
        .eq("coach_id", coachId).in("status", ["pending", "partial", "answered"]),

      // Receita do mês
      supabase.from("transactions").select("amount")
        .eq("coach_id", coachId).eq("type", "income")
        .gte("date", firstOfMonth),

      // A receber (consultorias ativas com pagamento pendente)
      supabase.from("consultorias").select("value")
        .eq("coach_id", coachId).eq("status", "active").eq("payment_status", "pending"),

      // Feedbacks recentes (últimos 10)
      supabase.from("feedbacks")
        .select("id, status, answered_at, scheduled_for, has_photos, customer_id, customers(name)")
        .eq("coach_id", coachId)
        .in("status", ["pending", "partial", "answered"])
        .order("created_at", { ascending: false })
        .limit(8),

      // Consultorias vencendo em breve
      supabase.from("consultorias")
        .select("id, customer_id, end_date, customers(name), plans(name)")
        .eq("coach_id", coachId).eq("status", "active")
        .gte("end_date", today).lte("end_date", in30)
        .order("end_date", { ascending: true })
        .limit(5),
    ]);

    // Feedbacks por status
    const allFb = feedbacksRes.data ?? [];
    const pending = allFb.filter((f) => f.status === "pending" || f.status === "partial").length;
    const answered = allFb.filter((f) => f.status === "answered").length;

    // Receita
    const receita = (revenueRes.data ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const aReceber = (pendingRevenueRes.data ?? []).reduce((sum, c) => sum + (c.value ?? 0), 0);

    setStats({
      totalAtivos: activesRes.count ?? 0,
      vencendo7: exp7Res.count ?? 0,
      vencendo30: exp30Res.count ?? 0,
      feedbacksPendentes: pending,
      feedbacksRespondidos: answered,
      receitaMes: receita,
      aReceber,
    });

    setRecentFeedbacks(
      (recentFbRes.data ?? []).map((f) => ({
        id: f.id,
        customerName: (f.customers as any)?.name ?? "—",
        status: f.status,
        answeredAt: f.answered_at,
        scheduledFor: f.scheduled_for,
        hasPhotos: f.has_photos,
        customerId: f.customer_id,
      }))
    );

    setExpiring(
      (expiringRes.data ?? []).map((c) => ({
        id: c.id,
        customerId: c.customer_id,
        customerName: (c.customers as any)?.name ?? "—",
        endDate: c.end_date,
        planName: (c.plans as any)?.name ?? null,
        daysLeft: differenceInDays(parseISO(c.end_date), new Date()),
      }))
    );

    setLoading(false);
  };

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const statCards = stats
    ? [
        {
          label: "Alunos Ativos",
          value: stats.totalAtivos.toString(),
          icon: Users,
          color: "text-primary",
          bg: "bg-primary/10",
          onClick: () => navigate("/customers/actives"),
        },
        {
          label: "Vencendo em 7 dias",
          value: stats.vencendo7.toString(),
          icon: CalendarClock,
          color: "text-orange-400",
          bg: "bg-orange-400/10",
          onClick: () => navigate("/customers/actives"),
        },
        {
          label: "Vencendo em 30 dias",
          value: stats.vencendo30.toString(),
          icon: AlertTriangle,
          color: "text-yellow-400",
          bg: "bg-yellow-400/10",
          onClick: () => navigate("/customers/actives"),
        },
        {
          label: "Feedbacks Pendentes",
          value: stats.feedbacksPendentes.toString(),
          icon: MessageCircleWarning,
          color: "text-blue-400",
          bg: "bg-blue-400/10",
          onClick: () => navigate("/customers/feedbacks"),
        },
        {
          label: "Feedbacks Respondidos",
          value: stats.feedbacksRespondidos.toString(),
          icon: CheckCircle2,
          color: "text-green-400",
          bg: "bg-green-400/10",
          onClick: () => navigate("/customers/feedbacks"),
        },
        {
          label: "Receita do Mês",
          value: fmtBRL(stats.receitaMes),
          icon: TrendingUp,
          color: "text-emerald-400",
          bg: "bg-emerald-400/10",
          onClick: () => navigate("/finance"),
        },
        {
          label: "A Receber",
          value: fmtBRL(stats.aReceber),
          icon: DollarSign,
          color: "text-violet-400",
          bg: "bg-violet-400/10",
          onClick: () => navigate("/finance"),
        },
      ]
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do seu coaching</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {statCards.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={s.onClick}
                  className="surface-elevated p-4 text-left hover:border-primary/40 transition-colors group"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Feedbacks recentes ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="surface-elevated p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <MessageCircleWarning className="w-4 h-4 text-primary" />
                    Feedbacks Recentes
                  </h2>
                  <button
                    onClick={() => navigate("/customers/feedbacks")}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    Ver todos <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {recentFeedbacks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum feedback pendente.</p>
                ) : (
                  <div className="space-y-1">
                    {recentFeedbacks.map((fb) => (
                      <button
                        key={fb.id}
                        onClick={() => navigate(`/customers/${fb.customerId}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {fb.customerName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{fb.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {fb.answeredAt
                              ? `Respondido ${format(parseISO(fb.answeredAt), "dd/MM HH:mm", { locale: ptBR })}`
                              : fb.scheduledFor
                              ? `Previsto ${format(parseISO(fb.scheduledFor), "dd/MM", { locale: ptBR })}`
                              : "Aguardando"}
                          </p>
                        </div>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", STATUS_COLOR[fb.status])}>
                          {STATUS_LABEL[fb.status]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* ── Vencendo em breve ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="surface-elevated p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Vencendo em Breve
                  </h2>
                  <button
                    onClick={() => navigate("/customers/actives")}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    Ver todos <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {expiring.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum aluno vencendo nos próximos 30 dias.</p>
                ) : (
                  <div className="space-y-1">
                    {expiring.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/customers/${c.customerId}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-400/15 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">
                          {c.customerName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.customerName}</p>
                          <p className="text-xs text-muted-foreground">{c.planName ?? "Sem plano"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-medium text-foreground">{format(parseISO(c.endDate), "dd/MM/yyyy")}</p>
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            c.daysLeft <= 7 ? "text-orange-400 bg-orange-400/10" : "text-yellow-400 bg-yellow-400/10"
                          )}>
                            {c.daysLeft === 0 ? "Hoje" : c.daysLeft === 1 ? "Amanhã" : `${c.daysLeft}d`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
