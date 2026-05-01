import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter, ChevronDown, Search, Download, Plus, PartyPopper,
  Users, MessageCircle, Smartphone, ClipboardList, Camera,
  Dumbbell, Salad, Activity, StickyNote, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore } from "@/store/customerStore";
import NewCustomerModal from "@/components/customers/NewCustomerModal";
import { format, parseISO, differenceInDays } from "date-fns";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CustomerBadges {
  hasAnamnese: boolean;
  hasPhotos: boolean;
  hasTreino: boolean;
  hasDieta: boolean;
  hasCardio: boolean;
  notesCount: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { consultorias, plans, loading, fetchActives, fetchPlans } = useCustomerStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterExpiry, setFilterExpiry] = useState("all");
  const [filterSort, setFilterSort] = useState("name_asc");
  const [showModal, setShowModal] = useState(false);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [badges, setBadges] = useState<Record<string, CustomerBadges>>({});
  const [badgesLoading, setBadgesLoading] = useState(false);

  useEffect(() => {
    if (user) { fetchActives(user.id); fetchPlans(user.id); }
  }, [user]);

  // Busca badges para todos os alunos ativos
  const loadBadges = useCallback(async (customerIds: string[], coachId: string) => {
    if (!customerIds.length) return;
    setBadgesLoading(true);

    const [anamnese, photos, treinos, dietas, cardio, notes] = await Promise.all([
      supabase.from("anamnesis").select("customer_id").eq("coach_id", coachId).in("customer_id", customerIds),
      supabase.from("progress_photos").select("customer_id").eq("coach_id", coachId).in("customer_id", customerIds),
      supabase.from("customer_workout_plans").select("customer_id").in("customer_id", customerIds),
      supabase.from("customer_diet_plans").select("customer_id").in("customer_id", customerIds),
      supabase.from("cardio_logs").select("customer_id").eq("coach_id", coachId).in("customer_id", customerIds),
      supabase.from("customer_notes").select("customer_id").eq("coach_id", coachId).in("customer_id", customerIds),
    ]);

    const anamneseSet = new Set((anamnese.data ?? []).map((r) => r.customer_id));
    const photosSet = new Set((photos.data ?? []).map((r) => r.customer_id));
    const treinosSet = new Set((treinos.data ?? []).map((r) => r.customer_id));
    const dietasSet = new Set((dietas.data ?? []).map((r) => r.customer_id));
    const cardioSet = new Set((cardio.data ?? []).map((r) => r.customer_id));
    const notesCounts: Record<string, number> = {};
    (notes.data ?? []).forEach((r) => { notesCounts[r.customer_id] = (notesCounts[r.customer_id] ?? 0) + 1; });

    const result: Record<string, CustomerBadges> = {};
    customerIds.forEach((id) => {
      result[id] = {
        hasAnamnese: anamneseSet.has(id),
        hasPhotos: photosSet.has(id),
        hasTreino: treinosSet.has(id),
        hasDieta: dietasSet.has(id),
        hasCardio: cardioSet.has(id),
        notesCount: notesCounts[id] ?? 0,
      };
    });

    setBadges(result);
    setBadgesLoading(false);
  }, []);

  useEffect(() => {
    if (!user || !consultorias.length) return;
    const ids = consultorias.map((c) => c.customer_id).filter(Boolean);
    loadBadges(ids, user.id);
  }, [consultorias, user, loadBadges]);

  const today = new Date();

  const filtered = consultorias
    .filter((c) => {
      if (!c.customers) return false;
      const customer = c.customers;
      const q = search.toLowerCase();
      if (q && !customer.name.toLowerCase().includes(q) &&
          !(customer.email ?? "").toLowerCase().includes(q) &&
          !(customer.whatsapp ?? "").includes(q)) return false;

      if (filterStatus !== "all") {
        if (filterStatus === "active" && c.status !== "active") return false;
        if (filterStatus === "inactive" && c.status === "active") return false;
      }
      if (filterPlan !== "all" && c.plan_id !== filterPlan) return false;

      if (filterExpiry !== "all") {
        const days = differenceInDays(parseISO(c.end_date), today);
        if (filterExpiry === "7" && (days < 0 || days > 7)) return false;
        if (filterExpiry === "30" && (days < 0 || days > 30)) return false;
        if (filterExpiry === "expired" && days >= 0) return false;
      }

      if (showBirthdays) {
        const bday = customer.birthdate;
        if (!bday) return false;
        const parsed = parseISO(bday);
        return parsed.getDate() === today.getDate() && parsed.getMonth() === today.getMonth();
      }

      return true;
    })
    .sort((a, b) => {
      const na = a.customers?.name ?? "";
      const nb = b.customers?.name ?? "";
      if (filterSort === "name_asc") return na.localeCompare(nb);
      if (filterSort === "name_desc") return nb.localeCompare(na);
      if (filterSort === "newest") return parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
      if (filterSort === "expiry") return parseISO(a.end_date).getTime() - parseISO(b.end_date).getTime();
      return 0;
    });

  const birthdaysToday = consultorias.filter((c) => {
    if (!c.customers?.birthdate) return false;
    const parsed = parseISO(c.customers.birthdate);
    return parsed.getDate() === today.getDate() && parsed.getMonth() === today.getMonth();
  });

  // Stats para o header
  const pendentes = filtered.filter((c) => {
    const b = badges[c.customer_id];
    if (!b) return false;
    return !b.hasAnamnese || !b.hasTreino || !b.hasDieta;
  }).length;

  const entregues = filtered.length - pendentes;

  const clearFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterPlan("all");
    setFilterExpiry("all"); setFilterSort("name_asc"); setShowBirthdays(false);
  };

  const daysLabel = (endDate: string) => {
    const days = differenceInDays(parseISO(endDate), today);
    if (days < 0) return { text: `${Math.abs(days)}d vencido`, color: "text-destructive bg-destructive/10" };
    if (days === 0) return { text: "Vence hoje", color: "text-orange-400 bg-orange-400/10" };
    if (days <= 7) return { text: `${days}d restantes`, color: "text-orange-400 bg-orange-400/10" };
    if (days <= 30) return { text: `${days}d restantes`, color: "text-yellow-400 bg-yellow-400/10" };
    return { text: `${days}d restantes`, color: "text-muted-foreground bg-muted/60" };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">Alunos Ativos</h1>
            {!badgesLoading && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-muted-foreground">{pendentes} Pendentes</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{entregues} Entregues</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {birthdaysToday.length > 0 && (
              <Button
                variant="outline" size="sm"
                className={cn("gap-2", showBirthdays ? "border-violet-400/60 text-violet-400 bg-violet-400/10" : "text-violet-400 border-violet-400/40 hover:bg-violet-400/10")}
                onClick={() => setShowBirthdays(!showBirthdays)}
              >
                <PartyPopper className="w-4 h-4" />
                Aniversariantes ({birthdaysToday.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Exportar lista
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Novo Aluno
            </Button>
          </div>
        </div>

        {/* Barra de busca + filtros */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline" size="sm"
            className={cn("gap-2 shrink-0", filtersOpen && "border-primary/60 text-primary bg-primary/5")}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="w-4 h-4" />
            Filtros
            <ChevronDown className={cn("w-3 h-3 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger><SelectValue placeholder="Todos os planos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterExpiry} onValueChange={setFilterExpiry}>
                  <SelectTrigger><SelectValue placeholder="Vencimento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as datas</SelectItem>
                    <SelectItem value="7">Próximos 7 dias</SelectItem>
                    <SelectItem value="30">Próximos 30 dias</SelectItem>
                    <SelectItem value="expired">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSort} onValueChange={setFilterSort}>
                  <SelectTrigger><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Nome A-Z</SelectItem>
                    <SelectItem value="name_desc">Nome Z-A</SelectItem>
                    <SelectItem value="newest">Mais recente</SelectItem>
                    <SelectItem value="expiry">Vencimento próximo</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={clearFilters} className="h-9">
                  Limpar filtros
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de cards */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c, i) => {
              const customer = c.customers!;
              const b = badges[c.customer_id];
              const days = daysLabel(c.end_date);
              const isBirthday = customer.birthdate &&
                parseISO(customer.birthdate).getDate() === today.getDate() &&
                parseISO(customer.birthdate).getMonth() === today.getMonth();
              const initials = customer.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/customers/${c.customer_id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 cursor-pointer transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {initials}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{customer.name}</p>
                      {isBirthday && <PartyPopper className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                      {customer.app_installed && <Smartphone className="w-3 h-3 text-blue-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {customer.email && <span className="truncate max-w-[180px]">{customer.email}</span>}
                      {customer.email && customer.whatsapp && <span>·</span>}
                      {customer.whatsapp && <span>{customer.whatsapp}</span>}
                    </div>
                    {c.plans?.name && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{c.plans.name}</p>
                    )}
                  </div>

                  {/* Badges de módulos */}
                  <div className="hidden md:flex items-center gap-1.5 flex-wrap shrink-0">
                    <ModuleBadge icon={ClipboardList} label="Anamnese" active={b?.hasAnamnese} loading={!b} />
                    <ModuleBadge icon={Camera} label="Fotos" active={b?.hasPhotos} loading={!b} />
                    <ModuleBadge icon={Dumbbell} label="Treino" active={b?.hasTreino} loading={!b} />
                    <ModuleBadge icon={Salad} label="Dieta" active={b?.hasDieta} loading={!b} />
                    <ModuleBadge icon={Activity} label="Cardio" active={b?.hasCardio} loading={!b} />
                    {b && b.notesCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-400/10 text-violet-400">
                        <StickyNote className="w-3 h-3" />
                        {b.notesCount} {b.notesCount === 1 ? "nota" : "notas"}
                      </span>
                    )}
                  </div>

                  {/* Dias restantes */}
                  <span className={cn("hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap", days.color)}>
                    {days.text}
                  </span>

                  {/* WhatsApp + seta */}
                  <div className="flex items-center gap-1 shrink-0">
                    {customer.whatsapp && (
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customer.whatsapp!.replace(/\D/g, "")}`); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <NewCustomerModal
            plans={plans}
            onClose={() => setShowModal(false)}
            onCreated={() => { setShowModal(false); if (user) fetchActives(user.id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Badge de módulo ──────────────────────────────────────────────────────────

const ModuleBadge = ({
  icon: Icon, label, active, loading,
}: { icon: React.ElementType; label: string; active?: boolean; loading?: boolean }) => (
  <span className={cn(
    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors",
    loading ? "bg-muted/40 text-muted-foreground/40" :
    active  ? "bg-green-500/10 text-green-400" : "bg-muted/50 text-muted-foreground/50"
  )}>
    <Icon className="w-3 h-3" />
    {label}
  </span>
);

export default CustomersListPage;
