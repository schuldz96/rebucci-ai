import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Search, RefreshCw, MessageCircle, Camera, Weight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EngagementItem {
  customerId: string;
  customerName: string;
  consultoriaId: string;
  endDate: string;
  planName: string | null;
  feedbacksAnswered: number;
  feedbacksTotal: number;
  lastFeedbackAt: string | null;
  hasPhotos: boolean;
  hasWeightLogs: boolean;
  score: number; // 0-100
}

// ─── Score ────────────────────────────────────────────────────────────────────

function calcScore(item: Omit<EngagementItem, "score">): number {
  let score = 0;
  // Feedbacks respondidos: até 50 pontos
  if (item.feedbacksTotal > 0) {
    score += Math.round((item.feedbacksAnswered / item.feedbacksTotal) * 50);
  }
  // Último feedback recente (< 30 dias): 20 pontos
  if (item.lastFeedbackAt) {
    const daysAgo = differenceInDays(new Date(), parseISO(item.lastFeedbackAt));
    if (daysAgo <= 14) score += 20;
    else if (daysAgo <= 30) score += 10;
  }
  // Fotos: 15 pontos
  if (item.hasPhotos) score += 15;
  // Peso registrado: 15 pontos
  if (item.hasWeightLogs) score += 15;
  return Math.min(score, 100);
}

function scoreConfig(score: number) {
  if (score >= 70) return { label: "Alto", color: "text-green-400", bg: "bg-green-400/10", bar: "bg-green-400" };
  if (score >= 40) return { label: "Médio", color: "text-yellow-400", bg: "bg-yellow-400/10", bar: "bg-yellow-400" };
  return { label: "Baixo", color: "text-red-400", bg: "bg-red-400/10", bar: "bg-red-400" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersEngagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState<EngagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterScore, setFilterScore] = useState<"all" | "high" | "medium" | "low">("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Busca consultorias ativas com dados do aluno e plano
    const { data: consultorias } = await supabase
      .from("consultorias")
      .select("id, customer_id, end_date, customers(name), plans(name)")
      .eq("coach_id", user.id)
      .eq("status", "active");

    if (!consultorias) { setLoading(false); return; }

    // Para cada consultoria, busca métricas de engajamento em paralelo
    const enriched = await Promise.all(
      consultorias.map(async (c) => {
        const [fbRes, photoRes, weightRes] = await Promise.all([
          supabase.from("feedbacks").select("status, answered_at").eq("customer_id", c.customer_id).eq("coach_id", user.id),
          supabase.from("progress_photos").select("id", { count: "exact", head: true }).eq("customer_id", c.customer_id),
          supabase.from("weight_logs").select("id", { count: "exact", head: true }).eq("customer_id", c.customer_id),
        ]);

        const fbs = fbRes.data ?? [];
        const answeredFbs = fbs.filter((f) => f.status === "answered" || f.status === "seen");
        const lastFb = answeredFbs.sort((a, b) =>
          (b.answered_at ?? "").localeCompare(a.answered_at ?? "")
        )[0];

        const base: Omit<EngagementItem, "score"> = {
          customerId: c.customer_id,
          customerName: (c.customers as any)?.name ?? "—",
          consultoriaId: c.id,
          endDate: c.end_date,
          planName: (c.plans as any)?.name ?? null,
          feedbacksAnswered: answeredFbs.length,
          feedbacksTotal: fbs.length,
          lastFeedbackAt: lastFb?.answered_at ?? null,
          hasPhotos: (photoRes.count ?? 0) > 0,
          hasWeightLogs: (weightRes.count ?? 0) > 0,
        };
        return { ...base, score: calcScore(base) };
      })
    );

    // Ordena do menor para o maior score (prioridade para quem precisa de atenção)
    setItems(enriched.sort((a, b) => a.score - b.score));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = items.filter((item) => {
    if (search && !item.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterScore !== "all") {
      const cfg = scoreConfig(item.score);
      if (filterScore === "high" && cfg.label !== "Alto") return false;
      if (filterScore === "medium" && cfg.label !== "Médio") return false;
      if (filterScore === "low" && cfg.label !== "Baixo") return false;
    }
    return true;
  });

  const counts = {
    high: items.filter((i) => i.score >= 70).length,
    medium: items.filter((i) => i.score >= 40 && i.score < 70).length,
    low: items.filter((i) => i.score < 40).length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Engajamento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Score de engajamento dos seus alunos</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Resumo por score */}
        <div className="flex items-center gap-3 mt-4">
          {[
            { key: "all" as const, label: "Todos", count: items.length, color: "text-foreground bg-muted" },
            { key: "high" as const, label: "Alto", count: counts.high, color: "text-green-400 bg-green-400/10" },
            { key: "medium" as const, label: "Médio", count: counts.medium, color: "text-yellow-400 bg-yellow-400/10" },
            { key: "low" as const, label: "Baixo", count: counts.low, color: "text-red-400 bg-red-400/10" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterScore(f.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                filterScore === f.key ? `${f.color} border-current` : "text-muted-foreground bg-transparent border-border hover:border-primary/40"
              )}
            >
              {f.label}
              <span className="text-xs font-bold">{f.count}</span>
            </button>
          ))}

          <div className="relative ml-auto max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const cfg = scoreConfig(item.score);
              const daysLeft = differenceInDays(parseISO(item.endDate), new Date());
              return (
                <button
                  key={item.customerId}
                  onClick={() => navigate(`/customers/${item.customerId}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/20 transition-all text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {item.customerName.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm truncate">{item.customerName}</p>
                      {item.planName && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">{item.planName}</span>}
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[200px]">
                      <div className={cn("h-full rounded-full transition-all", cfg.bar)} style={{ width: `${item.score}%` }} />
                    </div>
                  </div>

                  {/* Ícones de métricas */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span title="Feedbacks respondidos" className={cn("text-xs flex items-center gap-1", item.feedbacksAnswered > 0 ? "text-green-400" : "text-muted-foreground/40")}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      {item.feedbacksAnswered}/{item.feedbacksTotal}
                    </span>
                    <span title="Fotos" className={cn("text-xs", item.hasPhotos ? "text-violet-400" : "text-muted-foreground/40")}>
                      <Camera className="w-3.5 h-3.5" />
                    </span>
                    <span title="Peso registrado" className={cn("text-xs", item.hasWeightLogs ? "text-blue-400" : "text-muted-foreground/40")}>
                      <Weight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Score badge */}
                  <div className="shrink-0 text-right">
                    <span className={cn("text-sm font-bold", cfg.color)}>{item.score}</span>
                    <span className="text-xs text-muted-foreground"> /100</span>
                    <p className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </p>
                  </div>

                  {/* Dias restantes */}
                  <div className="shrink-0 text-right min-w-[60px]">
                    <p className="text-xs text-muted-foreground">vence em</p>
                    <p className={cn("text-sm font-semibold", daysLeft <= 7 ? "text-orange-400" : "text-foreground")}>
                      {daysLeft < 0 ? "vencido" : `${daysLeft}d`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersEngagementPage;
