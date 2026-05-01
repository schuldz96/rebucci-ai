import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Search, Download, Info, TrendingUp, TrendingDown, Minus, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { differenceInDays, parseISO } from "date-fns";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CategoryScore {
  label: string;
  value: number; // 0-100
}

interface EngagementItem {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  planName: string | null;
  endDate: string;
  xp: number;
  categories: CategoryScore[];
  trend: "up" | "down" | "stable";
  level: number; // 1-5
}

// ─── Avatar cores ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-green-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-rose-500",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Level badge ──────────────────────────────────────────────────────────────

const LEVEL_COLORS = ["bg-gray-400", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-violet-500"];

function LevelBadge({ level }: { level: number }) {
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", LEVEL_COLORS[level - 1] ?? "bg-gray-400")}>
      {level}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersEngagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState<EngagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<"current" | "history">("current");
  const [filterScore, setFilterScore] = useState<"all" | "high" | "medium" | "low">("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const statusFilter = tab === "current" ? "active" : undefined;

    let query = supabase
      .from("consultorias")
      .select("id, customer_id, end_date, customers(name, email), plans(name)")
      .eq("coach_id", user.id);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data: consultorias } = await query;
    if (!consultorias) { setLoading(false); return; }

    const enriched = await Promise.all(
      consultorias.map(async (c) => {
        const [fbRes, photoRes, weightRes] = await Promise.all([
          supabase.from("feedbacks").select("status, answered_at, answers").eq("customer_id", c.customer_id).eq("coach_id", user.id).order("answered_at", { ascending: false }).limit(10),
          supabase.from("progress_photos").select("id", { count: "exact", head: true }).eq("customer_id", c.customer_id),
          supabase.from("weight_logs").select("id", { count: "exact", head: true }).eq("customer_id", c.customer_id),
        ]);

        const fbs = fbRes.data ?? [];
        const answered = fbs.filter((f) => f.status === "answered" || f.status === "seen");

        // Calcula médias das categorias do feedback
        function avgStar(key: string): number {
          const vals = answered.map((f) => {
            const a = (f.answers as any)?.[key];
            return a?.stars ? a.stars * 20 : null;
          }).filter((v) => v !== null) as number[];
          return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
        }

        const feedbackPct = fbs.length > 0 ? Math.round((answered.length / fbs.length) * 100) : 0;
        const hasFotos = (photoRes.count ?? 0) > 0;
        const hasPeso = (weightRes.count ?? 0) > 0;

        const categories: CategoryScore[] = [
          { label: "Feedbacks", value: feedbackPct },
          { label: "Treino",    value: avgStar("plano_treino") },
          { label: "Dieta",     value: avgStar("plano_alimentar") },
          { label: "Hidratação", value: avgStar("hidratacao") },
          { label: "Aeróbico",  value: avgStar("exercicio_aerobico") },
          { label: "Sono",      value: avgStar("qualidade_sono") },
          { label: "Disposição",value: avgStar("disposicao_dia") },
          { label: "Fotos",     value: hasFotos ? 100 : 0 },
          { label: "Peso",      value: hasPeso ? 100 : 0 },
        ];

        const avgScore = Math.round(categories.map((c) => c.value).reduce((s, v) => s + v, 0) / categories.length);
        const xp = avgScore * 100 + answered.length * 50;
        const level = avgScore >= 80 ? 5 : avgScore >= 60 ? 4 : avgScore >= 40 ? 3 : avgScore >= 20 ? 2 : 1;

        // Tendência: compara último feedback com o anterior
        let trend: "up" | "down" | "stable" = "stable";
        if (answered.length >= 2) {
          const latestScore = Object.values((answered[0].answers as Record<string, any>) ?? {})
            .filter((v: any) => v?.stars).map((v: any) => v.stars as number);
          const prevScore = Object.values((answered[1].answers as Record<string, any>) ?? {})
            .filter((v: any) => v?.stars).map((v: any) => v.stars as number);
          if (latestScore.length && prevScore.length) {
            const la = latestScore.reduce((s, v) => s + v, 0) / latestScore.length;
            const pa = prevScore.reduce((s, v) => s + v, 0) / prevScore.length;
            trend = la > pa ? "up" : la < pa ? "down" : "stable";
          }
        }

        return {
          customerId: c.customer_id,
          customerName: (c.customers as any)?.name ?? "—",
          customerEmail: (c.customers as any)?.email ?? null,
          planName: (c.plans as any)?.name ?? null,
          endDate: c.end_date,
          xp,
          categories,
          trend,
          level,
        };
      })
    );

    setItems(enriched.sort((a, b) => b.xp - a.xp));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, tab]);

  const counts = {
    all: items.length,
    high: items.filter((i) => i.xp >= 7000).length,
    medium: items.filter((i) => i.xp >= 3000 && i.xp < 7000).length,
    low: items.filter((i) => i.xp < 3000).length,
  };

  const filtered = items.filter((item) => {
    if (search && !item.customerName.toLowerCase().includes(search.toLowerCase()) &&
        !(item.customerEmail ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterScore === "high" && item.xp < 7000) return false;
    if (filterScore === "medium" && (item.xp < 3000 || item.xp >= 7000)) return false;
    if (filterScore === "low" && item.xp >= 3000) return false;
    return true;
  });

  const handleExport = () => {
    const rows = [
      ["Nome", "Email", "Plano", "XP", "Nível", ...filtered[0]?.categories.map((c) => c.label) ?? []],
      ...filtered.map((i) => [i.customerName, i.customerEmail ?? "", i.planName ?? "", i.xp, i.level, ...i.categories.map((c) => c.value)]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "engajamento.csv"; a.click();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Engajamento dos Alunos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ranking de engajamento dos seus alunos</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Exportar lista
          </Button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setTab("current")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
              tab === "current"
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Temporada Atual
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
              tab === "history"
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Histórico Geral
          </button>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>

          {showFilters && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
                <Input
                  placeholder="Buscar por nome ou email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" className="gap-2 h-9" onClick={() => {}}>
                  <Search className="w-4 h-4" /> Filtrar
                </Button>
                <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => { setSearch(""); setFilterScore("all"); }}>
                  <X className="w-4 h-4" /> Limpar
                </Button>
              </div>
            </div>
          )}

          {/* Score pills */}
          <div className="flex items-center gap-2">
            {[
              { key: "all" as const, label: "Todos", count: counts.all },
              { key: "high" as const, label: "Alto", count: counts.high, color: "text-green-400 border-green-400/40 bg-green-400/10" },
              { key: "medium" as const, label: "Médio", count: counts.medium, color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
              { key: "low" as const, label: "Baixo", count: counts.low, color: "text-red-400 border-red-400/40 bg-red-400/10" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterScore(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  filterScore === f.key
                    ? (f.color ?? "text-foreground border-primary bg-primary/10")
                    : "text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {f.label} <span className="font-bold">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cabeçalho da temporada */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400">
              <Info className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-semibold">
                  {tab === "current" ? "Ranking da Temporada Atual" : "Histórico Geral de Engajamento"}
                </span>
                <span className="text-muted-foreground ml-2">
                  {tab === "current"
                    ? "Exibindo pontuação acumulada durante a temporada atual. Os pontos são resetados a cada nova temporada."
                    : "Histórico completo de engajamento de todos os alunos."}
                </span>
              </div>
            </div>

            {filtered.map((item, index) => {
              const isFirst = index === 0;
              const daysLeft = differenceInDays(parseISO(item.endDate), new Date());
              return (
                <button
                  key={item.customerId}
                  onClick={() => navigate(`/customers/${item.customerId}`)}
                  className={cn(
                    "w-full text-left rounded-xl border transition-all hover:shadow-md",
                    isFirst
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
                      : "bg-card border-border hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  {/* Linha principal */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Posição */}
                    <div className={cn(
                      "w-7 text-center text-sm font-bold shrink-0",
                      isFirst ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                      getAvatarColor(item.customerName)
                    )}>
                      {item.customerName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{item.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.customerEmail ?? "—"}</p>
                    </div>

                    {/* XP + tendência */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.trend === "up" && <TrendingUp className="w-4 h-4 text-green-400" />}
                      {item.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                      {item.trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                      <div className="text-right">
                        <span className={cn("text-base font-bold", isFirst ? "text-amber-600 dark:text-amber-400" : "text-green-400")}>
                          {item.xp.toLocaleString("pt-BR")}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">XP</span>
                      </div>
                    </div>

                    {/* Nível */}
                    <LevelBadge level={item.level} />

                    {/* Dias restantes */}
                    <div className="min-w-[60px] text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">vence em</p>
                      <p className={cn("text-sm font-semibold", daysLeft <= 7 ? "text-orange-400" : "text-foreground")}>
                        {daysLeft < 0 ? "vencido" : `${daysLeft}d`}
                      </p>
                    </div>
                  </div>

                  {/* Sub-linha de categorias */}
                  <div className={cn(
                    "flex items-center gap-0 px-4 pb-3 border-t",
                    isFirst ? "border-amber-200/60 dark:border-amber-500/20" : "border-border/50"
                  )}>
                    {item.categories.map((cat) => (
                      <div key={cat.label} className="flex-1 pt-2 text-center">
                        <p className={cn(
                          "text-sm font-bold",
                          cat.value >= 70 ? "text-green-400" : cat.value >= 40 ? "text-yellow-400" : cat.value > 0 ? "text-red-400" : "text-muted-foreground/40"
                        )}>
                          {cat.value > 0 ? cat.value : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{cat.label}</p>
                      </div>
                    ))}
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
