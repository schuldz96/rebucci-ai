import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter, ChevronDown, ChevronUp, Search, Download, Plus,
  PartyPopper, Users, MessageCircle, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore } from "@/store/customerStore";
import NewCustomerModal from "@/components/customers/NewCustomerModal";
import { format, parseISO, differenceInDays, differenceInYears, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const CustomersListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { consultorias, plans, loading, fetchActives, fetchPlans } = useCustomerStore();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterExpiry, setFilterExpiry] = useState("all");
  const [filterApp, setFilterApp] = useState("all");
  const [filterSort, setFilterSort] = useState("name_asc");
  const [showModal, setShowModal] = useState(false);
  const [showBirthdays, setShowBirthdays] = useState(false);

  useEffect(() => {
    if (user) { fetchActives(user.id); fetchPlans(user.id); }
  }, [user]);

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
      if (filterApp === "with" && !customer.app_installed) return false;
      if (filterApp === "without" && customer.app_installed) return false;

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

  const statusLabel = (endDate: string) => {
    const days = differenceInDays(parseISO(endDate), today);
    if (days < 0) return { label: "Vencido", color: "text-destructive bg-destructive/10" };
    if (days <= 7) return { label: "Vencendo", color: "text-orange-400 bg-orange-400/10" };
    return { label: "Ativo", color: "text-green-400 bg-green-400/10" };
  };

  const birthdaysToday = consultorias.filter((c) => {
    if (!c.customers?.birthdate) return false;
    const parsed = parseISO(c.customers.birthdate);
    return parsed.getDate() === today.getDate() && parsed.getMonth() === today.getMonth();
  });

  const clearFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterPlan("all");
    setFilterExpiry("all"); setFilterApp("all"); setFilterSort("name_asc");
    setShowBirthdays(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Todos os Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{consultorias.length} alunos cadastrados</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {birthdaysToday.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", showBirthdays ? "border-violet-400/60 text-violet-400 bg-violet-400/10" : "text-violet-400 border-violet-400/40 hover:bg-violet-400/10")}
                onClick={() => setShowBirthdays(!showBirthdays)}
              >
                <PartyPopper className="w-4 h-4" />
                Aniversariantes ({birthdaysToday.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar lista
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              Adicionar manualmente
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
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nome, e-mail ou WhatsApp..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Status e Plano</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger><SelectValue placeholder="Status do plano" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterPlan} onValueChange={setFilterPlan}>
                      <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os planos</SelectItem>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterExpiry} onValueChange={setFilterExpiry}>
                      <SelectTrigger><SelectValue placeholder="Vencimento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os vencimentos</SelectItem>
                        <SelectItem value="7">Próximos 7 dias</SelectItem>
                        <SelectItem value="30">Próximos 30 dias</SelectItem>
                        <SelectItem value="expired">Vencidos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterApp} onValueChange={setFilterApp}>
                      <SelectTrigger><SelectValue placeholder="App instalado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="with">Com app instalado</SelectItem>
                        <SelectItem value="without">Sem app</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-4">
                    <Select value={filterSort} onValueChange={setFilterSort}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_asc">Nome A-Z</SelectItem>
                        <SelectItem value="name_desc">Nome Z-A</SelectItem>
                        <SelectItem value="newest">Mais recente</SelectItem>
                        <SelectItem value="expiry">Vencimento próximo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={clearFilters}>Limpar filtros</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr>
                {["Cliente", "WhatsApp", "E-mail", "Plano contratado", "Status", "Ações"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const customer = c.customers!;
                const st = statusLabel(c.end_date);
                const isBirthday = customer.birthdate &&
                  parseISO(customer.birthdate).getDate() === today.getDate() &&
                  parseISO(customer.birthdate).getMonth() === today.getMonth();

                return (
                  <tr
                    key={c.id}
                    className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => navigate(`/customers/${c.customer_id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{customer.name}</p>
                            {isBirthday && <PartyPopper className="w-3.5 h-3.5 text-violet-400" />}
                            {customer.app_installed && <Smartphone className="w-3 h-3 text-blue-400" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.end_date ? `Vence ${format(parseISO(c.end_date), "dd/MM/yyyy")}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{customer.whatsapp ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{customer.email ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.plans?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", st.color)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {customer.whatsapp && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customer.whatsapp!.replace(/\D/g, "")}`); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

export default CustomersListPage;
