import { useState, useEffect } from "react";
import {
  Salad, Plus, Search, Copy, Edit2, Trash2, MoreHorizontal, ChevronRight,
  Apple, FlaskConical, BookOpen, UtensilsCrossed, X, Loader2, Tag, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FoodGroup { id: string; name: string }

interface DietPlan {
  id: string; name: string; description?: string; goal?: string;
  calorie_target?: number; protein_target?: number; carb_target?: number;
  fat_target?: number; is_template: boolean; created_at: string;
}

interface Food {
  id: string; name: string; description?: string;
  food_group_id?: string; language?: string;
  quantity: number; unit: string;
  calories: number; protein: number; carbs: number; fat: number; fiber?: number;
}

interface MealFood {
  id?: string; food_id?: string; name: string; quantity: number; unit: string;
  calories: number; protein: number; carbs: number; fat: number;
}

interface Meal { id?: string; name: string; time_suggestion: string; foods: MealFood[] }

// ─── Hub ──────────────────────────────────────────────────────────────────────

const HUB_ITEMS = [
  { key: "foods",    label: "Meus alimentos",         icon: Apple,           color: "bg-orange-500/10 text-orange-400", desc: "Banco de alimentos e macros" },
  { key: "formulas", label: "Minhas fórmulas",        icon: FlaskConical,    color: "bg-violet-500/10 text-violet-400", desc: "Suplementos e combinações" },
  { key: "plans",    label: "Meus cardápios",         icon: BookOpen,        color: "bg-teal-500/10 text-teal-400",    desc: "Protocolos alimentares completos" },
  { key: "meals",    label: "Refeições predefinidas", icon: UtensilsCrossed, color: "bg-blue-500/10 text-blue-400",    desc: "Refeições reutilizáveis" },
  { key: "groups",   label: "Grupos alimentares",     icon: Tag,             color: "bg-green-500/10 text-green-400",  desc: "Categorias para seus alimentos" },
];

const HELP_LINKS = [
  { label: "Como criar seus alimentos?", href: "#" },
  { label: "Como criar suas fórmulas?",  href: "#" },
  { label: "Como criar seus cardápios?", href: "#" },
];

// ─── Modal Alimento (formulário completo) ─────────────────────────────────────

const LANGUAGES = [
  { value: "pt", label: "🇧🇷 Português" },
  { value: "en", label: "🇺🇸 English" },
  { value: "es", label: "🇪🇸 Español" },
];

const UNITS = ["g", "ml", "unidade", "colher", "xícara", "fatia", "porção", "fórmula"];

const SectionHeader = ({ n, title, sub }: { n: number; title: string; sub: string }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</div>
    <div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  </div>
);

const FoodModal = ({
  coachId, food, groups, onClose, onSaved,
}: {
  coachId: string; food?: Food; groups: FoodGroup[];
  onClose: () => void; onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name:          food?.name          ?? "",
    description:   food?.description   ?? "",
    food_group_id: food?.food_group_id ?? "",
    language:      food?.language      ?? "pt",
    quantity:      String(food?.quantity ?? 100),
    unit:          food?.unit          ?? "g",
    protein:       String(food?.protein ?? 0),
    carbs:         String(food?.carbs   ?? 0),
    fat:           String(food?.fat     ?? 0),
    fiber:         String(food?.fiber   ?? 0),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Calorias calculadas automaticamente: carb*4 + prot*4 + fat*9
  const calcCalories = () => {
    const p = parseFloat(form.protein) || 0;
    const c = parseFloat(form.carbs)   || 0;
    const f = parseFloat(form.fat)     || 0;
    return Math.round(c * 4 + p * 4 + f * 9);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      coach_id:      coachId,
      name:          form.name.trim(),
      description:   form.description.trim() || null,
      food_group_id: form.food_group_id || null,
      language:      form.language,
      quantity:      parseFloat(form.quantity) || 100,
      unit:          form.unit,
      calories:      calcCalories(),
      protein:       parseFloat(form.protein) || 0,
      carbs:         parseFloat(form.carbs)   || 0,
      fat:           parseFloat(form.fat)     || 0,
      fiber:         parseFloat(form.fiber)   || 0,
    };
    const { error } = food
      ? await supabase.from("foods").update(payload).eq("id", food.id)
      : await supabase.from("foods").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: food ? "Alimento atualizado!" : "Alimento criado!" });
    onSaved();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-lg">{food ? "Editar Alimento" : "Novo Alimento"}</h2>
            <p className="text-xs text-muted-foreground">Edite o alimento</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-7">

          {/* 1. Informações do alimento */}
          <div>
            <SectionHeader n={1} title="Informações do alimento" sub="Digite as informações básicas do alimento" />
            <div className="space-y-4 pl-10">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Descrição</label>
                <Input
                  placeholder="Ex: 2 fatias de pão de forma ou 1 pão francês (50g)"
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Grupo alimentar</label>
                  <select
                    value={form.food_group_id}
                    onChange={e => set("food_group_id", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sem grupo</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Idioma</label>
                  <select
                    value={form.language}
                    onChange={e => set("language", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Nome *</label>
                <Input placeholder="Ex: Frango grelhado" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
            </div>
          </div>

          {/* 2. Porção e unidade */}
          <div>
            <SectionHeader n={2} title="Porção e unidade" sub="Defina o tamanho da porção" />
            <div className="grid grid-cols-2 gap-4 pl-10">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Quantidade (porção) *</label>
                <Input type="number" min={0} step={1} value={form.quantity} onChange={e => set("quantity", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Unidade de medida da porção *</label>
                <select
                  value={form.unit}
                  onChange={e => set("unit", e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Informações nutricionais */}
          <div>
            <SectionHeader n={3} title="Informações nutricionais" sub="Digite os valores nutricionais" />
            <div className="pl-10 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Carboidrato * <span className="text-xs text-muted-foreground font-normal">em gramas</span></label>
                  <Input type="number" min={0} step={0.1} value={form.carbs} onChange={e => set("carbs", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Proteína * <span className="text-xs text-muted-foreground font-normal">em gramas</span></label>
                  <Input type="number" min={0} step={0.1} value={form.protein} onChange={e => set("protein", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Lipídios * <span className="text-xs text-muted-foreground font-normal">em gramas</span></label>
                  <Input type="number" min={0} step={0.1} value={form.fat} onChange={e => set("fat", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Fibra alimentar * <span className="text-xs text-muted-foreground font-normal">em gramas</span></label>
                  <Input type="number" min={0} step={0.1} value={form.fiber} onChange={e => set("fiber", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
                    Calorias totais
                    <span className="text-xs text-primary font-normal">✦ Calculado automaticamente</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-9 px-3 flex items-center rounded-lg border border-border bg-muted/40 text-foreground font-semibold text-sm">
                      {calcCalories()}
                    </div>
                    <span className="text-sm text-muted-foreground">kcal</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculado a partir dos macronutrientes (Carb: 4 kcal/g, Prot: 4 kcal/g, Lip: 9 kcal/g)
                  </p>
                </div>
              </div>

              {/* Nota importante */}
              <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">Nota importante</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Os valores inseridos acima devem corresponder à quantidade da porção indicada.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {food ? "Salvar alterações" : "Criar alimento"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Seção Grupos Alimentares ─────────────────────────────────────────────────

const FoodGroupsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<FoodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("food_groups").select("id, name").eq("coach_id", coachId).order("name");
    setGroups(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("food_groups").insert({ coach_id: coachId, name: newName.trim() });
    setSaving(false);
    if (error) { toast({ title: "Erro ao criar grupo", variant: "destructive" }); return; }
    setNewName("");
    toast({ title: "Grupo criado!" });
    load();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await supabase.from("food_groups").update({ name: editName.trim() }).eq("id", id);
    setEditingId(null);
    toast({ title: "Grupo renomeado!" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este grupo? Os alimentos vinculados perderão o grupo mas não serão apagados.")) return;
    await supabase.from("food_groups").delete().eq("id", id);
    toast({ title: "Grupo excluído" });
    load();
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Grupos alimentares</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Crie categorias para organizar seus alimentos (ex: Cereais, Proteínas, Laticínios)</p>
      </div>

      {/* Adicionar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nome do grupo (ex: Cereais, pães e tubérculos)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button size="sm" className="gap-1.5 shrink-0" onClick={handleAdd} disabled={saving || !newName.trim()}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Tag className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum grupo criado ainda</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {groups.map((g, i) => (
            <div key={g.id} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors", i > 0 && "border-t border-border")}>
              <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Tag className="w-3.5 h-3.5 text-green-400" />
              </div>
              {editingId === g.id ? (
                <Input
                  className="flex-1 h-7 text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(g.id); if (e.key === "Escape") setEditingId(null); }}
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-foreground">{g.name}</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {editingId === g.id ? (
                  <>
                    <button onClick={() => handleRename(g.id)} className="px-2 py-1 text-xs text-primary hover:text-primary/80 font-medium">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(g.id); setEditName(g.name); }} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Seção Alimentos ──────────────────────────────────────────────────────────

const FoodsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [groups, setGroups] = useState<FoodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Food | undefined>();

  const load = async () => {
    setLoading(true);
    const [{ data: foodsData }, { data: groupsData }] = await Promise.all([
      supabase.from("foods").select("*").eq("coach_id", coachId).order("name"),
      supabase.from("food_groups").select("id, name").eq("coach_id", coachId).order("name"),
    ]);
    setFoods(foodsData ?? []);
    setGroups(groupsData ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este alimento?")) return;
    await supabase.from("foods").delete().eq("id", id);
    toast({ title: "Alimento excluído" });
    load();
  };

  const groupName = (id?: string) => groups.find(g => g.id === id)?.name ?? null;

  const filtered = foods.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup !== "all" && f.food_group_id !== filterGroup) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar alimentos..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {groups.length > 0 && (
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">Todos os grupos</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <Button size="sm" className="gap-2 ml-auto" onClick={() => { setEditing(undefined); setShowModal(true); }}>
          <Plus className="w-4 h-4" /> Novo alimento
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Apple className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">{foods.length === 0 ? "Nenhum alimento cadastrado" : "Nenhum resultado"}</p>
          {foods.length === 0 && <Button size="sm" className="mt-4 gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" />Cadastrar primeiro alimento</Button>}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Alimento", "Grupo", "Porção", "Kcal", "Prot.", "Carb.", "Gord.", "Fibra", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(food => (
                <tr key={food.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{food.name}</p>
                    {food.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{food.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {groupName(food.food_group_id)
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">{groupName(food.food_group_id)}</span>
                      : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{food.quantity}{food.unit}</td>
                  <td className="px-4 py-3 text-orange-400 font-medium">{food.calories}</td>
                  <td className="px-4 py-3 text-blue-400">{food.protein}g</td>
                  <td className="px-4 py-3 text-yellow-400">{food.carbs}g</td>
                  <td className="px-4 py-3 text-red-400">{food.fat}g</td>
                  <td className="px-4 py-3 text-green-400">{food.fiber ?? 0}g</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(food); setShowModal(true); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(food.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <FoodModal coachId={coachId} food={editing} groups={groups} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Editor de Dieta ──────────────────────────────────────────────────────────

const DietEditor = ({ coachId, plan, onClose, onSaved }: { coachId: string; plan?: DietPlan; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [name, setName] = useState(plan?.name ?? "");
  const [goal, setGoal] = useState(plan?.goal ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(!!plan);

  useEffect(() => {
    if (!plan) return;
    (async () => {
      const { data: mealsData } = await supabase.from("meals").select("*, meal_foods(*)").eq("diet_plan_id", plan.id).order("sort_order");
      setMeals((mealsData ?? []).map((m: any) => ({
        id: m.id, name: m.name, time_suggestion: m.time_suggestion ?? "",
        foods: (m.meal_foods ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })));
      setLoadingMeals(false);
    })();
  }, [plan]);

  const addMeal = () => setMeals(prev => [...prev, { name: `Refeição ${prev.length + 1}`, time_suggestion: "", foods: [] }]);
  const removeMeal = (i: number) => setMeals(prev => prev.filter((_, idx) => idx !== i));
  const updateMeal = (i: number, key: keyof Meal, value: any) => setMeals(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: value } : m));
  const addFood = (mealIdx: number) => setMeals(prev => prev.map((m, i) => i === mealIdx ? { ...m, foods: [...m.foods, { name: "", quantity: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 }] } : m));
  const removeFood = (mealIdx: number, foodIdx: number) => setMeals(prev => prev.map((m, i) => i === mealIdx ? { ...m, foods: m.foods.filter((_, fi) => fi !== foodIdx) } : m));
  const updateFood = (mealIdx: number, foodIdx: number, key: keyof MealFood, value: any) => setMeals(prev => prev.map((m, i) => i === mealIdx ? { ...m, foods: m.foods.map((f, fi) => fi === foodIdx ? { ...f, [key]: value } : f) } : m));

  const totals = meals.reduce((acc, m) => {
    m.foods.forEach(f => {
      acc.calories += parseFloat(String(f.calories)) || 0;
      acc.protein  += parseFloat(String(f.protein))  || 0;
      acc.carbs    += parseFloat(String(f.carbs))     || 0;
      acc.fat      += parseFloat(String(f.fat))       || 0;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    let planId = plan?.id;
    const planPayload = { coach_id: coachId, name: name.trim(), goal: goal || null, description: description || null, is_template: false };
    if (plan) {
      const { error } = await supabase.from("diet_plans").update(planPayload).eq("id", plan.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("diet_plans").insert(planPayload).select("id").single();
      if (error || !data) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      planId = data.id;
    }
    if (plan) await supabase.from("meals").delete().eq("diet_plan_id", planId!);
    for (let i = 0; i < meals.length; i++) {
      const m = meals[i];
      const { data: mealRow } = await supabase.from("meals").insert({ diet_plan_id: planId, name: m.name, time_suggestion: m.time_suggestion || null, sort_order: i }).select("id").single();
      if (mealRow && m.foods.length > 0) {
        await supabase.from("meal_foods").insert(m.foods.map((f, fi) => ({ meal_id: mealRow.id, name: f.name, quantity: f.quantity, unit: f.unit, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, sort_order: fi })));
      }
    }
    toast({ title: plan ? "Cardápio atualizado!" : "Cardápio criado!" });
    setSaving(false);
    onSaved();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">{plan ? "Editar Cardápio" : "Novo Cardápio"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {loadingMeals ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome do cardápio *</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Protocolo de Emagrecimento" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Objetivo</label>
                  <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm">
                    <option value="">Selecionar...</option>
                    {["Emagrecimento","Ganho de massa","Manutenção","Performance","Saúde geral"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2} placeholder="Observações sobre o protocolo..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* Totais */}
              {meals.some(m => m.foods.length > 0) && (
                <div className="flex gap-3 p-3 bg-muted/30 rounded-xl text-xs">
                  <span className="text-orange-400 font-bold">{Math.round(totals.calories)} kcal</span>
                  <span className="text-blue-400">{totals.protein.toFixed(1)}g P</span>
                  <span className="text-yellow-400">{totals.carbs.toFixed(1)}g C</span>
                  <span className="text-red-400">{totals.fat.toFixed(1)}g G</span>
                </div>
              )}

              {/* Refeições */}
              <div className="space-y-3">
                {meals.map((meal, mi) => (
                  <div key={mi} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
                      <Input value={meal.name} onChange={e => updateMeal(mi, "name", e.target.value)} className="flex-1 h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0" />
                      <Input value={meal.time_suggestion} onChange={e => updateMeal(mi, "time_suggestion", e.target.value)} placeholder="Horário (ex: 07:00)" className="w-32 h-7 text-xs" />
                      <button onClick={() => removeMeal(mi)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="divide-y divide-border">
                      {meal.foods.map((f, fi) => (
                        <div key={fi} className="px-4 py-2 grid grid-cols-12 gap-2 items-center">
                          <Input value={f.name} onChange={e => updateFood(mi, fi, "name", e.target.value)} placeholder="Alimento" className="col-span-4 h-7 text-xs" />
                          <Input type="number" value={f.quantity} onChange={e => updateFood(mi, fi, "quantity", parseFloat(e.target.value))} className="col-span-2 h-7 text-xs" />
                          <select value={f.unit} onChange={e => updateFood(mi, fi, "unit", e.target.value)} className="col-span-2 h-7 px-2 rounded border border-input bg-background text-xs">
                            {["g","ml","un","col","xíc"].map(u => <option key={u}>{u}</option>)}
                          </select>
                          <Input type="number" value={f.calories} onChange={e => updateFood(mi, fi, "calories", parseFloat(e.target.value))} placeholder="kcal" className="col-span-2 h-7 text-xs" />
                          <button onClick={() => removeFood(mi, fi)} className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                          <button onClick={() => addFood(mi)} className="col-span-1 flex justify-center text-primary hover:text-primary/80 text-xs">+</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addFood(mi)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted/30 transition-colors">
                      <Plus className="w-3.5 h-3.5" />Adicionar alimento
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addMeal} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <Plus className="w-4 h-4" />Adicionar refeição
              </button>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}{plan ? "Salvar" : "Criar cardápio"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Seção Cardápios ──────────────────────────────────────────────────────────

const PlansSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<DietPlan | undefined>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("diet_plans").select("*").eq("coach_id", coachId).eq("is_template", false).order("created_at", { ascending: false });
    setPlans(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cardápio?")) return;
    await supabase.from("diet_plans").delete().eq("id", id);
    toast({ title: "Cardápio excluído" });
    load();
  };

  const handleDuplicate = async (plan: DietPlan) => {
    const { data: newPlan } = await supabase.from("diet_plans").insert({ ...plan, id: undefined, name: `${plan.name} (cópia)`, created_at: undefined }).select("id").single();
    if (!newPlan) return;
    const { data: meals } = await supabase.from("meals").select("*, meal_foods(*)").eq("diet_plan_id", plan.id);
    for (const m of meals ?? []) {
      const { data: nm } = await supabase.from("meals").insert({ diet_plan_id: newPlan.id, name: m.name, time_suggestion: m.time_suggestion, sort_order: m.sort_order }).select("id").single();
      if (nm && m.meal_foods?.length) await supabase.from("meal_foods").insert(m.meal_foods.map((f: any) => ({ ...f, id: undefined, meal_id: nm.id })));
    }
    toast({ title: "Ficha duplicada!" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowEditor(true); }}>
          <Plus className="w-4 h-4" />Novo cardápio
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Salad className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum cardápio criado</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setShowEditor(true)}><Plus className="w-4 h-4" />Criar primeiro cardápio</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group relative" onClick={() => setMenuOpen(null)}>
              <div className="absolute top-3 right-3">
                <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === plan.id ? null : plan.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {menuOpen === plan.id && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                      <button onClick={() => { setEditing(plan); setShowEditor(true); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Edit2 className="w-3.5 h-3.5" />Editar</button>
                      <button onClick={() => handleDuplicate(plan)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Copy className="w-3.5 h-3.5" />Duplicar</button>
                      <button onClick={() => { handleDelete(plan.id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" />Excluir</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mb-3">
                <Salad className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="font-semibold text-sm pr-6 truncate">{plan.name}</h3>
              {plan.goal && <p className="text-xs text-primary mt-1">{plan.goal}</p>}
              {plan.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>}
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {showEditor && (
          <DietEditor coachId={coachId} plan={editing} onClose={() => setShowEditor(false)} onSaved={() => { setShowEditor(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Seção Fórmulas ───────────────────────────────────────────────────────────

const FormulasSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [formulas, setFormulas] = useState<Food[]>([]);
  const [groups, setGroups] = useState<FoodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Food | undefined>();

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: g }] = await Promise.all([
      supabase.from("foods").select("*").eq("coach_id", coachId).eq("unit", "fórmula").order("name"),
      supabase.from("food_groups").select("id, name").eq("coach_id", coachId).order("name"),
    ]);
    setFormulas(f ?? []);
    setGroups(g ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Suplementos, shakes e combinações personalizadas</p>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
          <Plus className="w-4 h-4" />Nova fórmula
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : formulas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FlaskConical className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma fórmula cadastrada</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" />Criar primeira fórmula</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formulas.map(f => (
            <div key={f.id} className="bg-card border border-border rounded-xl p-4 group relative">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-2">
                <FlaskConical className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="font-medium text-sm">{f.name}</h3>
              <div className="flex gap-2 mt-2">
                <span className="text-[11px] text-orange-400">{f.calories} kcal</span>
                <span className="text-[11px] text-blue-400">{f.protein}g P</span>
              </div>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(f); setShowModal(true); }} className="p-1 rounded text-muted-foreground hover:text-foreground"><Edit2 className="w-3 h-3" /></button>
                <button onClick={async () => { await supabase.from("foods").delete().eq("id", f.id); load(); toast({ title: "Fórmula excluída" }); }} className="p-1 rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {showModal && (
          <FoodModal coachId={coachId} food={editing ? { ...editing, unit: "fórmula" } : undefined} groups={groups}
            onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Page Principal ───────────────────────────────────────────────────────────

type Section = "hub" | "plans" | "foods" | "meals" | "formulas" | "groups";

const LibraryDietPage = () => {
  const { user } = useAuthStore();
  const [section, setSection] = useState<Section>("hub");
  const current = HUB_ITEMS.find(h => h.key === section);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <button onClick={() => setSection("hub")} className="hover:text-foreground transition-colors">Dieta e Protocolo</button>
          {section !== "hub" && (
            <><ChevronRight className="w-3.5 h-3.5" /><span className="text-foreground font-medium">{current?.label}</span></>
          )}
        </div>
        <h1 className="text-2xl font-bold">{section === "hub" ? "Dieta e Protocolo" : current?.label}</h1>
        {section === "hub" && <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus protocolos, alimentos e fórmulas</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {section === "hub" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {HUB_ITEMS.map(item => (
                <button key={item.key} onClick={() => setSection(item.key as Section)}
                  className="flex items-center gap-4 p-5 bg-card border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Central de Ajuda</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {HELP_LINKS.map(link => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{link.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
        {section === "plans"   && user && <PlansSection coachId={user.id} />}
        {section === "foods"   && user && <FoodsSection coachId={user.id} />}
        {section === "formulas" && user && <FormulasSection coachId={user.id} />}
        {section === "groups"  && user && <FoodGroupsSection coachId={user.id} />}
        {section === "meals" && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Refeições predefinidas</p>
            <p className="text-xs mt-1 text-center max-w-xs">Crie refeições reutilizáveis para montar cardápios mais rápido. Em breve disponível.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryDietPage;
