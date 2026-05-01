import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Search, Download, Info, TrendingUp, TrendingDown,
  Minus, Loader2, Filter, X, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { differenceInDays, parseISO } from "date-fns";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CategoryScore { label: string; value: number }

interface EngagementItem {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  planName: string | null;
  endDate: string;
  xp: number;
  categories: CategoryScore[];
  trend: "up" | "down" | "stable";
  level: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-green-500","bg-orange-500",
  "bg-pink-500","bg-teal-500","bg-amber-500","bg-rose-500",
];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const LEVEL_COLORS = ["bg-gray-500","bg-blue-500","bg-green-500","bg-yellow-500","bg-violet-500"];

// ─── Row ──────────────────────────────────────────────────────────────────────

const EngagementRow = ({
  item, rank, onNavigate,
}: { item: EngagementItem; rank: number; onNavigate: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const isTop3 = rank <= 3;
  const daysLeft = differenceInDays(parseISO(item.endDate), new Date());

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      isTop3 && rank === 1
        ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
        : "bg-card border-border hover:border-primary/30",
    )}>
      {/* Linha principal compacta */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Posição */}
        <span className={cn(
          "w-5 text-center text-sm font-bold shrink-0",
          rank === 1 ? "text-amber-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-700" : "text-muted-foreground",
        )}>
          {rank}
        </span>

        {/* Avatar */}
        <div
          className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 cursor-pointer", getAvatarColor(item.customerName))}
          onClick={onNavigate}
        >
          {item.customerName.charAt(0).toUpperCase()}
        </div>

        {/* Nome + email */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onNavigate}>
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{item.customerName}</p>
          <p className="text-xs text-muted-foreground truncate">{item.customerEmail ?? "—"}</p>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1.5 shrink-0">
          {item.trend === "up"     && <TrendingUp   className="w-3.5 h-3.5 text-green-400" />}
          {item.trend === "down"   && <TrendingDown  className="w-3.5 h-3.5 text-red-400" />}
          {item.trend === "stable" && <Minus         className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className={cn("text-sm font-bold tabular-nums", rank === 1 ? "text-amber-500" : "text-green-400")}>
            {item.xp.toLocaleString("pt-BR")}
          </span>
          <span className="text-xs text-muted-foreground">XP</span>
        </div>

        {/* Nível */}
        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", LEVEL_COLORS[item.level - 1] ?? "bg-gray-400")}>
          {item.level}
        </div>

        {/* Vencimento */}
        <div className="shrink-0 text-right min-w-[52px]">
          <p className="text-[10px] text-muted-foreground">vence em</p>
          <p className={cn("text-xs font-semibold", daysLeft <= 7 ? "text-orange-400" : "text-foreground")}>
            {daysLeft < 0 ? "vencido" : `${daysLeft}d`}
          </p>
        </div>

        {/* Expandir */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {/* Painel expandido com categorias */}
      {expanded && (
        <div className={cn(
          "flex items-center border-t px-4 py-3 gap-1",
          rank === 1 ? "border-amber-200/60 dark:border-amber-500/20" : "border-border/50",
        )}>
          {item.categories.map((cat) => (
            <div key={cat.label} className="flex-1 text-center">
              <p className={cn(
                "text-sm font-bold",
                cat.value >= 70 ? "text-green-400"
                : cat.value >= 40 ? "text-yellow-400"
                : cat.value > 0  ? "text-red-400"
                : "text-muted-foreground/30",
              )}>
                {cat.value > 0 ? cat.value : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{cat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

    let query = supabase
      .from("consultorias")
      .select("id, customer_id, end_date, customers(name, email), plans(name)")
      .eq("coach_id", user.id);
    if (tab === "current") query = query.eq("status", "active");

    const { data: consultorias } = await query;
    if (!consultorias) { setLoading(false); return; }

    const enriched = await Promise.all(
      consultorias.map(async (c) => {
        const [fbRes, photoRes, weightRes] = await Promise.all([
          supabase.from("feedbacks").select("status, answered_at, answers")
            .eq("customer_id", c.customer_id).eq("coach_id", user.id)
            .order("answered_at", { ascending: false }).limit(10),
          supabase.from("progress_photos").select("id", { count: "exact", head: true }).eq("customer_id", c.customer_id),
          supabase.from("weight_logs").select("id", { count: "exact", head: true }).eq("customer_id", c.customer_id),
        ]);

        const fbs = fbRes.data ?? [];
        const answered = fbs.filter((f) => f.status === "answered" || f.status === "seen");

        function avgStar(key: string): number {
          const vals = answered.map((f) => {
            const a = (f.answers as any)?.[key];
            return a?.stars ? a.stars * 20 : null;
          }).filter((v) => v !== null) as number[];
          return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
        }

        const feedbackPct = fbs.length > 0 ? Math.round((answered.length / fbs.length) * 100) : 0;

        const categories: CategoryScore[] = [
          { label: "Feedbacks",  value: feedbackPct },
          { label: "Treino",     value: avgStar("plano_treino") },
          { label: "Dieta",      value: avgStar("plano_alimentar") },
          { label: "Hidratação", value: avgStar("hidratacao") },
          { label: "Aeróbico",   value: avgStar("exercicio_aerobico") },
          { label: "Sono",       value: avgStar("qualidade_sono") },
          { label: "Disposição", value: avgStar("disposicao_dia") },
          { label: "Fotos",      value: (photoRes.count ?? 0) > 0 ? 100 : 0 },
          { label: "Peso",       value: (weightRes.count ?? 0) > 0 ? 100 : 0 },
        ];

        const avgScore = Math.round(categories.map((c) => c.value).reduce((s, v) => s + v, 0) / categories.length);
        const xp = avgScore * 100 + answered.length * 50;
        const level = avgScore >= 80 ? 5 : avgScore >= 60 ? 4 : avgScore >= 40 ? 3 : avgScore >= 20 ? 2 : 1;

        let trend: "up" | "down" | "stable" = "stable";
        if (answered.length >= 2) {
          const la = Object.values((answered[0].answers as Record<string, any>) ?? {}).filter((v: any) => v?.stars).map((v: any) => v.stars as number);
          const pa = Object.values((answered[1].answers as Record<string, any>) ?? {}).filter((v: any) => v?.stars).map((v: any) => v.stars as number);
          if (la.length && pa.length) {
            const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
            trend = avg(la) > avg(pa) ? "up" : avg(la) < avg(pa) ? "down" : "stable";
          }
        }

        return {
          customerId: c.customer_id,
          customerName: (c.customers as any)?.name ?? "—",
          customerEmail: (c.customers as any)?.email ?? null,
          planName: (c.plans as any)?.name ?? null,
          endDate: c.end_date,
          xp, categories, trend, level,
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
    const q = search.toLowerCase();
    if (q && !item.customerName.toLowerCase().includes(q) && !(item.customerEmail ?? "").toLowerCase().includes(q)) return false;
    if (filterScore === "high"   && item.xp < 7000) return false;
    if (filterScore === "medium" && (item.xp < 3000 || item.xp >= 7000)) return false;
    if (filterScore === "low"    && item.xp >= 3000) return false;
    return true;
  });

  const handleExport = () => {
    if (!filtered.length) return;
    const rows = [
      ["Pos", "Nome", "Email", "Plano", "XP", "Nível", ...filtered[0].categories.map((c) => c.label)],
      ...filtered.map((i, idx) => [idx + 1, i.customerName, i.customerEmail ?? "", i.planName ?? "", i.xp, i.level, ...i.categories.map((c) => c.value)]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "engajamento.csv"; a.click();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Engajamento dos Alunos</h1>
            <p className="text-sm text-muted-foreground">Ranking de engajamento dos seus alunos</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Exportar lista
          </Button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2">
          {[
            { key: "current" as const, label: "Temporada Atual" },
            { key: "history" as const, label: "Histórico Geral" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Filtros toggle */}
        <div className="space-y-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
          </button>

          {showFilters && (
            <div className="flex items-end gap-2">
              <div className="flex-1 max-w-xs">
                <Input placeholder="Buscar por nome ou email" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
              </div>
              <Button size="sm" className="h-8 gap-1.5">
                <Search className="w-3.5 h-3.5" /> Filtrar
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5"
                onClick={() => { setSearch(""); setFilterScore("all"); }}>
                <X className="w-3.5 h-3.5" /> Limpar
              </Button>
            </div>
          )}

          {/* Pills */}
          <div className="flex items-center gap-2">
            {[
              { key: "all" as const,    label: "Todos",  count: counts.all,    cls: "" },
              { key: "high" as const,   label: "Alto",   count: counts.high,   cls: "text-green-400 border-green-400/40 bg-green-400/10" },
              { key: "medium" as const, label: "Médio",  count: counts.medium, cls: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
              { key: "low" as const,    label: "Baixo",  count: counts.low,    cls: "text-red-400 border-red-400/40 bg-red-400/10" },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilterScore(f.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  filterScore === f.key
                    ? (f.cls || "text-foreground border-primary bg-primary/10")
                    : "text-muted-foreground border-border hover:border-primary/30",
                )}
              >
                {f.label} <span className="font-bold">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Info banner */}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 mb-3">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <span className="font-semibold">
                  {tab === "current" ? "Ranking da Temporada Atual" : "Histórico Geral"}
                </span>
                <span className="text-muted-foreground ml-1">
                  {tab === "current"
                    ? "Exibindo pontuação acumulada durante a temporada atual. Os pontos são resetados a cada nova temporada."
                    : "Histórico completo de engajamento de todos os alunos."}
                </span>
              </span>
            </div>

            {filtered.map((item, index) => (
              <EngagementRow
                key={item.customerId}
                item={item}
                rank={index + 1}
                onNavigate={() => navigate(`/customers/${item.customerId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersEngagementPage;
