import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter, Grid, List, ChevronDown, ChevronUp, Search,
  MessageCircleWarning, AlertTriangle, Clock, CheckCircle2,
  Image, Eye, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore, Feedback } from "@/store/customerStore";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "Aguardando resposta", color: "text-blue-400 bg-blue-400/10", icon: Clock },
  partial:  { label: "Parcial",    color: "text-yellow-400 bg-yellow-400/10", icon: Clock },
  answered: { label: "Respondido", color: "text-green-400 bg-green-400/10",  icon: CheckCircle2 },
  seen:     { label: "Visto",      color: "text-muted-foreground bg-muted",   icon: Eye },
  expired:  { label: "Expirado",   color: "text-destructive bg-destructive/10", icon: AlertTriangle },
};

const avatarInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

// ─── FeedbackRow ─────────────────────────────────────────────────────────────

const FeedbackRow = ({ fb, onMark }: { fb: Feedback; onMark: (id: string) => void }) => {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[fb.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const customer = fb.customers;
  const planName = fb.consultorias?.plans?.name ?? "—";

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors">
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
        {customer ? avatarInitials(customer.name) : <User className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fb.customer_id && navigate(`/customers/${fb.customer_id}`)}
            className="text-sm font-semibold text-foreground truncate hover:text-primary hover:underline transition-colors"
          >
            {customer?.name ?? "—"}
          </button>
          {fb.has_photos && (
            <span className="flex items-center gap-0.5 text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-full">
              <Image className="w-2.5 h-2.5" />
              Fotos
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{planName}</p>
      </div>

      <div className="text-xs text-muted-foreground shrink-0">
        {fb.scheduled_for ? format(parseISO(fb.scheduled_for), "dd/MM/yyyy", { locale: ptBR }) : "—"}
      </div>

      <div className="text-xs text-muted-foreground shrink-0">
        {fb.answered_at ? format(parseISO(fb.answered_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}
      </div>

      <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.color)}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>

      {(fb.status === "answered" || fb.status === "partial") && (
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => onMark(fb.id)}>
          Marcar visto
        </Button>
      )}
    </div>
  );
};

// ─── FeedbackCard ─────────────────────────────────────────────────────────────

const FeedbackCard = ({ fb, onMark }: { fb: Feedback; onMark: (id: string) => void }) => {
  const cfg = STATUS_CONFIG[fb.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const customer = fb.customers;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {customer ? avatarInitials(customer.name) : <User className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{customer?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{fb.consultorias?.plans?.name ?? "—"}</p>
        </div>
        <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.color)}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {fb.has_photos && (
          <span className="flex items-center gap-1 text-violet-400">
            <Image className="w-3 h-3" />
            Com fotos
          </span>
        )}
        <span className="ml-auto">
          {fb.answered_at ? `Respondido em ${format(parseISO(fb.answered_at), "dd/MM", { locale: ptBR })}` :
            fb.scheduled_for ? `Previsto: ${format(parseISO(fb.scheduled_for), "dd/MM", { locale: ptBR })}` : "—"}
        </span>
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

// Tipo que unifica appointments tipo feedback com a interface Feedback usada pela UI
interface ApptFeedback {
  id: string;
  customer_id: string;
  status: string;
  scheduled_for?: string;
  answered_at?: string;
  has_photos: boolean;
  customers?: { id: string; name: string; photo_url?: string };
  consultorias?: { plans?: { name: string } } | null;
  created_at: string;
}

const CustomersFeedbacksPage = () => {
  const { user } = useAuthStore();
  const markSeen = async (id: string) => {
    await supabase.from("appointments").update({ status: "done" }).eq("id", id);
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: "answered", answered_at: new Date().toISOString() } : f));
  };

  const [feedbacks, setFeedbacks] = useState<ApptFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPhotos, setFilterPhotos] = useState("all");
  const [filterSort, setFilterSort] = useState("default");
  const [showExpired, setShowExpired] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Busca agendamentos do tipo feedback
    const { data: apts } = await supabase
      .from("appointments")
      .select("id, customer_id, status, scheduled_at, coach_id")
      .eq("coach_id", user.id)
      .eq("type", "feedback")
      .order("scheduled_at", { ascending: false });

    if (!apts?.length) { setFeedbacks([]); setLoading(false); return; }

    // Busca dados dos customers em paralelo
    const customerIds = [...new Set(apts.map(a => a.customer_id).filter(Boolean))];
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, photo_url")
      .in("id", customerIds);

    const customerMap = Object.fromEntries((customers ?? []).map(c => [c.id, c]));

    // Mapeia para o formato esperado pela UI
    const mapped: ApptFeedback[] = apts.map(a => ({
      id: a.id,
      customer_id: a.customer_id,
      status: a.status === "done" || a.status === "completed" ? "answered"
            : a.status === "cancelled" ? "expired"
            : "pending",
      scheduled_for: a.scheduled_at,
      answered_at: (a.status === "done" || a.status === "completed") ? a.scheduled_at : undefined,
      has_photos: false,
      customers: customerMap[a.customer_id],
      consultorias: null,
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
        const priority = { answered: 0, partial: 1, pending: 2, seen: 3, expired: 4 };
        return (priority[a.status] ?? 5) - (priority[b.status] ?? 5);
      }
      if (filterSort === "newest") return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
      if (filterSort === "oldest") return parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime();
      if (filterSort === "name") return (a.customers?.name ?? "").localeCompare(b.customers?.name ?? "");
      return 0;
    });

  const pendingCount = feedbacks.filter((f) => f.status === "pending" || f.status === "partial").length;
  const answeredCount = feedbacks.filter((f) => f.status === "answered").length;

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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="pending">Aguardando resposta</SelectItem>
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
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-1">Ordenação</p>
                  <Select value={filterSort} onValueChange={setFilterSort}>
                    <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Padrão (não lidos primeiro)</SelectItem>
                      <SelectItem value="newest">Data mais recente</SelectItem>
                      <SelectItem value="oldest">Data mais antiga</SelectItem>
                      <SelectItem value="name">Nome A-Z</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPhotos("all"); setFilterSort("default"); }}>
                      Limpar filtros
                    </Button>
                  </div>
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
              <FeedbackRow key={fb.id} fb={fb as any} onMark={markSeen} />
            ))}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((fb) => (
              <FeedbackCard key={fb.id} fb={fb as any} onMark={markSeen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersFeedbacksPage;
