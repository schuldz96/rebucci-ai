import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Phone, Mail, User, Calendar, DollarSign,
  Package, Loader2, Edit2, Check, X, RefreshCw, Gift, PauseCircle,
  XCircle, MoreVertical, Plus, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore, Consultoria, Customer } from "@/store/customerStore";
import { format, parseISO, differenceInDays, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface Plan { id: string; name: string; plan_category?: string; duration_days: number; price: number; }
interface Addon { id: string; plan_id: string; status: string; start_date: string; end_date: string | null; plans: { name: string } | null; }

// ─── Modais ───────────────────────────────────────────────────────────────────

const TrocarPlanoModal = ({
  coachId, consultoria, onClose, onRefresh,
}: { coachId: string; consultoria: Consultoria; onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("plans").select("id,name,plan_category,duration_days,price")
      .eq("coach_id", coachId).eq("active", true)
      .then(({ data }) => setPlans((data ?? []).filter(p => !p.plan_category || p.plan_category === "principal")));
  }, [coachId]);

  const confirm = async () => {
    if (!selected) return;
    setSaving(true);
    const plan = plans.find(p => p.id === selected)!;
    const start = new Date().toISOString().split("T")[0];
    const end = new Date(Date.now() + plan.duration_days * 86400000).toISOString().split("T")[0];
    const { error } = await supabase.from("consultorias").update({ plan_id: selected, start_date: start, end_date: end, status: "active" }).eq("id", consultoria.id);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plano alterado!" });
    onRefresh(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Trocar Plano</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">Plano atual: <span className="text-foreground font-medium">{consultoria.plans?.name ?? "—"}</span></p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {plans.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left text-sm transition-all",
                  selected === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.duration_days} dias · R$ {p.price?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                {selected === p.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            {plans.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum plano disponível</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={!selected || saving} onClick={confirm}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BonusDaysModal = ({
  consultoria, onClose, onRefresh,
}: { consultoria: Consultoria; onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [days, setDays] = useState("7");
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    const d = parseInt(days);
    if (!d || d < 1) return;
    setSaving(true);
    const end = new Date(consultoria.end_date ?? Date.now());
    end.setDate(end.getDate() + d);
    const newEnd = end.toISOString().split("T")[0];
    const { error } = await supabase.from("consultorias").update({ end_date: newEnd }).eq("id", consultoria.id);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${d} dias adicionados!`, description: `Novo vencimento: ${newEnd.split("-").reverse().join("/")}` });
    onRefresh(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2"><Gift className="w-4 h-4 text-primary" /> Dias de Bônus</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Vencimento atual: <span className="text-foreground font-medium">{consultoria.end_date?.split("-").reverse().join("/") ?? "—"}</span></p>
          <div>
            <label className="text-sm font-medium text-foreground">Quantos dias adicionar?</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[3, 7, 10, 15, 30].map(d => (
                <button key={d} onClick={() => setDays(String(d))}
                  className={cn("px-3 py-1.5 rounded-lg border text-sm transition-colors",
                    days === String(d) ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
                  )}>{d}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Input type="number" min={1} max={365} value={days} onChange={e => setDays(e.target.value)} className="w-24" />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={!days || parseInt(days) < 1 || saving} onClick={confirm}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddAddonModal = ({
  coachId, customerId, consultoriaId, onClose, onRefresh,
}: { coachId: string; customerId: string; consultoriaId: string; onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("plans").select("id,name,plan_category,duration_days,price")
      .eq("coach_id", coachId).eq("active", true)
      .then(({ data }) => setPlans((data ?? []).filter(p => p.plan_category === "addon" || p.plan_category === "extension")));
  }, [coachId]);

  const confirm = async () => {
    if (!selected) return;
    setSaving(true);
    const plan = plans.find(p => p.id === selected)!;
    const start = new Date().toISOString().split("T")[0];
    const end = new Date(Date.now() + (plan.duration_days ?? 30) * 86400000).toISOString().split("T")[0];
    const { error } = await supabase.from("consultoria_addons").insert({
      coach_id: coachId, customer_id: customerId, consultoria_id: consultoriaId,
      plan_id: selected, status: "active", start_date: start, end_date: end,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Produto adicional ativado!" });
    onRefresh(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Adicionar Produto</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {plans.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left text-sm transition-all",
                  selected === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.plan_category === "extension" ? "Extensão" : "Adicional"} · {p.duration_days} dias
                  </p>
                </div>
                {selected === p.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum produto adicional ou extensão cadastrado.
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={!selected || saving || plans.length === 0} onClick={confirm}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ativar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Componente de edição inline de campo ─────────────────────────────────────

const EditableField = ({
  label, value, onSave, type = "text", icon: Icon,
}: { label: string; value: string; onSave: (v: string) => Promise<void>; type?: string; icon?: React.ElementType }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          {editing ? (
            <Input
              autoFocus
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="h-7 text-sm py-0 px-2"
            />
          ) : (
            <p className="text-sm font-medium text-foreground truncate">{value || <span className="text-muted-foreground italic">Não informado</span>}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-3 shrink-0">
        {editing ? (
          <>
            <button onClick={save} disabled={saving} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setEditing(false); setDraft(value); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button onClick={() => { setDraft(value); setEditing(true); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const ConsultoriaProfilePage = () => {
  const { consultoriaId } = useParams<{ consultoriaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [consultoria, setConsultoria] = useState<Consultoria | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [actionMenu, setActionMenu] = useState(false);
  const [modal, setModal] = useState<"trocar" | "bonus" | "addon" | null>(null);

  const load = async () => {
    if (!consultoriaId) return;
    const { data: cons } = await supabase
      .from("consultorias")
      .select("*, customers(*), plans(*)")
      .eq("id", consultoriaId)
      .maybeSingle();
    if (!cons) { setLoading(false); return; }
    setConsultoria(cons);
    setCustomer(cons.customers ?? null);

    const { data: addonData } = await supabase
      .from("consultoria_addons")
      .select("id, plan_id, status, start_date, end_date, plans(name)")
      .eq("consultoria_id", consultoriaId)
      .eq("status", "active");
    setAddons((addonData as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [consultoriaId]);

  const saveCustomerField = async (field: string, value: string) => {
    if (!customer) return;
    const { error } = await supabase.from("customers").update({ [field]: value || null }).eq("id", customer.id);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    setCustomer(prev => prev ? { ...prev, [field]: value } : prev);
    toast({ title: "Salvo!" });
  };

  const deactivateAddon = async (addonId: string) => {
    await supabase.from("consultoria_addons").update({ status: "inactive" }).eq("id", addonId);
    toast({ title: "Produto removido" });
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
    </div>
  );

  if (!consultoria || !customer) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <p className="text-sm">Consultoria não encontrada</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/customers/actives")}>Voltar</Button>
    </div>
  );

  const initials = customer.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const age = customer.birthdate ? differenceInYears(new Date(), parseISO(customer.birthdate)) : null;
  const daysLeft = consultoria.end_date ? differenceInDays(parseISO(consultoria.end_date), new Date()) : null;
  const daysTotal = consultoria.start_date && consultoria.end_date
    ? differenceInDays(parseISO(consultoria.end_date), parseISO(consultoria.start_date))
    : null;
  const progressPct = daysLeft !== null && daysTotal ? Math.max(0, Math.min(100, Math.round(((daysTotal - daysLeft) / daysTotal) * 100))) : null;

  const statusConfig: Record<string, { label: string; color: string }> = {
    active:   { label: "Ativo",    color: "text-green-400 bg-green-400/10" },
    paused:   { label: "Pausado",  color: "text-yellow-400 bg-yellow-400/10" },
    inactive: { label: "Inativo",  color: "text-muted-foreground bg-muted" },
    expired:  { label: "Expirado", color: "text-red-400 bg-red-400/10" },
  };
  const sc = statusConfig[consultoria.status] ?? statusConfig.inactive;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <button onClick={() => navigate("/customers/actives")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Alunos Ativos
        </button>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sc.color)}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              {customer.email && <span>{customer.email}</span>}
              {customer.whatsapp && <span>{customer.whatsapp}</span>}
              {age && <span>{age} anos</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Ver Progresso
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Plano atual ── */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Plano Atual
              </h2>
              <div className="relative">
                <button
                  onClick={() => setActionMenu(!actionMenu)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {actionMenu && (
                  <div className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-xl z-20 py-1 min-w-[200px]">
                    <button onClick={() => { setModal("trocar"); setActionMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-foreground">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Trocar plano
                    </button>
                    <button onClick={() => { setModal("bonus"); setActionMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-foreground">
                      <Gift className="w-3.5 h-3.5 text-green-400" /> Dar dias de bônus
                    </button>
                    <button onClick={() => { setModal("addon"); setActionMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-foreground">
                      <Plus className="w-3.5 h-3.5 text-violet-400" /> Adicionar produto
                    </button>
                    <div className="border-t border-border my-1" />
                    <button onClick={async () => {
                      if (!confirm("Pausar consultoria?")) return;
                      await supabase.from("consultorias").update({ status: "paused" }).eq("id", consultoria.id);
                      toast({ title: "Consultoria pausada" }); load(); setActionMenu(false);
                    }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-yellow-400">
                      <PauseCircle className="w-3.5 h-3.5" /> Pausar
                    </button>
                    <button onClick={async () => {
                      if (!confirm("Desativar? O aluno perderá o acesso.")) return;
                      await supabase.from("consultorias").update({ status: "inactive" }).eq("id", consultoria.id);
                      toast({ title: "Desativado" }); load(); setActionMenu(false);
                    }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-destructive">
                      <XCircle className="w-3.5 h-3.5" /> Desativar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plano</p>
                <p className="font-semibold text-foreground">{consultoria.plans?.name ?? "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {consultoria.start_date ? format(parseISO(consultoria.start_date), "dd/MM/yyyy") : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className={cn("text-sm font-medium mt-0.5", daysLeft !== null && daysLeft <= 7 ? "text-red-400" : "text-foreground")}>
                    {consultoria.end_date ? format(parseISO(consultoria.end_date), "dd/MM/yyyy") : "—"}
                  </p>
                </div>
              </div>

              {daysLeft !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className={cn("text-xs font-medium", daysLeft <= 7 ? "text-red-400" : daysLeft <= 14 ? "text-yellow-400" : "text-green-400")}>
                      {daysLeft > 0 ? `${daysLeft} dias restantes` : "Vencido"}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", daysLeft <= 7 ? "bg-red-400" : daysLeft <= 14 ? "bg-yellow-400" : "bg-green-400")}
                      style={{ width: `${progressPct ?? 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {consultoria.value ? `R$ ${consultoria.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <p className={cn("text-xs font-semibold mt-0.5",
                    consultoria.payment_status === "paid" ? "text-green-400" :
                    consultoria.payment_status === "pending" ? "text-yellow-400" : "text-muted-foreground"
                  )}>
                    {consultoria.payment_status === "paid" ? "Pago" :
                     consultoria.payment_status === "pending" ? "Pendente" :
                     consultoria.payment_status ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Addons ativos */}
            {addons.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Produtos adicionais</p>
                <div className="space-y-1.5">
                  {addons.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg bg-teal-400/5 border border-teal-400/20 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-teal-400">{a.plans?.name ?? "Adicional"}</p>
                        {a.end_date && (
                          <p className="text-xs text-muted-foreground">até {a.end_date.split("-").reverse().join("/")}</p>
                        )}
                      </div>
                      <button onClick={() => deactivateAddon(a.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Dados pessoais ── */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" /> Dados do Aluno
            </h2>
            <div>
              <EditableField
                label="Nome completo"
                value={customer.name}
                icon={User}
                onSave={v => saveCustomerField("name", v)}
              />
              <EditableField
                label="E-mail"
                value={customer.email ?? ""}
                type="email"
                icon={Mail}
                onSave={v => saveCustomerField("email", v)}
              />
              <EditableField
                label="WhatsApp"
                value={customer.whatsapp ?? ""}
                icon={Phone}
                onSave={v => saveCustomerField("whatsapp", v)}
              />
              <EditableField
                label="Telefone"
                value={customer.phone ?? ""}
                icon={Phone}
                onSave={v => saveCustomerField("phone", v)}
              />
              <EditableField
                label="Data de nascimento"
                value={customer.birthdate ?? ""}
                type="date"
                icon={Calendar}
                onSave={v => saveCustomerField("birthdate", v)}
              />
              <EditableField
                label="Altura (cm)"
                value={customer.height_cm ? String(customer.height_cm) : ""}
                type="number"
                onSave={v => saveCustomerField("height_cm", v)}
              />
            </div>
          </div>

          {/* ── Notas da consultoria ── */}
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="font-semibold text-foreground mb-3">Observações</h2>
            <ConsultoriaNotes consultoriaId={consultoria.id} initialNotes={consultoria.notes ?? ""} />
          </div>

        </div>
      </div>

      {/* Click-outside menu */}
      {actionMenu && <div className="fixed inset-0 z-10" onClick={() => setActionMenu(false)} />}

      {/* Modais */}
      {modal === "trocar" && user && (
        <TrocarPlanoModal coachId={user.id} consultoria={consultoria} onClose={() => setModal(null)} onRefresh={load} />
      )}
      {modal === "bonus" && (
        <BonusDaysModal consultoria={consultoria} onClose={() => setModal(null)} onRefresh={load} />
      )}
      {modal === "addon" && user && (
        <AddAddonModal
          coachId={user.id}
          customerId={customer.id}
          consultoriaId={consultoria.id}
          onClose={() => setModal(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
};

// ─── Notas da consultoria ─────────────────────────────────────────────────────

const ConsultoriaNotes = ({ consultoriaId, initialNotes }: { consultoriaId: string; initialNotes: string }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("consultorias").update({ notes }).eq("id", consultoriaId);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Observações salvas!" });
    setDirty(false);
  };

  return (
    <div className="space-y-2">
      <textarea
        rows={4}
        className="w-full rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Anotações sobre esta consultoria..."
        value={notes}
        onChange={e => { setNotes(e.target.value); setDirty(true); }}
      />
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Salvando</> : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConsultoriaProfilePage;
