import { useState, useEffect } from "react";
import {
  DollarSign, Plus, Download, TrendingUp, TrendingDown,
  Clock, AlertTriangle, Loader2, X, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  payment_method?: string;
  category?: string;
  customer_name?: string;
  customer_id?: string;
}

interface FinanceSummary {
  receita: number;
  despesas: number;
  aReceber: number;
  emAtraso: number;
}

interface PendingConsultoria {
  id: string;
  customer_name: string;
  value: number;
  end_date: string;
  payment_status: string;
  customer_id: string;
}

type Tab = "transactions" | "upcoming" | "overdue";

// ─── Modal nova transação ─────────────────────────────────────────────────────

const NewTransactionModal = ({
  coachId,
  onClose,
  onSaved,
}: {
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "income",
    date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "pix",
    category: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" }); return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      coach_id: coachId,
      description: form.description,
      amount: parseFloat(form.amount),
      type: form.type,
      date: form.date,
      payment_method: form.payment_method || null,
      category: form.category || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro ao registrar", variant: "destructive" }); return; }
    toast({ title: "Transação registrada!" });
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Registrar Pagamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Tipo */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {[
              { v: "income", label: "Receita", color: "bg-green-500/20 text-green-400 border-green-500/40" },
              { v: "expense", label: "Despesa", color: "bg-red-500/20 text-red-400 border-red-500/40" },
            ].map(({ v, label, color }) => (
              <button
                key={v}
                onClick={() => set("type", v)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors",
                  form.type === v ? color : "text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Descrição *</label>
            <Input className="mt-1" placeholder="Ex: Mensalidade João" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Valor (R$) *</label>
              <Input className="mt-1" type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Data</label>
              <Input className="mt-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Pagamento</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <Input className="mt-1" placeholder="Ex: mensalidade" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const FinancePage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("transactions");
  const [summary, setSummary] = useState<FinanceSummary>({ receita: 0, despesas: 0, aReceber: 0, emAtraso: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<PendingConsultoria[]>([]);
  const [overdue, setOverdue] = useState<PendingConsultoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");

    const [txRes, pendingRes, overdueRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, customers(name)")
        .eq("coach_id", user.id)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: false }),

      supabase
        .from("consultorias")
        .select("id, value, end_date, payment_status, customer_id, customers(name)")
        .eq("coach_id", user.id)
        .eq("status", "active")
        .eq("payment_status", "pending")
        .gte("end_date", today),

      supabase
        .from("consultorias")
        .select("id, value, end_date, payment_status, customer_id, customers(name)")
        .eq("coach_id", user.id)
        .in("payment_status", ["pending", "overdue"])
        .lt("end_date", today),
    ]);

    const txs: Transaction[] = (txRes.data ?? []).map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      payment_method: t.payment_method,
      category: t.category,
      customer_name: (t.customers as any)?.name,
      customer_id: t.customer_id,
    }));

    const receita = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const despesas = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const aReceber = (pendingRes.data ?? []).reduce((s, c) => s + (c.value ?? 0), 0);
    const emAtraso = (overdueRes.data ?? []).reduce((s, c) => s + (c.value ?? 0), 0);

    setTransactions(txs);
    setSummary({ receita, despesas, aReceber, emAtraso });
    setPending((pendingRes.data ?? []).map((c) => ({
      id: c.id,
      customer_name: (c.customers as any)?.name ?? "—",
      value: c.value,
      end_date: c.end_date,
      payment_status: c.payment_status,
      customer_id: c.customer_id,
    })));
    setOverdue((overdueRes.data ?? []).map((c) => ({
      id: c.id,
      customer_name: (c.customers as any)?.name ?? "—",
      value: c.value,
      end_date: c.end_date,
      payment_status: c.payment_status,
      customer_id: c.customer_id,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, selectedMonth]);

  const markPaid = async (consultoriaId: string) => {
    await supabase.from("consultorias").update({ payment_status: "paid" }).eq("id", consultoriaId);
    toast({ title: "Pagamento confirmado!" });
    load();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Controle de receitas e pagamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={format(selectedMonth, "yyyy-MM")}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setSelectedMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
              }}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
                return (
                  <option key={i} value={format(d, "yyyy-MM")}>
                    {format(d, "MMMM yyyy", { locale: ptBR })}
                  </option>
                );
              })}
            </select>
            <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />
              Registrar pagamento
            </Button>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: "Receita do mês", value: fmtBRL(summary.receita), icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Despesas do mês", value: fmtBRL(summary.despesas), icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10" },
            { label: "A receber", value: fmtBRL(summary.aReceber), icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
            { label: "Em atraso", value: fmtBRL(summary.emAtraso), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", card.bg)}>
                <card.icon className={cn("w-4 h-4", card.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={cn("text-lg font-bold", card.color)}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 border-b border-border -mb-px">
          {[
            { id: "transactions" as Tab, label: "Transações" },
            { id: "upcoming" as Tab, label: `A receber (${pending.length})` },
            { id: "overdue" as Tab, label: `Em atraso (${overdue.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "transactions" ? (
          transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <DollarSign className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma transação neste mês</p>
              <p className="text-xs mt-1">Clique em "Registrar pagamento" para adicionar</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Data", "Descrição", "Categoria", "Método", "Valor"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(tx.date), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{tx.description}</p>
                        {tx.customer_name && <p className="text-xs text-muted-foreground">{tx.customer_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{tx.category ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{tx.payment_method ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold", tx.type === "income" ? "text-green-400" : "text-red-400")}>
                          {tx.type === "income" ? "+" : "-"}{fmtBRL(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === "upcoming" ? (
          pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum pagamento pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{c.customer_name}</p>
                    <p className="text-xs text-muted-foreground">Vencimento: {format(parseISO(c.end_date), "dd/MM/yyyy")}</p>
                  </div>
                  <p className="text-lg font-bold text-yellow-400">{fmtBRL(c.value)}</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markPaid(c.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    Confirmar pago
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          overdue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma inadimplência</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdue.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{c.customer_name}</p>
                    <p className="text-xs text-muted-foreground">Venceu em: {format(parseISO(c.end_date), "dd/MM/yyyy")}</p>
                  </div>
                  <p className="text-lg font-bold text-destructive">{fmtBRL(c.value)}</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markPaid(c.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    Confirmar pago
                  </Button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {showModal && user && (
          <NewTransactionModal
            coachId={user.id}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancePage;
