import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter, ChevronDown, ChevronUp, Search, Plus, Copy, Package,
  Link, Edit2, Trash2, MoreHorizontal, ToggleLeft, ToggleRight,
  Users, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  modality: string;
  active: boolean;
  auto_schedule_feedbacks: boolean;
  feedback_frequency_days: number;
  created_at: string;
  plan_category?: string;
  active_count?: number;
}

const MODALITY_LABEL: Record<string, string> = {
  online: "Online",
  personal: "Personal",
  consulta: "Consulta",
};

const MODALITY_COLOR: Record<string, string> = {
  online: "text-blue-400 bg-blue-400/10",
  personal: "text-violet-400 bg-violet-400/10",
  consulta: "text-teal-400 bg-teal-400/10",
};

const CATEGORY_LABEL: Record<string, string> = {
  principal: "Plano Principal",
  extension: "Extensão",
  addon: "Adicional",
};

const CATEGORY_COLOR: Record<string, string> = {
  principal: "text-violet-400 bg-violet-400/10",
  extension: "text-orange-400 bg-orange-400/10",
  addon: "text-teal-400 bg-teal-400/10",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProductsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModality, setFilterModality] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Busca planos + contagem de alunos ativos em cada
    const { data: plansData } = await supabase
      .from("plans")
      .select("*")
      .eq("coach_id", user.id)
      .order("name");

    if (!plansData) { setLoading(false); return; }

    // Para cada plano, busca a contagem de consultorias ativas
    const withCounts = await Promise.all(
      plansData.map(async (p) => {
        const { count } = await supabase
          .from("consultorias")
          .select("id", { count: "exact", head: true })
          .eq("coach_id", user.id)
          .eq("plan_id", p.id)
          .eq("status", "active");
        return { ...p, active_count: count ?? 0 };
      })
    );

    setPlans(withCounts);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleToggleActive = async (plan: Plan) => {
    await supabase.from("plans").update({ active: !plan.active }).eq("id", plan.id);
    setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, active: !p.active } : p));
    toast({ title: plan.active ? "Produto desativado" : "Produto ativado" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto? Alunos já vinculados não serão afetados.")) return;
    await supabase.from("plans").delete().eq("id", id);
    toast({ title: "Produto excluído" });
    load();
    setMenuOpen(null);
  };

  const handleDuplicate = async (plan: Plan) => {
    await supabase.from("plans").insert({
      coach_id: user!.id,
      name: `${plan.name} (cópia)`,
      price: plan.price,
      duration_days: plan.duration_days,
      modality: plan.modality,
      active: false,
      auto_schedule_feedbacks: plan.auto_schedule_feedbacks,
      feedback_frequency_days: plan.feedback_frequency_days,
    });
    toast({ title: "Produto duplicado!" });
    load();
    setMenuOpen(null);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/produtos`);
    toast({ title: "URL copiada!", description: "Link de produtos copiado para a área de transferência." });
  };

  const filtered = plans.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModality !== "all" && p.modality !== filterModality) return false;
    if (filterStatus === "active" && !p.active) return false;
    if (filterStatus === "inactive" && p.active) return false;
    return true;
  });

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuOpen(null)}>
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{plans.length} produtos cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={copyUrl}>
              <Link className="w-4 h-4" />
              URL — Todos os planos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: "Simular Venda", description: "Funcionalidade em desenvolvimento" })}
            >
              Simular Venda
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/products/new")}>
              <Plus className="w-4 h-4" />
              Novo produto
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar por nome..." className="pl-9 w-[280px]" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={filterModality} onValueChange={setFilterModality}>
                      <SelectTrigger className="w-[160px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="consulta">Consulta</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => { setSearch(""); setFilterModality("all"); setFilterStatus("all"); }}>
                      Limpar
                    </Button>
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
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{plans.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}</p>
            {plans.length === 0 && (
              <Button size="sm" className="mt-4 gap-2" onClick={() => navigate("/products/new")}>
                <Plus className="w-4 h-4" />Criar primeiro produto
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_120px_100px_100px_80px_120px] gap-4 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-t-xl">
              <span>Nome</span>
              <span>Modalidade</span>
              <span>Duração</span>
              <span>Preço</span>
              <span>Alunos</span>
              <span>Ações</span>
            </div>

            {/* Linhas */}
            {filtered.map((plan, i) => (
              <div
                key={plan.id}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "grid grid-cols-[1fr_120px_100px_100px_80px_120px] gap-4 px-4 py-3 items-center group transition-colors hover:bg-muted/20",
                  i !== filtered.length - 1 && "border-b border-border/50",
                  !plan.active && "opacity-60"
                )}
              >
                {/* Nome + badge status */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{plan.name}</p>
                      {plan.plan_category && (
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", CATEGORY_COLOR[plan.plan_category] ?? "bg-muted text-muted-foreground")}>
                          {CATEGORY_LABEL[plan.plan_category] ?? plan.plan_category}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-semibold", plan.active ? "text-green-400" : "text-muted-foreground")}>
                      {plan.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                {/* Modalidade */}
                <div>
                  {plan.modality ? (
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", MODALITY_COLOR[plan.modality] ?? "bg-muted text-muted-foreground")}>
                      {MODALITY_LABEL[plan.modality] ?? plan.modality}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </div>

                {/* Duração */}
                <span className="text-sm text-muted-foreground">{plan.duration_days} dias</span>

                {/* Preço */}
                <span className="text-sm font-semibold text-foreground">{fmtBRL(plan.price)}</span>

                {/* Alunos */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{plan.active_count}</span>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 relative">
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => navigate(`/products/${plan.id}/edit`)}>
                    <Edit2 className="w-3 h-3 mr-1" />Editar
                  </Button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === plan.id ? null : plan.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {menuOpen === plan.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-xl z-20 py-1 min-w-[160px]"
                      >
                        <button onClick={() => handleDuplicate(plan)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                          <Copy className="w-3.5 h-3.5" />Duplicar
                        </button>
                        <button onClick={() => handleToggleActive(plan)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                          {plan.active ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                          {plan.active ? "Desativar" : "Ativar"}
                        </button>
                        <div className="border-t border-border my-1" />
                        <button onClick={() => handleDelete(plan.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />Excluir
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsListPage;
