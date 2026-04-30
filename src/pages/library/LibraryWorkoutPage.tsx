import { useState, useEffect } from "react";
import { Dumbbell, Plus, Search, Copy, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  level?: string;
  weeks?: number;
  days_per_week?: number;
  is_template: boolean;
  created_at: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const WorkoutModal = ({
  plan,
  coachId,
  onClose,
  onSaved,
}: {
  plan?: WorkoutPlan;
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    goal: plan?.goal ?? "",
    level: plan?.level ?? "iniciante",
    weeks: String(plan?.weeks ?? 4),
    days_per_week: String(plan?.days_per_week ?? 3),
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
      level: form.level,
      weeks: parseInt(form.weeks) || null,
      days_per_week: parseInt(form.days_per_week) || null,
      is_template: true,
    };
    const { error } = plan
      ? await supabase.from("workout_plans").update(payload).eq("id", plan.id)
      : await supabase.from("workout_plans").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: plan ? "Ficha atualizada!" : "Ficha criada!" });
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
          <h2 className="font-semibold text-foreground">{plan ? "Editar Ficha" : "Nova Ficha de Treino"}</h2>
          <button onClick={onClose} className="text-xl leading-none text-muted-foreground hover:text-foreground px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh]">
          <div>
            <label className="text-sm font-medium text-foreground">Nome *</label>
            <Input className="mt-1" placeholder="Ex: Hipertrofia A/B — 4x" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={2} placeholder="Descreva o objetivo geral..." value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Objetivo</label>
              <Input className="mt-1" placeholder="Ex: Hipertrofia" value={form.goal} onChange={(e) => set("goal", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Nível</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.level} onChange={(e) => set("level", e.target.value)}>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Semanas</label>
              <Input className="mt-1" type="number" min={1} value={form.weeks} onChange={(e) => set("weeks", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Dias / semana</label>
              <Input className="mt-1" type="number" min={1} max={7} value={form.days_per_week} onChange={(e) => set("days_per_week", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : plan ? "Salvar" : "Criar ficha"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  iniciante: "text-green-400 bg-green-400/10",
  intermediario: "text-yellow-400 bg-yellow-400/10",
  avancado: "text-red-400 bg-red-400/10",
};

const LibraryWorkoutPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | undefined>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("coach_id", user.id)
      .eq("is_template", true)
      .order("name");
    setPlans(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta ficha de treino?")) return;
    await supabase.from("workout_plans").delete().eq("id", id);
    toast({ title: "Ficha excluída" });
    load();
  };

  const handleDuplicate = async (plan: WorkoutPlan) => {
    await supabase.from("workout_plans").insert({
      coach_id: user!.id,
      name: `${plan.name} (cópia)`,
      description: plan.description,
      goal: plan.goal,
      level: plan.level,
      weeks: plan.weeks,
      days_per_week: plan.days_per_week,
      is_template: true,
    });
    toast({ title: "Ficha duplicada!" });
    load();
    setMenuOpen(null);
  };

  const filtered = plans.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLevel !== "all" && p.level !== filterLevel) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Biblioteca de Treinos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{plans.length} fichas cadastradas</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Nova ficha de treino
          </Button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar fichas..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="all">Todos os níveis</option>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">{plans.length === 0 ? "Nenhuma ficha cadastrada ainda" : "Nenhuma ficha encontrada"}</p>
            {plans.length === 0 && (
              <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
                <Plus className="w-4 h-4" />Criar primeira ficha
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((plan) => (
              <div key={plan.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group relative" onClick={() => setMenuOpen(null)}>
                {/* Menu ações */}
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
                        <button onClick={() => { setEditing(plan); setShowModal(true); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />Editar
                        </button>
                        <button onClick={() => handleDuplicate(plan)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <Copy className="w-3.5 h-3.5" />Duplicar
                        </button>
                        <button onClick={() => { handleDelete(plan.id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />Excluir
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm pr-6 truncate">{plan.name}</h3>
                {plan.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.level && (
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", LEVEL_COLOR[plan.level] ?? "bg-muted text-muted-foreground")}>
                      {plan.level}
                    </span>
                  )}
                  {plan.goal && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{plan.goal}</span>}
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {plan.weeks && <span>{plan.weeks}sem</span>}
                  {plan.days_per_week && <span>{plan.days_per_week}x/sem</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && user && (
          <WorkoutModal
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

export default LibraryWorkoutPage;
