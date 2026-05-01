import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Grid, List, Download, Plus, ChevronDown, ChevronUp,
  Users, MessageCircle, Calendar, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore, Consultoria } from "@/store/customerStore";
import NewCustomerModal from "@/components/customers/NewCustomerModal";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusLabel = (endDate: string) => {
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return { label: "Vencido", color: "text-destructive bg-destructive/10" };
  if (days <= 7) return { label: `Vence em ${days}d`, color: "text-orange-400 bg-orange-400/10" };
  return { label: "Ativo", color: "text-green-400 bg-green-400/10" };
};

const avatarInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

// ─── Card Grid ────────────────────────────────────────────────────────────────

const CustomerCard = ({ c, onClick }: { c: Consultoria; onClick: () => void }) => {
  const customer = c.customers!;
  const status = getStatusLabel(c.end_date);
  const daysLeft = differenceInDays(parseISO(c.end_date), new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
          {avatarInitials(customer.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{customer.name}</p>
          <p className="text-xs text-muted-foreground truncate">{c.plans?.name ?? "Sem plano"}</p>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", status.color)}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(parseISO(c.end_date), "dd/MM/yyyy")}
        </span>
        {customer.whatsapp && (
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </span>
        )}
      </div>

      {daysLeft >= 0 && daysLeft <= 30 && (
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full", daysLeft <= 7 ? "bg-orange-400" : "bg-primary")}
            style={{ width: `${Math.min(100, (daysLeft / 90) * 100)}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

// ─── Row List ─────────────────────────────────────────────────────────────────

const CustomerRow = ({ c, onClick }: { c: Consultoria; onClick: () => void }) => {
  const customer = c.customers!;
  const status = getStatusLabel(c.end_date);

  return (
    <tr
      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {avatarInitials(customer.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{customer.name}</p>
            <p className="text-xs text-muted-foreground">{customer.email ?? "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{customer.whatsapp ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{c.plans?.name ?? "Sem plano"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {format(parseISO(c.end_date), "dd/MM/yyyy")}
      </td>
      <td className="px-4 py-3">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.color)}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {customer.whatsapp && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customer.whatsapp?.replace(/\D/g, "")}`); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersActivePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { consultorias, plans, loading, fetchActives, fetchPlans } = useCustomerStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterModality, setFilterModality] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSort, setFilterSort] = useState("name");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActives(user.id);
      fetchPlans(user.id);
    }
  }, [user]);

  // Filtragem
  const filtered = consultorias
    .filter((c) => {
      if (!c.customers) return false;
      const q = search.toLowerCase();
      if (q && !c.customers.name.toLowerCase().includes(q) &&
          !(c.customers.email ?? "").toLowerCase().includes(q) &&
          !(c.customers.whatsapp ?? "").includes(q)) return false;
      if (filterPlan !== "all" && c.plan_id !== filterPlan) return false;
      if (filterModality !== "all" && c.plans?.modality !== filterModality) return false;
      if (filterStatus !== "all") {
        const days = differenceInDays(parseISO(c.end_date), new Date());
        if (filterStatus === "active" && days < 0) return false;
        if (filterStatus === "expiring" && (days < 0 || days > 7)) return false;
        if (filterStatus === "expired" && days >= 0) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filterSort === "name") return (a.customers?.name ?? "").localeCompare(b.customers?.name ?? "");
      if (filterSort === "expiry") return parseISO(a.end_date).getTime() - parseISO(b.end_date).getTime();
      return 0;
    });

  const pendingCount = filtered.filter((c) => differenceInDays(parseISO(c.end_date), new Date()) <= 7 && differenceInDays(parseISO(c.end_date), new Date()) >= 0).length;
  const activeCount = filtered.filter((c) => differenceInDays(parseISO(c.end_date), new Date()) > 7).length;

  const clearFilters = () => {
    setSearch(""); setFilterPlan("all"); setFilterModality("all");
    setFilterStatus("all"); setFilterSort("name");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alunos Ativos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{consultorias.length} alunos no total</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                <Clock className="w-3.5 h-3.5" />
                {pendingCount} Vencendo
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {activeCount} Ativos
            </span>
            <div className="flex items-center border border-border rounded-lg overflow-hidden ml-2">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar lista
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              Novo Aluno
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
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
                    <Input
                      placeholder="Buscar por nome, e-mail ou WhatsApp..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Select value={filterPlan} onValueChange={setFilterPlan}>
                      <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os planos</SelectItem>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterModality} onValueChange={setFilterModality}>
                      <SelectTrigger><SelectValue placeholder="Modalidade" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="consulta">Consulta</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="expiring">Vencendo (7 dias)</SelectItem>
                        <SelectItem value="expired">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterSort} onValueChange={setFilterSort}>
                      <SelectTrigger><SelectValue placeholder="Ordenação" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nome A-Z</SelectItem>
                        <SelectItem value="expiry">Vencimento próximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={clearFilters}>Limpar filtros</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Carregando alunos...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum aluno encontrado</p>
            <p className="text-xs mt-1">
              {consultorias.length === 0
                ? 'Adicione seu primeiro aluno clicando em "Novo Aluno"'
                : "Tente ajustar os filtros"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c) => (
              <CustomerCard
                key={c.id}
                c={c}
                onClick={() => navigate(`/customers/actives/${c.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CustomerRow
                    key={c.id}
                    c={c}
                    onClick={() => navigate(`/customers/actives/${c.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
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

export default CustomersActivePage;
