import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, UserCheck, UserX, CalendarClock, AlertTriangle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  active: number;
  inactive: number;
  expiring30: number;
  expired30: number;
}

interface FeedbackItem {
  id: string;
  name: string;
  phone: string;
  nextFeedback: string;
  daysLeft: number;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fbPage, setFbPage] = useState(0);
  const FB_PAGE_SIZE = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const ago30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      // Busca stats em paralelo
      const [totalRes, activeRes, inactiveRes, expiringRes, expiredRes, feedbackRes] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("status", "inactive"),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("status", "active").gte("end_date", today).lte("end_date", in30),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("status", "inactive").gte("end_date", ago30).lte("end_date", today),
        supabase.from("contacts").select("id, name, phone, next_feedback").not("next_feedback", "is", null).gte("next_feedback", today).order("next_feedback", { ascending: true }).limit(200),
      ]);

      setStats({
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        inactive: inactiveRes.count ?? 0,
        expiring30: expiringRes.count ?? 0,
        expired30: expiredRes.count ?? 0,
      });

      if (feedbackRes.data) {
        setFeedbacks(feedbackRes.data.map((r) => {
          const diff = Math.ceil((new Date(r.next_feedback as string).getTime() - Date.now()) / 86400000);
          return {
            id: r.id as string,
            name: r.name as string,
            phone: r.phone as string,
            nextFeedback: r.next_feedback as string,
            daysLeft: diff,
          };
        }));
      }

      setLoading(false);
    };
    load();
  }, []);

  const statCards = stats ? [
    { label: "Total Alunos", value: stats.total.toLocaleString(), icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Alunos Ativos", value: stats.active.toLocaleString(), icon: UserCheck, color: "text-success", bgColor: "bg-success/10" },
    { label: "Alunos Inativos", value: stats.inactive.toLocaleString(), icon: UserX, color: "text-muted-foreground", bgColor: "bg-muted" },
    { label: "Vencendo próx. 30 dias", value: stats.expiring30.toLocaleString(), icon: CalendarClock, color: "text-warning", bgColor: "bg-warning/10" },
    { label: "Vencidos últimos 30 dias", value: stats.expired30.toLocaleString(), icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
  ] : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-8 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos alunos</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="surface-elevated p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.bgColor)}>
                      <stat.icon className={cn("w-4.5 h-4.5", stat.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Próximos Feedbacks */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="surface-elevated p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Próximos Feedbacks</h2>
                {feedbacks.length > 0 && <span className="text-xs text-muted-foreground">{feedbacks.length} agendados</span>}
              </div>
              {feedbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum feedback agendado nos próximos dias.</p>
              ) : (
                <>
                  <div className="overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Aluno</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Telefone</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Data</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedbacks.slice(fbPage * FB_PAGE_SIZE, (fbPage + 1) * FB_PAGE_SIZE).map((fb) => (
                          <tr
                            key={fb.id}
                            onClick={() => navigate(`/contacts/${fb.id}`)}
                            className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-2.5 text-sm font-medium text-foreground">{fb.name}</td>
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{fb.phone}</td>
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{fb.nextFeedback}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("text-xs px-2 py-0.5 rounded-lg font-medium",
                                fb.daysLeft <= 3 ? "bg-destructive/20 text-destructive" :
                                fb.daysLeft <= 7 ? "bg-warning/20 text-warning" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {fb.daysLeft === 0 ? "Hoje" : fb.daysLeft === 1 ? "Amanhã" : `${fb.daysLeft} dias`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {feedbacks.length > FB_PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                      <span className="text-xs text-muted-foreground">
                        {fbPage * FB_PAGE_SIZE + 1}–{Math.min((fbPage + 1) * FB_PAGE_SIZE, feedbacks.length)} de {feedbacks.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setFbPage((p) => Math.max(0, p - 1))} disabled={fbPage === 0} className="px-2 py-1 text-xs rounded-lg hover:bg-secondary disabled:opacity-30 text-muted-foreground">‹</button>
                        <span className="text-xs text-foreground px-2">{fbPage + 1} / {Math.ceil(feedbacks.length / FB_PAGE_SIZE)}</span>
                        <button onClick={() => setFbPage((p) => Math.min(Math.ceil(feedbacks.length / FB_PAGE_SIZE) - 1, p + 1))} disabled={(fbPage + 1) * FB_PAGE_SIZE >= feedbacks.length} className="px-2 py-1 text-xs rounded-lg hover:bg-secondary disabled:opacity-30 text-muted-foreground">›</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
