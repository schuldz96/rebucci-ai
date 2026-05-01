import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserMinus, Search, Download, MessageCircle, Link2,
  Loader2, Filter, X, Phone, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { differenceInDays, format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Dropout {
  consultoriaId: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerWhatsapp: string | null;
  customerPhone: string | null;
  planName: string | null;
  planId: string | null;
  endDate: string;
  daysInactive: number;
  purchaseCount: number;
  value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-green-500","bg-orange-500",
  "bg-pink-500","bg-teal-500","bg-amber-500","bg-rose-500",
];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

function daysLabel(days: number) {
  if (days === 0) return "Vencido hoje";
  if (days === 1) return "Vencido ontem";
  return `Vencido há ${days}d`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersDropoutsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [items, setItems] = useState<Dropout[]>([]);
  const [allItems, setAllItems] = useState<Dropout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("consultorias")
      .select("id, customer_id, end_date, value, plan_id, customers(name, email, whatsapp, phone), plans(id, name)")
      .eq("coach_id", user.id)
      .or(`status.eq.inactive,end_date.lt.${today}`)
      .order("end_date", { ascending: false })
      .limit(200);

    if (!data) { setLoading(false); return; }

    // Para cada aluno, conta quantas consultorias já teve
    const customerIds = [...new Set(data.map((c) => c.customer_id))];
    const { data: counts } = await supabase
      .from("consultorias")
      .select("customer_id")
      .eq("coach_id", user.id)
      .in("customer_id", customerIds);

    const countMap: Record<string, number> = {};
    (counts ?? []).forEach((c) => { countMap[c.customer_id] = (countMap[c.customer_id] ?? 0) + 1; });

    const mapped: Dropout[] = data
      .filter((c) => c.customers)
      .map((c) => ({
        consultoriaId: c.id,
        customerId: c.customer_id,
        customerName: (c.customers as any)?.name ?? "—",
        customerEmail: (c.customers as any)?.email ?? null,
        customerWhatsapp: (c.customers as any)?.whatsapp ?? null,
        customerPhone: (c.customers as any)?.phone ?? null,
        planName: (c.plans as any)?.name ?? null,
        planId: (c.plans as any)?.id ?? null,
        endDate: c.end_date,
        daysInactive: differenceInDays(new Date(), parseISO(c.end_date)),
        purchaseCount: countMap[c.customer_id] ?? 1,
        value: c.value ?? 0,
      }));

    setAllItems(mapped);
    setItems(mapped);

    // Planos únicos para o filtro
    const uniquePlans = Array.from(
      new Map(mapped.filter((i) => i.planId && i.planName).map((i) => [i.planId, { id: i.planId!, name: i.planName! }])).values()
    );
    setPlans(uniquePlans);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const applyFilters = () => {
    let result = allItems;
    const q = search.toLowerCase();
    if (q) result = result.filter((i) =>
      i.customerName.toLowerCase().includes(q) || (i.customerEmail ?? "").toLowerCase().includes(q)
    );
    if (filterPlan !== "all") result = result.filter((i) => i.planId === filterPlan);
    if (filterPeriod === "30") result = result.filter((i) => i.daysInactive <= 30);
    if (filterPeriod === "90") result = result.filter((i) => i.daysInactive > 30 && i.daysInactive <= 90);
    if (filterPeriod === "90plus") result = result.filter((i) => i.daysInactive > 90);
    return result;
  };

  const filtered = applyFilters();

  const handleExport = () => {
    const rows = [
      ["Nome","Email","WhatsApp","Plano","Venceu em","Inativo há (dias)","Compras","Valor"],
      ...filtered.map((i) => [i.customerName, i.customerEmail ?? "", i.customerWhatsapp ?? "", i.planName ?? "", i.endDate, i.daysInactive, i.purchaseCount, i.value]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "desistencias.csv"; a.click();
  };

  const handleWhatsApp = (item: Dropout) => {
    const num = (item.customerWhatsapp ?? item.customerPhone ?? "").replace(/\D/g, "");
    if (!num) { toast({ title: "WhatsApp não cadastrado", variant: "destructive" }); return; }
    const msg = encodeURIComponent(`Olá ${item.customerName}! Seu plano ${item.planName ?? ""} venceu. Gostaria de renovar?`);
    window.open(`https://wa.me/55${num}?text=${msg}`, "_blank");
  };

  const handleCopyRenewalLink = (item: Dropout) => {
    const link = `${window.location.origin}/renewal/${item.consultoriaId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Cole e envie para o aluno." });
  };

  const clearFilters = () => { setSearch(""); setFilterPlan("all"); setFilterPeriod("all"); };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Desistências</h1>
            <p className="text-sm text-muted-foreground">Seus alunos que não renovaram</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Exportar lista
          </Button>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            {/* Busca */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Buscar por nome ou email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {/* Filtrar por plano */}
            <div className="min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Filtrar por plano</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="all">Todos os planos</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Filtrar por período */}
            <div className="min-w-[160px]">
              <label className="text-xs text-muted-foreground mb-1 block">Filtrar por período</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="all">Todo o período</option>
                <option value="30">Até 30 dias</option>
                <option value="90">30–90 dias</option>
                <option value="90plus">+90 dias</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button size="sm" className="h-9 gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filtrar
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <UserMinus className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma desistência encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.consultoriaId}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
              >
                {/* Avatar */}
                <button
                  onClick={() => navigate(`/customers/${item.customerId}`)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                    getAvatarColor(item.customerName),
                  )}
                >
                  {item.customerName.charAt(0).toUpperCase()}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/customers/${item.customerId}`)}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {item.customerName}
                    </button>
                    {item.customerEmail && (
                      <span className="text-xs text-muted-foreground">{item.customerEmail}</span>
                    )}
                    {item.customerWhatsapp && (
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    {item.customerPhone && !item.customerWhatsapp && (
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    {/* Badge vencido */}
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                      item.daysInactive <= 7  ? "bg-red-500/15 text-red-400" :
                      item.daysInactive <= 30 ? "bg-orange-500/15 text-orange-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {daysLabel(item.daysInactive)}
                    </span>
                    {/* Badge compras */}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      {item.purchaseCount} {item.purchaseCount === 1 ? "compra" : "compras"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.planName ?? "Plano não definido"}
                    <span className="mx-1">·</span>
                    Vencido em {format(parseISO(item.endDate), "dd/MM/yyyy")}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={() => handleWhatsApp(item)}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar mensagem
                  </Button>
                  <button
                    onClick={() => handleCopyRenewalLink(item)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Copiar link de renovação
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersDropoutsPage;
