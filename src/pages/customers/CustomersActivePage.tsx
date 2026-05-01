import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Grid, List, Download, Plus, ChevronDown, ChevronUp,
  Users, MessageCircle, Calendar, CheckCircle2, Clock, ChevronRight,
  StickyNote, Phone,
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
import { supabase } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusInfo = (endDate: string) => {
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return { label: "Vencido", color: "text-destructive bg-destructive/10", days };
  if (days <= 7) return { label: "Vencendo", color: "text-orange-400 bg-orange-400/10", days };
  return { label: "Ativo", color: "text-green-400 bg-green-400/10", days };
};

const avatarColors = [
  "bg-violet-500/30 text-violet-300",
  "bg-blue-500/30 text-blue-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-orange-500/30 text-orange-300",
  "bg-pink-500/30 text-pink-300",
  "bg-cyan-500/30 text-cyan-300",
];

const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

const avatarInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

// ─── Tag chip ─────────────────────────────────────────────────────────────────

const Tag = ({ label, active, color }: { label: string; active: boolean; color: string }) => (
  <span className={cn(
    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
    active
      ? `${color} border-transparent`
      : "text-muted-foreground/50 border-border/40 bg-transparent line-through decoration-muted-foreground/30"
  )}>
    {active && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
    {label}
  </span>
);

// ─── Rich Row ─────────────────────────────────────────────────────────────────

interface RichRowProps {
  c: Consultoria;
  notesCount: number;
  onClick: () => void;
}

const CustomerRichRow = ({ c, notesCount, onClick }: RichRowProps) => {
  const customer = c.customers!;
  const status = getStatusInfo(c.end_date);
  const avatarColor = getAvatarColor(customer.name);

  const modality = c.plans?.modality ?? "";
  const modalityLabel =
    modality === "online" ? "Online" :
    modality === "personal" ? "Personal" :
    modality === "consulta" ? "Consulta" : null;

  const hasEmail = !!customer.email;
  const hasWhatsApp = !!customer.whatsapp;
  const hasPhone = !!customer.phone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-muted/20 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor)}>
        {avatarInitials(customer.name)}
      </div>

      {/* Nome + contatos */}
      <div className="w-56 shrink-0">
        <p className="text-sm font-semibold text-foreground truncate">{customer.name}</p>
        <div className="flex flex-col gap-0.5 mt-0.5">
          {customer.email && (
            <p className="text-[11px] text-muted-foreground truncate">{customer.email}</p>
          )}
          {(customer.whatsapp || customer.phone) && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" />
              {customer.whatsapp ?? customer.phone}
            </p>
          )}
        </div>
      </div>

      {/* Plano */}
      <div className="w-44 shrink-0">
        <p className="text-xs text-foreground/80 font-medium truncate">{c.plans?.name ?? "Sem plano"}</p>
        {modalityLabel && (
          <p className="text-[11px] text-muted-foreground">{modalityLabel}</p>
        )}
      </div>

      {/* Tags de contexto */}
      <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
        <Tag label="E-mail" active={hasEmail} color="text-blue-400 bg-blue-400/10" />
        <Tag label="WhatsApp" active={hasWhatsApp} color="text-green-400 bg-green-400/10" />
        <Tag label="Telefone" active={hasPhone} color="text-cyan-400 bg-cyan-400/10" />
        {notesCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-amber-400 bg-amber-400/10">
            <StickyNote className="w-2.5 h-2.5" />
            {notesCount} nota{notesCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Dias restantes */}
      <div className="shrink-0 text-right w-32">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.color)}>
          {status.label}
        </span>
        <p className="text-[11px] text-muted-foreground mt-1">
          {status.days >= 0
            ? `${status.days} dia${status.days !== 1 ? "s" : ""} restante${status.days !== 1 ? "s" : ""}`
            : `Venceu há ${Math.abs(status.days)}d`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {hasWhatsApp && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customer.whatsapp!.replace(/\D/g, "")}`); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </motion.div>
  );
};

// ─── Card Grid ────────────────────────────────────────────────────────────────

const CustomerCard = ({ c, notesCount, onClick }: RichRowProps) => {
  const customer = c.customers!;
  const status = getStatusInfo(c.end_date);
  const avatarColor = getAvatarColor(customer.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor)}>
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
        {notesCount > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <StickyNote className="w-3 h-3" />
            {notesCount} nota{notesCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Tag label="E-mail" active={!!customer.email} color="text-blue-400 bg-blue-400/10" />
        <Tag label="WhatsApp" active={!!customer.whatsapp} color="text-green-400 bg-green-400/10" />
      </div>
    </motion.div>
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
  const [notesMap, setNotesMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchActives(user.id);
      fetchPlans(user.id);
    }
  }, [user]);

  // Busca contagem de notas por customer quando a lista carrega
  useEffect(() => {
    if (!consultorias.length) return;
    const customerIds = consultorias.map(c => c.customer_id).filter(Boolean);
    if (!customerIds.length) return;

    supabase
      .from("customer_notes")
      .select("customer_id")
      .in("customer_id", customerIds)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach(n => { map[n.customer_id] = (map[n.customer_id] ?? 0) + 1; });
        setNotesMap(map);
      });
  }, [consultorias]);

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
                notesCount={notesMap[c.customer_id] ?? 0}
                onClick={() => navigate(`/customers/actives/${c.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Header colunas */}
            <div className="flex items-center gap-4 px-5 py-2.5 bg-muted/40 border-b border-border">
              <div className="w-10 shrink-0" />
              <div className="w-56 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Aluno</div>
              <div className="w-44 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Plano</div>
              <div className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Informações</div>
              <div className="w-32 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</div>
              <div className="w-16 shrink-0" />
            </div>
            {filtered.map((c) => (
              <CustomerRichRow
                key={c.id}
                c={c}
                notesCount={notesMap[c.customer_id] ?? 0}
                onClick={() => navigate(`/customers/actives/${c.id}`)}
              />
            ))}
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
