import { useState, useEffect } from "react";
import { Salad, Plus, Search, Copy, Edit2, Trash2, MoreHorizontal, ChevronRight, Apple, FlaskConical, BookOpen, UtensilsCrossed, X, Loader2, Save } from "lucide-react";
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

interface Food {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealFood {
  id?: string;
  food_id?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id?: string;
  name: string;
  time_suggestion: string;
  foods: MealFood[];
}

// ─── Hub de navegação ─────────────────────────────────────────────────────────

const HUB_ITEMS = [
  { key: "foods",    label: "Meus alimentos",         icon: Apple,           color: "bg-orange-500/10 text-orange-400", desc: "Banco de alimentos e macros" },
  { key: "formulas", label: "Minhas fórmulas",        icon: FlaskConical,    color: "bg-violet-500/10 text-violet-400", desc: "Suplementos e combinações" },
  { key: "plans",    label: "Meus cardápios",         icon: BookOpen,        color: "bg-teal-500/10 text-teal-400",    desc: "Protocolos alimentares completos" },
  { key: "meals",    label: "Refeições predefinidas", icon: UtensilsCrossed, color: "bg-blue-500/10 text-blue-400",    desc: "Refeições reutilizáveis" },
];

const HELP_LINKS = [
  { label: "Como criar seus alimentos?",  href: "#" },
  { label: "Como criar suas fórmulas?",   href: "#" },
  { label: "Como criar seus cardápios?",  href: "#" },
];

// ─── Modal Alimento ───────────────────────────────────────────────────────────

const FoodModal = ({ coachId, food, onClose, onSaved }: { coachId: string; food?: Food; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: food?.name ?? "",
    quantity: String(food?.quantity ?? 100),
    unit: food?.unit ?? "g",
    calories: String(food?.calories ?? 0),
    protein: String(food?.protein ?? 0),
    carbs: String(food?.carbs ?? 0),
    fat: String(food?.fat ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      coach_id: coachId,
      name: form.name,
      quantity: parseFloat(form.quantity) || 100,
      unit: form.unit,
      calories: parseFloat(form.calories) || 0,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
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
        className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{food ? "Editar Alimento" : "Novo Alimento"}</h2>
          <button onClick={onClose} className="text-xl text-muted-foreground hover:text-foreground px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <Input className="mt-1" placeholder="Ex: Frango grelhado" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Quantidade</label>
              <Input className="mt-1" type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Unidade</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                value={form.unit} onChange={e => set("unit", e.target.value)}>
                {["g", "ml", "unidade", "colher", "xícara", "fatia"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Macros por porção</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "calories", label: "Calorias (kcal)", color: "text-orange-400" },
                { k: "protein",  label: "Proteína (g)",    color: "text-blue-400" },
                { k: "carbs",    label: "Carboidrato (g)", color: "text-yellow-400" },
                { k: "fat",      label: "Gordura (g)",     color: "text-red-400" },
              ].map(({ k, label, color }) => (
                <div key={k}>
                  <label className={cn("text-xs font-medium", color)}>{label}</label>
                  <Input className="mt-1" type="number" min={0} step={0.1}
                    value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : food ? "Salvar" : "Criar alimento"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Seção Alimentos ──────────────────────────────────────────────────────────

const FoodsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Food | undefined>();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("foods").select("*").eq("coach_id", coachId).order("name");
    setFoods(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este alimento?")) return;
    await supabase.from("foods").delete().eq("id", id);
    toast({ title: "Alimento excluído" });
    load();
  };

  const filtered = foods.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar alimentos..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
          <Plus className="w-4 h-4" />Novo alimento
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
                {["Alimento", "Porção", "Kcal", "Prot.", "Carb.", "Gord.", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(food => (
                <tr key={food.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{food.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{food.quantity}{food.unit}</td>
                  <td className="px-4 py-3 text-orange-400 font-medium">{food.calories}</td>
                  <td className="px-4 py-3 text-blue-400">{food.protein}g</td>
                  <td className="px-4 py-3 text-yellow-400">{food.carbs}g</td>
                  <td className="px-4 py-3 text-red-400">{food.fat}g</td>
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
          <FoodModal coachId={coachId} food={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Editor de Dieta (modal completo) ─────────────────────────────────────────

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
        id: m.id,
        name: m.name,
        time_suggestion: m.time_suggestion ?? "",
        foods: (m.meal_foods ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })));
      setLoadingMeals(false);
    })();
  }, [plan]);

  const addMeal = () => setMeals(prev => [...prev, { name: `Refeição ${prev.length + 1}`, time_suggestion: "", foods: [] }]);

  const removeMeal = (i: number) => setMeals(prev => prev.filter((_, idx) => idx !== i));

  const updateMeal = (i: number, key: keyof Meal, value: any) => setMeals(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: value } : m));

  const addFood = (mealIdx: number) => setMeals(prev => prev.map((m, i) => i === mealIdx ? {
    ...m,
    foods: [...m.foods, { name: "", quantity: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 }]
  } : m));

  const removeFood = (mealIdx: number, foodIdx: number) => setMeals(prev => prev.map((m, i) => i === mealIdx ? {
    ...m, foods: m.foods.filter((_, fi) => fi !== foodIdx)
  } : m));

  const updateFood = (mealIdx: number, foodIdx: number, key: keyof MealFood, value: any) => setMeals(prev => prev.map((m, i) => i === mealIdx ? {
    ...m, foods: m.foods.map((f, fi) => fi === foodIdx ? { ...f, [key]: value } : f)
  } : m));

  // Totais calculados
  const totals = meals.reduce((acc, m) => {
    m.foods.forEach(f => {
      acc.calories += parseFloat(String(f.calories)) || 0;
      acc.protein += parseFloat(String(f.protein)) || 0;
      acc.carbs += parseFloat(String(f.carbs)) || 0;
      acc.fat += parseFloat(String(f.fat)) || 0;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);

    const planPayload = {
      coach_id: coachId, name, goal: goal || null, description: description || null,
      calorie_target: Math.round(totals.calories) || null,
      protein_target: Math.round(totals.protein) || null,
      carb_target: Math.round(totals.carbs) || null,
      fat_target: Math.round(totals.fat) || null,
      is_template: true,
    };

    let planId = plan?.id;
    if (plan) {
      await supabase.from("diet_plans").update(planPayload).eq("id", plan.id);
      await supabase.from("meals").delete().eq("diet_plan_id", plan.id);
    } else {
      const { data } = await supabase.from("diet_plans").insert(planPayload).select("id").single();
      planId = data?.id;
    }

    if (!planId) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }

    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      const { data: mealData } = await supabase.from("meals").insert({
        diet_plan_id: planId, name: meal.name, time_suggestion: meal.time_suggestion || null, sort_order: i,
      }).select("id").single();
      if (!mealData?.id) continue;
      for (let j = 0; j < meal.foods.length; j++) {
        const f = meal.foods[j];
        await supabase.from("meal_foods").insert({
          meal_id: mealData.id, name: f.name, quantity: parseFloat(String(f.quantity)) || 100,
          unit: f.unit, calories: parseFloat(String(f.calories)) || 0,
          protein: parseFloat(String(f.protein)) || 0,
          carbs: parseFloat(String(f.carbs)) || 0,
          fat: parseFloat(String(f.fat)) || 0,
          sort_order: j,
        });
      }
    }

    toast({ title: plan ? "Cardápio atualizado!" : "Cardápio criado!" });
    setSaving(false);
    onSaved();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">{plan ? "Editar Cardápio" : "Novo Cardápio"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Info básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium">Nome do cardápio *</label>
              <Input className="mt-1" placeholder="Ex: Protocolo Low Carb" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium">Objetivo</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="">Selecionar objetivo...</option>
                {["Emagrecimento", "Ganho de massa", "Manutenção", "Performance", "Saúde geral"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2} placeholder="Observações sobre o protocolo..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Totais calculados */}
          {(totals.calories > 0 || totals.protein > 0) && (
            <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
              <span className="text-xs text-muted-foreground font-medium">TOTAIS DO DIA:</span>
              <span className="text-xs font-bold text-orange-400">{Math.round(totals.calories)} kcal</span>
              <span className="text-xs font-bold text-blue-400">{Math.round(totals.protein)}g prot</span>
              <span className="text-xs font-bold text-yellow-400">{Math.round(totals.carbs)}g carb</span>
              <span className="text-xs font-bold text-red-400">{Math.round(totals.fat)}g gord</span>
            </div>
          )}

          {/* Refeições */}
          {loadingMeals ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {meals.map((meal, mi) => {
                const mealTotals = meal.foods.reduce((acc, f) => ({
                  calories: acc.calories + (parseFloat(String(f.calories)) || 0),
                  protein: acc.protein + (parseFloat(String(f.protein)) || 0),
                  carbs: acc.carbs + (parseFloat(String(f.carbs)) || 0),
                  fat: acc.fat + (parseFloat(String(f.fat)) || 0),
                }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

                return (
                  <div key={mi} className="border border-border rounded-xl overflow-hidden">
                    {/* Cabeçalho da refeição */}
                    <div className="bg-muted/40 px-4 py-3 flex items-center gap-3">
                      <Input className="h-7 text-sm font-medium bg-transparent border-0 focus-visible:ring-0 p-0 flex-1"
                        placeholder="Nome da refeição" value={meal.name} onChange={e => updateMeal(mi, "name", e.target.value)} />
                      <Input className="h-7 text-xs w-28 bg-background"
                        placeholder="Horário (ex: 07:00)" value={meal.time_suggestion} onChange={e => updateMeal(mi, "time_suggestion", e.target.value)} />
                      {mealTotals.calories > 0 && (
                        <span className="text-xs text-orange-400 font-medium whitespace-nowrap">{Math.round(mealTotals.calories)} kcal</span>
                      )}
                      <button onClick={() => removeMeal(mi)} className="p-1 rounded text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                    </div>

                    {/* Alimentos da refeição */}
                    <div className="divide-y divide-border">
                      {meal.foods.map((food, fi) => (
                        <div key={fi} className="px-4 py-2 grid grid-cols-12 gap-2 items-center">
                          <Input className="col-span-4 h-7 text-xs" placeholder="Alimento" value={food.name} onChange={e => updateFood(mi, fi, "name", e.target.value)} />
                          <Input className="col-span-2 h-7 text-xs" type="number" placeholder="Qtd" value={food.quantity} onChange={e => updateFood(mi, fi, "quantity", e.target.value)} />
                          <select className="col-span-1 h-7 rounded-md border border-input bg-background text-xs px-1 focus:outline-none"
                            value={food.unit} onChange={e => updateFood(mi, fi, "unit", e.target.value)}>
                            {["g", "ml", "un", "col", "xíc"].map(u => <option key={u}>{u}</option>)}
                          </select>
                          <Input className="col-span-1 h-7 text-xs text-orange-400" type="number" placeholder="kcal" value={food.calories} onChange={e => updateFood(mi, fi, "calories", e.target.value)} />
                          <Input className="col-span-1 h-7 text-xs text-blue-400" type="number" placeholder="P" value={food.protein} onChange={e => updateFood(mi, fi, "protein", e.target.value)} />
                          <Input className="col-span-1 h-7 text-xs text-yellow-400" type="number" placeholder="C" value={food.carbs} onChange={e => updateFood(mi, fi, "carbs", e.target.value)} />
                          <Input className="col-span-1 h-7 text-xs text-red-400" type="number" placeholder="G" value={food.fat} onChange={e => updateFood(mi, fi, "fat", e.target.value)} />
                          <button onClick={() => removeFood(mi, fi)} className="col-span-1 p-1 rounded text-muted-foreground hover:text-destructive flex justify-center"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>

                    <div className="px-4 py-2 border-t border-border">
                      <button onClick={() => addFood(mi)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                        <Plus className="w-3.5 h-3.5" />Adicionar alimento
                      </button>
                    </div>
                  </div>
                );
              })}

              <button onClick={addMeal} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <Plus className="w-4 h-4" />Adicionar refeição
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : plan ? "Salvar" : "Criar cardápio"}
          </Button>
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
  const [search, setSearch] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<DietPlan | undefined>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("diet_plans").select("*").eq("coach_id", coachId).eq("is_template", true).order("name");
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
    const { data } = await supabase.from("diet_plans").insert({
      coach_id: coachId, name: `${plan.name} (cópia)`, description: plan.description,
      goal: plan.goal, calorie_target: plan.calorie_target, protein_target: plan.protein_target,
      carb_target: plan.carb_target, fat_target: plan.fat_target, is_template: true,
    }).select("id").single();
    if (data?.id) {
      const { data: mealsData } = await supabase.from("meals").select("*, meal_foods(*)").eq("diet_plan_id", plan.id);
      for (const meal of mealsData ?? []) {
        const { data: newMeal } = await supabase.from("meals").insert({ diet_plan_id: data.id, name: meal.name, time_suggestion: meal.time_suggestion, sort_order: meal.sort_order }).select("id").single();
        if (newMeal?.id) {
          for (const mf of meal.meal_foods ?? []) {
            await supabase.from("meal_foods").insert({ ...mf, id: undefined, meal_id: newMeal.id });
          }
        }
      }
    }
    toast({ title: "Cardápio duplicado!" });
    load();
    setMenuOpen(null);
  };

  const filtered = plans.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cardápios..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowEditor(true); }}>
          <Plus className="w-4 h-4" />Novo cardápio
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">{plans.length === 0 ? "Nenhum cardápio cadastrado" : "Nenhum resultado"}</p>
          {plans.length === 0 && <Button size="sm" className="mt-4 gap-2" onClick={() => setShowEditor(true)}><Plus className="w-4 h-4" />Criar primeiro cardápio</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(plan => (
            <div key={plan.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group relative" onClick={() => setMenuOpen(null)}>
              <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => setMenuOpen(menuOpen === plan.id ? null : plan.id)} className="p-1 rounded-lg text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
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
              {(plan.calorie_target || plan.protein_target) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.calorie_target && <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-orange-400/10 text-orange-400">{plan.calorie_target} kcal</span>}
                  {plan.protein_target && <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-400/10 text-blue-400">{plan.protein_target}g prot</span>}
                  {plan.carb_target && <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-yellow-400/10 text-yellow-400">{plan.carb_target}g carb</span>}
                  {plan.fat_target && <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-red-400/10 text-red-400">{plan.fat_target}g gord</span>}
                </div>
              )}
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

// ─── Seção Fórmulas (placeholder rico) ────────────────────────────────────────

const FormulasSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [formulas, setFormulas] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Food | undefined>();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("foods").select("*").eq("coach_id", coachId).eq("unit", "fórmula").order("name");
    setFormulas(data ?? []);
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
          <p className="text-xs mt-1">Cadastre suplementos e combinações como alimentos com unidade "fórmula"</p>
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
          <FoodModal coachId={coachId} food={editing ? { ...editing, unit: "fórmula" } : undefined}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Page Principal ───────────────────────────────────────────────────────────

type Section = "hub" | "plans" | "foods" | "meals" | "formulas";

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
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium">{current?.label}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold">{section === "hub" ? "Dieta e Protocolo" : current?.label}</h1>
        {section === "hub" && <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus protocolos, alimentos e fórmulas</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {section === "hub" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HUB_ITEMS.map(item => (
                <button key={item.key} onClick={() => setSection(item.key as Section)}
                  className="flex items-center gap-4 p-5 bg-card border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
        {section === "meals"   && (
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
