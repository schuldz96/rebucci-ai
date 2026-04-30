import { useState, useEffect } from "react";
import { Network, Plus, Copy, Loader2, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Affiliate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  commission_pct: number;
  referral_code: string;
  total_sales: number;
  total_commission: number;
  status: "active" | "inactive";
  created_at: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const AffiliateModal = ({
  coachId,
  onClose,
  onSaved,
}: {
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", commission_pct: "10" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    // Gera código único
    const code = form.name.toUpperCase().replace(/\s+/g, "").slice(0, 6) + Math.floor(Math.random() * 1000);
    const { error } = await supabase.from("affiliates").insert({
      coach_id: coachId,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      commission_pct: parseFloat(form.commission_pct) || 10,
      referral_code: code,
      total_sales: 0,
      total_commission: 0,
      status: "active",
    });
    setSaving(false);
    if (error) { toast({ title: "Erro ao criar afiliado", variant: "destructive" }); return; }
    toast({ title: "Afiliado criado!" });
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
        className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Novo Afiliado</h2>
          <button onClick={onClose} className="text-xl text-muted-foreground hover:text-foreground px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nome *</label>
            <Input className="mt-1" placeholder="Nome do afiliado" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input className="mt-1" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <Input className="mt-1" placeholder="+55 11 9..." value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Comissão (%)</label>
            <Input className="mt-1 w-32" type="number" min={1} max={50} value={form.commission_pct} onChange={(e) => set("commission_pct", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Criar afiliado"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AffiliatesPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .eq("coach_id", user.id)
      .order("name");
    setAffiliates(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!" });
  };

  const toggleStatus = async (aff: Affiliate) => {
    const status = aff.status === "active" ? "inactive" : "active";
    await supabase.from("affiliates").update({ status }).eq("id", aff.id);
    setAffiliates((prev) => prev.map((a) => a.id === aff.id ? { ...a, status } : a));
    toast({ title: status === "active" ? "Afiliado ativado" : "Afiliado desativado" });
  };

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalCommission = affiliates.reduce((s, a) => s + a.total_commission, 0);
  const totalSales = affiliates.reduce((s, a) => s + a.total_sales, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Afiliados</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {totalSales} vendas via afiliados
              </span>
              <span className="text-xs text-primary flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {fmtBRL(totalCommission)} em comissões
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={load}>
              <RefreshCw className="w-4 h-4" />Atualizar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />Novo afiliado
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Network className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum afiliado cadastrado ainda</p>
            <p className="text-xs mt-1">Crie afiliados e gere links de comissão por venda</p>
            <Button size="sm" className="mt-4 gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />Criar primeiro afiliado
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["Afiliado", "Código", "Comissão", "Vendas", "Total ganho", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((aff) => (
                  <tr key={aff.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{aff.name}</p>
                      <p className="text-xs text-muted-foreground">{aff.email ?? aff.phone ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyCode(aff.referral_code)}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
                        title="Copiar código"
                      >
                        <code className="text-xs bg-primary/10 px-2 py-0.5 rounded font-mono">{aff.referral_code}</code>
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{aff.commission_pct}%</td>
                    <td className="px-4 py-3 text-muted-foreground">{aff.total_sales}</td>
                    <td className="px-4 py-3 font-medium text-green-400">{fmtBRL(aff.total_commission)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        aff.status === "active" ? "text-green-400 bg-green-400/10" : "text-muted-foreground bg-muted"
                      )}>
                        {aff.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(aff)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {aff.status === "active" ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && user && (
          <AffiliateModal
            coachId={user.id}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AffiliatesPage;
