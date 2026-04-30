import { useState, useEffect } from "react";
import { Salad, Plus, Search, Copy, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DietPlan {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  calorie_target?: number;
  protein_target?: number;
  carb_target?: number;
  fat_target?: number;
  is_template: boolean;
  created_at: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const DietModal = ({
  plan,
  coachId,
  onClose,
  onSaved,
}: {
  plan?: DietPlan;
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    goal: plan?.goal ?? "",
    calorie_target: String(plan?.calorie_target ?? ""),
    protein_target: String(plan?.protein_target ?? ""),
    carb_target: String(plan?.carb_target ?? ""),
    fat_target: String(plan?.fat_target ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      coach_id: coachId,
      name: form.name,
      description: form.description || null,
      goal: form.goal || null,
      calorie_target: parseFloat(form.calorie_target) || null,
      protein_target: parseFloat(form.protein_target) || null,
      carb_target: parseFloat(form.carb_target) || null,
      fat_target: parseFloat(form.fat_target) || null,
      is_template: true,
    };
    const { error } = plan
      ? await supabase.from("diet_plans").update(payload).eq("id", plan.id)
      : await supabase.from("diet_plans").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: plan ? "Dieta atualizada!" : "Dieta criada!" });
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
          <h2 className="font-semibold text-foreground">{plan ? "Editar Dieta" : "Novo Protocolo Alimentar"}</h2>
          <button onClick={onClose} className="text-xl leading-none text-muted-foreground hover:text-foreground px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh]">
          <div>
            <label className="text-sm font-medium text-foreground">Nome *</label>
            <Input className="mt-1" placeholder="Ex: Low Carb 1800 kcal" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Descreva o protocolo..." value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Objetivo</label>
            <Input className="mt-1" placeholder="Ex: Emagrecimento, Ganho de massa..." value={form.goal} onChange={(e) => set("goal", e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Macros diários (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Calorias (kcal)</label>
                <Input className="mt-1" type="number" placeholder="Ex: 1800" value={form.calorie_target} onChange={(e) => set("calorie_target", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Proteína (g)</label>
                <Input className="mt-1" type="number" placeholder="Ex: 150" value={form.protein_target} onChange={(e) => set("protein_target", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Carboidrato (g)</label>
                <Input className="mt-1" type="number" placeholder="Ex: 200" value={form.carb_target} onChange={(e) => set("carb_target", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Gordura (g)</label>
                <Input className="mt-1" type="number" placeholder="Ex: 60" value={form.fat_target} onChange={(e) => set("fat_target", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : plan ? "Salvar" : "Criar dieta"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const LibraryDietPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DietPlan | undefined>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("coach_id", user.id)
      .eq("is_template", true)
      .order("name");
    setPlans(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este protocolo alimentar?")) return;
    await supabase.from("diet_plans").delete().eq("id", id);
    toast({ title: "Protocolo excluído" });
    load();
  };

  const handleDuplicate = async (plan: DietPlan) => {
    await supabase.from("diet_plans").insert({
      coach_id: user!.id,
      name: `${plan.name} (cópia)`,
      description: plan.description,
      goal: plan.goal,
      calorie_target: plan.calorie_target,
      protein_target: plan.protein_target,
      carb_target: plan.carb_target,
      fat_target: plan.fat_target,
      is_template: true,
    });
    toast({ title: "Protocolo duplicado!" });
    load();
    setMenuOpen(null);
  };

  const filtered = plans.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const MacroBadge = ({ label, value, color }: { label: string; value?: number; color: string }) =>
    value ? (
      <div className={cn("text-center px-2 py-1 rounded-lg", color)}>
        <p className="text-[11px] font-bold">{value}g</p>
        <p className="text-[9px] opacity-70">{label}</p>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Biblioteca de Dietas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{plans.length} protocolos cadastrados</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Novo protocolo
          </Button>
        </div>

        <div className="relative max-w-sm mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar protocolos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Salad className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">{plans.length === 0 ? "Nenhum protocolo cadastrado ainda" : "Nenhum protocolo encontrado"}</p>
            {plans.length === 0 && (
              <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
                <Plus className="w-4 h-4" />Criar primeiro protocolo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((plan) => (
              <div key={plan.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group relative" onClick={() => setMenuOpen(null)}>
                {/* Menu */}
                <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === plan.id ? null : plan.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {menuOpen === plan.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-xl z-20 py-1 min-w-[140px]"
                      >
                        <button onClick={() => { setEditing(plan); setShowModal(true); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                          <Edit2 className="w-3.5 h-3.5" />Editar
                        </button>
                        <button onClick={() => handleDuplicate(plan)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                          <Copy className="w-3.5 h-3.5" />Duplicar
                        </button>
                        <button onClick={() => { handleDelete(plan.id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />Excluir
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-3">
                  <Salad className="w-5 h-5 text-teal-400" />
                </div>

                <h3 className="font-semibold text-foreground text-sm pr-6 truncate">{plan.name}</h3>
                {plan.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>}
                {plan.goal && <p className="text-xs text-primary mt-1">{plan.goal}</p>}

                {/* Macros */}
                {(plan.calorie_target || plan.protein_target) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.calorie_target && (
                      <div className="text-center px-2 py-1 rounded-lg bg-orange-400/10">
                        <p className="text-[11px] font-bold text-orange-400">{plan.calorie_target}</p>
                        <p className="text-[9px] text-orange-400/70">kcal</p>
                      </div>
                    )}
                    <MacroBadge label="prot" value={plan.protein_target} color="bg-blue-400/10 text-blue-400" />
                    <MacroBadge label="carb" value={plan.carb_target} color="bg-yellow-400/10 text-yellow-400" />
                    <MacroBadge label="gord" value={plan.fat_target} color="bg-red-400/10 text-red-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && user && (
          <DietModal
            plan={editing}
            coachId={user.id}
            onClose={() => { setShowModal(false); setEditing(undefined); }}
            onSaved={() => { setShowModal(false); setEditing(undefined); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LibraryDietPage;
