import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserMinus, Search, RefreshCw, MessageCircle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Dropout {
  consultoriaId: string;
  customerId: string;
  customerName: string;
  customerWhatsapp?: string;
  planName: string | null;
  endDate: string;
  daysInactive: number;
  value: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CustomersDropoutsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [items, setItems] = useState<Dropout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [reactivating, setReactivating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("consultorias")
      .select("id, customer_id, end_date, value, customers(name, whatsapp), plans(name)")
      .eq("coach_id", user.id)
      .or("status.eq.inactive,end_date.lt." + new Date().toISOString().slice(0, 10))
      .order("end_date", { ascending: false })
      .limit(100);

    setItems(
      (data ?? [])
        .filter((c) => c.customers)
        .map((c) => ({
          consultoriaId: c.id,
          customerId: c.customer_id,
          customerName: (c.customers as any)?.name ?? "—",
          customerWhatsapp: (c.customers as any)?.whatsapp,
          planName: (c.plans as any)?.name ?? null,
          endDate: c.end_date,
          daysInactive: differenceInDays(new Date(), parseISO(c.end_date)),
          value: c.value ?? 0,
        }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleReactivate = async (item: Dropout) => {
    setReactivating(item.consultoriaId);
    const newEnd = format(new Date(Date.now() + 90 * 86400000), "yyyy-MM-dd");
    const { error } = await supabase
      .from("consultorias")
      .update({ status: "active", end_date: newEnd, payment_status: "paid" })
      .eq("id", item.consultoriaId);
    setReactivating(null);
    if (error) { toast({ title: "Erro ao reativar", variant: "destructive" }); return; }
    toast({ title: `${item.customerName} reativado por 90 dias!` });
    load();
  };

  const filtered = items.filter((item) => {
    if (search && !item.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPeriod !== "all") {
      const days = item.daysInactive;
      if (filterPeriod === "30" && days > 30) return false;
      if (filterPeriod === "90" && (days <= 30 || days > 90)) return false;
      if (filterPeriod === "90plus" && days <= 90) return false;
    }
    return true;
  });

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalPotential = filtered.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Desistências</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-sm text-muted-foreground">{items.length} alunos inativos</p>
              {items.length > 0 && (
                <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full font-medium">
                  {fmtBRL(totalPotential)} em potencial de reativação
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {[
            { key: "all", label: "Todos" },
            { key: "30", label: "Até 30 dias" },
            { key: "90", label: "30–90 dias" },
            { key: "90plus", label: "+90 dias" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterPeriod(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filterPeriod === f.key ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["Aluno", "Plano", "Venceu em", "Inativo há", "Valor", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.consultoriaId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/customers/${item.customerId}`)} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                          {item.customerName.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{item.customerName}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.planName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(parseISO(item.endDate), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        item.daysInactive <= 30 ? "text-yellow-400 bg-yellow-400/10" :
                        item.daysInactive <= 90 ? "text-orange-400 bg-orange-400/10" :
                        "text-red-400 bg-red-400/10"
                      )}>
                        {item.daysInactive}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtBRL(item.value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {item.customerWhatsapp && (
                          <button
                            onClick={() => window.open(`https://wa.me/${item.customerWhatsapp!.replace(/\D/g, "")}`)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
                            title="Contatar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleReactivate(item)}
                          disabled={reactivating === item.consultoriaId}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                          title="Reativar por 90 dias"
                        >
                          {reactivating === item.consultoriaId
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RotateCcw className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersDropoutsPage;
