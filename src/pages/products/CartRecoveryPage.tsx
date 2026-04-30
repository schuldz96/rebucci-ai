import { useState, useEffect } from "react";
import { ShoppingCart, MessageCircle, Loader2, RefreshCw, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { format, parseISO, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CartRecovery {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  plan_name?: string;
  value?: number;
  status: "pending" | "contacted" | "recovered" | "lost";
  created_at: string;
}

const STATUS_CONFIG = {
  pending:   { label: "Pendente",   color: "text-blue-400 bg-blue-400/10" },
  contacted: { label: "Contactado", color: "text-yellow-400 bg-yellow-400/10" },
  recovered: { label: "Recuperado", color: "text-green-400 bg-green-400/10" },
  lost:      { label: "Perdido",    color: "text-muted-foreground bg-muted" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CartRecoveryPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [items, setItems] = useState<CartRecovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("cart_recoveries")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const updateStatus = async (id: string, status: CartRecovery["status"]) => {
    setUpdating(id);
    await supabase.from("cart_recoveries").update({ status }).eq("id", id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    setUpdating(null);
    toast({ title: "Status atualizado" });
  };

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    if (q && !(item.name ?? "").toLowerCase().includes(q) && !(item.email ?? "").toLowerCase().includes(q)) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  const fmtBRL = (v?: number) => v ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  const counts = {
    pending: items.filter((i) => i.status === "pending").length,
    contacted: items.filter((i) => i.status === "contacted").length,
    recovered: items.filter((i) => i.status === "recovered").length,
  };

  const potentialRevenue = items.filter((i) => i.status !== "lost" && i.status !== "recovered")
    .reduce((s, i) => s + (i.value ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carrinho Abandonado</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Leads que não finalizaram a compra</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className="w-4 h-4" />Atualizar
          </Button>
        </div>

        {/* Resumo */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-blue-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{counts.pending} pendentes</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-yellow-400">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-medium">{counts.contacted} contactados</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-green-400">
            <span className="font-medium">{counts.recovered} recuperados</span>
          </div>
          {potentialRevenue > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-primary ml-auto">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="font-medium">{fmtBRL(potentialRevenue)} em aberto</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="relative max-w-[240px]">
            <Input placeholder="Buscar por nome ou e-mail..." className="h-8 text-sm pl-3" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {["all", "pending", "contacted", "recovered", "lost"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">{items.length === 0 ? "Nenhum carrinho abandonado ainda" : "Nenhum resultado encontrado"}</p>
            <p className="text-xs mt-1">Leads chegam aqui via webhook do Digital Manager Guru ou Hotmart</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["Lead", "Plano", "Valor", "Recebido há", "Status", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                  const hours = differenceInHours(new Date(), parseISO(item.created_at));
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.name ?? "Anônimo"}</p>
                        <p className="text-xs text-muted-foreground">{item.email ?? item.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.plan_name ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{fmtBRL(item.value)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.phone && (
                            <button
                              onClick={() => window.open(`https://wa.me/${item.phone!.replace(/\D/g, "")}`)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          {item.status === "pending" && (
                            <button
                              onClick={() => updateStatus(item.id, "contacted")}
                              disabled={updating === item.id}
                              className="px-2 py-1 rounded-lg text-xs text-yellow-400 border border-yellow-400/40 hover:bg-yellow-400/10 transition-colors disabled:opacity-50"
                            >
                              Marcar contactado
                            </button>
                          )}
                          {item.status === "contacted" && (
                            <button
                              onClick={() => updateStatus(item.id, "recovered")}
                              disabled={updating === item.id}
                              className="px-2 py-1 rounded-lg text-xs text-green-400 border border-green-400/40 hover:bg-green-400/10 transition-colors disabled:opacity-50"
                            >
                              Recuperado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartRecoveryPage;
