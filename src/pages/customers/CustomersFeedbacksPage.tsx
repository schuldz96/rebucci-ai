import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter, Grid, List, ChevronDown, ChevronUp, Search,
  MessageCircleWarning, AlertTriangle, Clock, CheckCircle2,
  Image, Eye, User, Weight, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ApptFeedback {
  id: string;
  customer_id: string;
  status: "pending" | "partial" | "answered" | "seen" | "expired";
  scheduled_for?: string;
  answered_at?: string;
  has_photos: boolean;
  notes?: string;
  customers?: { id: string; name: string; avatar_url?: string };
  planName?: string;
  latestWeight?: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:  { label: "Pendente",   color: "text-blue-400 bg-blue-400/10",       icon: Clock },
  partial:  { label: "Parcial",    color: "text-yellow-400 bg-yellow-400/10",   icon: Clock },
  answered: { label: "Respondido", color: "text-green-400 bg-green-400/10",     icon: CheckCircle2 },
  seen:     { label: "Visto",      color: "text-muted-foreground bg-muted",     icon: Eye },
  expired:  { label: "Expirado",   color: "text-destructive bg-destructive/10", icon: AlertTriangle },
} as const;

const avatarColors = [
  "bg-violet-500/30 text-violet-300",
  "bg-blue-500/30 text-blue-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-orange-500/30 text-orange-300",
  "bg-pink-500/30 text-pink-300",
  "bg-cyan-500/30 text-cyan-300",
];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];
const avatarInitials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

// ─── FeedbackRow ─────────────────────────────────────────────────────────────

const FeedbackRow = ({ fb, onMark }: { fb: ApptFeedback; onMark: (id: string) => void }) => {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[fb.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const customer = fb.customers;

  const deadline = fb.scheduled_for ? addDays(parseISO(fb.scheduled_for), 5) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;
  const urgent = daysLeft !== null && daysLeft <= 2 && fb.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-muted/20 transition-colors group cursor-pointer"
      onClick={() => navigate(`/customers/feedbacks/${fb.id}`)}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer",
          customer ? getAvatarColor(customer.name) : "bg-muted text-muted-foreground"
        )}
        onClick={() => customer && navigate(`/customers/${customer.id}`)}
      >
        {customer ? avatarInitials(customer.name) : <User className="w-4 h-4" />}
      </div>

      {/* Nome + Plano + Data */}
      <div className="w-64 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); customer && navigate(`/customers/${customer.id}`); }}
          className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors truncate block max-w-full text-left"
        >
          {customer?.name ?? "—"}
        </button>
        <div className="flex items-center gap-2 mt-0.5">
          {fb.planName && (
            <span className="text-[11px] text-muted-foreground truncate">{fb.planName}</span>
          )}
          {fb.scheduled_for && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              · {format(parseISO(fb.scheduled_for), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex-1 flex flex-wrap items-center gap-1.5">
        {/* Status */}
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>
          <Icon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>

        {/* Peso */}
        {fb.latestWeight ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground bg-muted/60">
            <Weight className="w-2.5 h-2.5" />
            {fb.latestWeight} kg
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground/40 bg-muted/30 line-through decoration-muted-foreground/30">
            Peso
          </span>
        )}

        {/* Fotos */}
        {fb.has_photos ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-violet-400 bg-violet-400/10">
            <Image className="w-2.5 h-2.5" />
            Possui fotos
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground/40 bg-muted/30 line-through decoration-muted-foreground/30">
            Sem fotos
          </span>
        )}

        {/* Observação / resposta */}
        {fb.notes ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-amber-400 bg-amber-400/10 max-w-[200px] truncate">
            <FileText className="w-2.5 h-2.5 shrink-0" />
            {fb.notes}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground/40 bg-muted/30">
            Não Informado
          </span>
        )}
      </div>

      {/* Deadline / respondido */}
      <div className="shrink-0 text-right w-36">
        {deadline && fb.status === "pending" ? (
          <div className={cn("text-xs", urgent ? "text-red-400" : "text-muted-foreground")}>
            <p className="font-medium">Limite: {format(deadline, "dd/MM/yyyy", { locale: ptBR })}</p>
            <p className="text-[10px] mt-0.5">
              {daysLeft! > 0
                ? `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`
                : "Vence hoje"}
            </p>
          </div>
        ) : fb.answered_at ? (
          <p className="text-xs text-muted-foreground">
            {format(parseISO(fb.answered_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        ) : null}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          title="Ver perfil"
          onClick={() => customer && navigate(`/customers/${customer.id}`)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
        {(fb.status === "answered" || fb.status === "partial") && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMark(fb.id)}>
            Marcar visto
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// ─── FeedbackCard ─────────────────────────────────────────────────────────────

const FeedbackCard = ({ fb, onMark }: { fb: ApptFeedback; onMark: (id: string) => void }) => {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[fb.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const customer = fb.customers;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer",
            customer ? getAvatarColor(customer.name) : "bg-muted text-muted-foreground"
          )}
          onClick={() => customer && navigate(`/customers/${customer.id}`)}
        >
          {customer ? avatarInitials(customer.name) : <User className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{customer?.name ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground truncate">{fb.planName ?? "—"}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.color)}>
          <Icon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {fb.latestWeight && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-muted-foreground bg-muted/60">
            <Weight className="w-2.5 h-2.5" />
            {fb.latestWeight} kg
          </span>
        )}
        {fb.has_photos && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-violet-400 bg-violet-400/10">
            <Image className="w-2.5 h-2.5" />
            Possui fotos
          </span>
        )}
        {fb.scheduled_for && (
          <span className="text-[10px] text-muted-foreground">
            {format(parseISO(fb.scheduled_for), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        )}
      </div>

      {(fb.status === "answered" || fb.status === "partial") && (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => onMark(fb.id)}>
          Marcar como visto
        </Button>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersFeedbacksPage = () => {
  const { user } = useAuthStore();

  const [feedbacks, setFeedbacks] = useState<ApptFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPhotos, setFilterPhotos] = useState("all");
  const [filterSort, setFilterSort] = useState("default");
  const [showExpired, setShowExpired] = useState(false);

  const EXPIRY_DAYS = 5;

  const markSeen = async (id: string) => {
    const fb = feedbacks.find(f => f.id === id);
    if (!fb || fb.status === "expired") return;
    await supabase.from("appointments").update({ status: "done" }).eq("id", id);
    setFeedbacks(prev => prev.map(f =>
      f.id === id ? { ...f, status: "answered" as const, answered_at: new Date().toISOString() } : f
    ));
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Expira feedbacks não respondidos com mais de 5 dias
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() - EXPIRY_DAYS);
    await supabase
      .from("appointments")
      .update({ status: "expired" })
      .eq("coach_id", user.id)
      .eq("type", "feedback")
      .eq("status", "scheduled")
      .lt("scheduled_at", expiryThreshold.toISOString());

    // Busca feedbacks (appointments)
    const { data: apts } = await supabase
      .from("appointments")
      .select("id, customer_id, status, scheduled_at, notes, coach_id")
      .eq("coach_id", user.id)
      .eq("type", "feedback")
      .order("scheduled_at", { ascending: false });

    if (!apts?.length) { setFeedbacks([]); setLoading(false); return; }

    const customerIds = [...new Set(apts.map(a => a.customer_id).filter(Boolean))];

    // Busca customers + planos (via consultoria ativa)
    const [{ data: customers }, { data: consultorias }, { data: weightLogs }] = await Promise.all([
      supabase.from("customers").select("id, name, avatar_url").eq("coach_id", user.id).in("id", customerIds),
      supabase.from("consultorias").select("customer_id, plans(name)").eq("coach_id", user.id).eq("status", "active").in("customer_id", customerIds),
      supabase.from("weight_logs").select("customer_id, weight_kg, recorded_at").in("customer_id", customerIds).order("recorded_at", { ascending: false }),
    ]);

    const customerMap = Object.fromEntries((customers ?? []).map(c => [c.id, c]));
    const planMap: Record<string, string> = {};
    (consultorias ?? []).forEach((c: any) => { if (c.customer_id && c.plans?.name) planMap[c.customer_id] = c.plans.name; });
    const weightMap: Record<string, number> = {};
    (weightLogs ?? []).forEach((w: any) => { if (!weightMap[w.customer_id]) weightMap[w.customer_id] = w.weight_kg; });

    const mapped: ApptFeedback[] = apts.map(a => ({
      id: a.id,
      customer_id: a.customer_id,
      status: (a.status === "done" || a.status === "completed" ? "answered"
             : a.status === "expired" ? "expired"
             : a.status === "cancelled" ? "expired"
             : "pending") as ApptFeedback["status"],
      scheduled_for: a.scheduled_at,
      answered_at: (a.status === "done" || a.status === "completed") ? a.scheduled_at : undefined,
      has_photos: false,
      notes: a.notes ?? undefined,
      customers: customerMap[a.customer_id],
      planName: planMap[a.customer_id],
      latestWeight: weightMap[a.customer_id],
      created_at: a.scheduled_at ?? new Date().toISOString(),
    }));

    setFeedbacks(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = feedbacks
    .filter((fb) => {
      if (!showExpired && fb.status === "expired") return false;
      const q = search.toLowerCase();
      if (q && !(fb.customers?.name ?? "").toLowerCase().includes(q)) return false;
      if (filterStatus !== "all" && fb.status !== filterStatus) return false;
      if (filterPhotos === "with" && !fb.has_photos) return false;
      if (filterPhotos === "without" && fb.has_photos) return false;
      return true;
    })
    .sort((a, b) => {
      if (filterSort === "default") {
        const p = { answered: 0, partial: 1, pending: 2, seen: 3, expired: 4 };
        return (p[a.status] ?? 5) - (p[b.status] ?? 5);
      }
      if (filterSort === "newest") return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
      if (filterSort === "oldest") return parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime();
      if (filterSort === "name") return (a.customers?.name ?? "").localeCompare(b.customers?.name ?? "");
      return 0;
    });

  const pendingCount = feedbacks.filter(f => f.status === "pending" || f.status === "partial").length;
  const answeredCount = feedbacks.filter(f => f.status === "answered").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feedbacks</h1>
            <div className="flex items-center gap-3 mt-1">
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full font-medium">
                  <Clock className="w-3 h-3" />
                  {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                </span>
              )}
              {answeredCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {answeredCount} respondido{answeredCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("list")} className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <Grid className="w-4 h-4" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2", showExpired ? "border-orange-400/60 text-orange-400 bg-orange-400/10" : "text-orange-400 border-orange-400/40 hover:bg-orange-400/10")}
              onClick={() => setShowExpired(!showExpired)}
            >
              <AlertTriangle className="w-4 h-4" />
              Feedbacks Expirados
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
            {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nome..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Status e Fotos</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="answered">Respondido</SelectItem>
                        <SelectItem value="seen">Visto</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterPhotos} onValueChange={setFilterPhotos}>
                      <SelectTrigger><SelectValue placeholder="Fotos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="with">Com fotos</SelectItem>
                        <SelectItem value="without">Sem fotos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterSort} onValueChange={setFilterSort}>
                      <SelectTrigger><SelectValue placeholder="Ordenação" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Padrão (não lidos primeiro)</SelectItem>
                        <SelectItem value="newest">Data mais recente</SelectItem>
                        <SelectItem value="oldest">Data mais antiga</SelectItem>
                        <SelectItem value="name">Nome A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPhotos("all"); setFilterSort("default"); }}>
                    Limpar filtros
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Carregando feedbacks...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircleWarning className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum feedback encontrado</p>
            <p className="text-xs mt-1">Os feedbacks dos alunos aparecerão aqui</p>
          </div>
        ) : viewMode === "list" ? (
          <div>
            {filtered.map((fb) => (
              <FeedbackRow key={fb.id} fb={fb} onMark={markSeen} />
            ))}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((fb) => (
              <FeedbackCard key={fb.id} fb={fb} onMark={markSeen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersFeedbacksPage;
