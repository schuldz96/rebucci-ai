import { useState, useEffect } from "react";
import { Dumbbell, Plus, Search, Copy, Edit2, Trash2, MoreHorizontal, ChevronRight, X, Loader2, Save, Video, Play, Zap, LayoutGrid, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  muscle_group?: string;
  description?: string;
  video_url?: string;
}

interface SessionExercise {
  id?: string;
  exercise_id?: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  weight_kg?: number;
  video_url?: string;
  notes?: string;
}

interface WorkoutSession {
  id?: string;
  name: string;
  exercises: SessionExercise[];
}

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

const MUSCLE_GROUPS = ["Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Abdômen", "Quadríceps", "Posterior", "Glúteo", "Panturrilha", "Corpo inteiro", "Cardio"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"];
const HUB_ITEMS = [
  { key: "exercises",  label: "Meus exercícios",       icon: Play,       color: "bg-orange-500/10 text-orange-400", desc: "Banco de exercícios com vídeos" },
  { key: "techniques", label: "Técnicas avançadas",    icon: Zap,        color: "bg-yellow-500/10 text-yellow-400", desc: "Métodos e técnicas de intensidade" },
  { key: "plans",      label: "Meus treinos",          icon: Dumbbell,   color: "bg-primary/10 text-primary",       desc: "Fichas de treino completas com sessões" },
  { key: "presets",    label: "Treinos predefinidos",  icon: LayoutGrid, color: "bg-teal-500/10 text-teal-400",    desc: "Templates prontos para uso" },
  { key: "cardio",     label: "Meus planos de cardio", icon: Heart,      color: "bg-red-500/10 text-red-400",       desc: "Protocolos de cardio e HIIT" },
];

const WORKOUT_HELP_LINKS = [
  { label: "Como criar seus exercícios?",  href: "#" },
  { label: "Como montar uma ficha de treino?", href: "#" },
  { label: "Como criar planos de cardio?", href: "#" },
];

// ─── Modal Exercício ──────────────────────────────────────────────────────────

const ExerciseModal = ({ coachId, exercise, onClose, onSaved }: { coachId: string; exercise?: Exercise; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: exercise?.name ?? "",
    muscle_group: exercise?.muscle_group ?? "",
    description: exercise?.description ?? "",
    video_url: exercise?.video_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const getYoutubeEmbed = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { coach_id: coachId, name: form.name, muscle_group: form.muscle_group || null, description: form.description || null, video_url: form.video_url || null };
    const { error } = exercise
      ? await supabase.from("exercises").update(payload).eq("id", exercise.id)
      : await supabase.from("exercises").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: exercise ? "Exercício atualizado!" : "Exercício criado!" });
    onSaved();
  };

  const embedUrl = form.video_url ? getYoutubeEmbed(form.video_url) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{exercise ? "Editar Exercício" : "Novo Exercício"}</h2>
          <button onClick={onClose} className="text-xl text-muted-foreground hover:text-foreground px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <Input className="mt-1" placeholder="Ex: Supino reto com barra" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Grupo muscular</label>
            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              value={form.muscle_group} onChange={e => set("muscle_group", e.target.value)}>
              <option value="">Selecionar...</option>
              {MUSCLE_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5"><Video className="w-3.5 h-3.5" />URL do vídeo (YouTube)</label>
            <Input className="mt-1" placeholder="https://www.youtube.com/watch?v=..." value={form.video_url} onChange={e => set("video_url", e.target.value)} />
            {embedUrl && (
              <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="preview" />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Observações / Execução</label>
            <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2} placeholder="Instruções, dicas de execução..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : exercise ? "Salvar" : "Criar exercício"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Seção Exercícios ─────────────────────────────────────────────────────────

const ExercisesSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exercise | undefined>();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("exercises").select("*").eq("coach_id", coachId).order("name");
    setExercises(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este exercício?")) return;
    await supabase.from("exercises").delete().eq("id", id);
    toast({ title: "Exercício excluído" });
    load();
  };

  const filtered = exercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup !== "all" && e.muscle_group !== filterGroup) return false;
    return true;
  });

  const getYoutubeThumb = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar exercícios..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
          value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="all">Todos os grupos</option>
          {MUSCLE_GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
          <Plus className="w-4 h-4" />Novo exercício
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Play className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">{exercises.length === 0 ? "Nenhum exercício cadastrado" : "Nenhum resultado"}</p>
          {exercises.length === 0 && <Button size="sm" className="mt-4 gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" />Criar primeiro exercício</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(ex => {
            const thumb = getYoutubeThumb(ex.video_url);
            return (
              <div key={ex.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors group">
                {thumb ? (
                  <div className="relative aspect-video bg-black">
                    <img src={thumb} alt={ex.name} className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <a href={ex.video_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/30 flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{ex.name}</h3>
                  {ex.muscle_group && <span className="text-xs text-primary mt-0.5 block">{ex.muscle_group}</span>}
                  {ex.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ex.description}</p>}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(ex); setShowModal(true); }} className="flex-1 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1">
                      <Edit2 className="w-3 h-3" />Editar
                    </button>
                    <button onClick={() => handleDelete(ex.id)} className="flex-1 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1">
                      <Trash2 className="w-3 h-3" />Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AnimatePresence>
        {showModal && <ExerciseModal coachId={coachId} exercise={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
      </AnimatePresence>
    </div>
  );
};

// ─── Editor de Ficha ──────────────────────────────────────────────────────────

const WorkoutEditor = ({ coachId, plan, onClose, onSaved }: { coachId: string; plan?: WorkoutPlan; onClose: () => void; onSaved: () => void }) => {
  const { toast } = useToast();
  const [name, setName] = useState(plan?.name ?? "");
  const [goal, setGoal] = useState(plan?.goal ?? "");
  const [level, setLevel] = useState(plan?.level ?? "");
  const [weeks, setWeeks] = useState(String(plan?.weeks ?? ""));
  const [daysPerWeek, setDaysPerWeek] = useState(String(plan?.days_per_week ?? ""));
  const [description, setDescription] = useState(plan?.description ?? "");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(!!plan);
  const [exerciseBank, setExerciseBank] = useState<Exercise[]>([]);

  useEffect(() => {
    supabase.from("exercises").select("id,name,muscle_group,video_url").eq("coach_id", coachId).order("name").then(({ data }) => setExerciseBank(data ?? []));
    if (!plan) return;
    (async () => {
      const { data } = await supabase.from("workout_sessions").select("*, session_exercises(*)").eq("workout_plan_id", plan.id).order("sort_order");
      setSessions((data ?? []).map((s: any) => ({
        id: s.id, name: s.name,
        exercises: (s.session_exercises ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })));
      setLoadingSessions(false);
    })();
  }, [plan]);

  const addSession = () => setSessions(prev => [...prev, { name: `Treino ${String.fromCharCode(65 + prev.length)}`, exercises: [] }]);
  const removeSession = (i: number) => setSessions(prev => prev.filter((_, idx) => idx !== i));
  const updateSession = (i: number, key: string, val: any) => setSessions(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  const addExercise = (si: number) => setSessions(prev => prev.map((s, i) => i === si ? { ...s, exercises: [...s.exercises, { name: "", sets: 3, reps: "10", rest_seconds: 60 }] } : s));
  const removeExercise = (si: number, ei: number) => setSessions(prev => prev.map((s, i) => i === si ? { ...s, exercises: s.exercises.filter((_, j) => j !== ei) } : s));
  const updateExercise = (si: number, ei: number, key: string, val: any) => setSessions(prev => prev.map((s, i) => i === si ? { ...s, exercises: s.exercises.map((e, j) => j === ei ? { ...e, [key]: val } : e) } : s));

  const pickFromBank = (si: number, ei: number, ex: Exercise) => {
    updateExercise(si, ei, "name", ex.name);
    updateExercise(si, ei, "exercise_id", ex.id);
    if (ex.video_url) updateExercise(si, ei, "video_url", ex.video_url);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const planPayload = {
      coach_id: coachId, name, goal: goal || null, level: level || null,
      weeks: parseInt(weeks) || null, days_per_week: parseInt(daysPerWeek) || null,
      description: description || null, is_template: true,
    };
    let planId = plan?.id;
    if (plan) {
      await supabase.from("workout_plans").update(planPayload).eq("id", plan.id);
      await supabase.from("workout_sessions").delete().eq("workout_plan_id", plan.id);
    } else {
      const { data } = await supabase.from("workout_plans").insert(planPayload).select("id").single();
      planId = data?.id;
    }
    if (!planId) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const { data: sd } = await supabase.from("workout_sessions").insert({ workout_plan_id: planId, name: s.name, sort_order: i }).select("id").single();
      if (!sd?.id) continue;
      for (let j = 0; j < s.exercises.length; j++) {
        const ex = s.exercises[j];
        await supabase.from("session_exercises").insert({
          session_id: sd.id, exercise_id: ex.exercise_id ?? null, name: ex.name,
          sets: ex.sets || 3, reps: ex.reps || "10", rest_seconds: ex.rest_seconds || 60,
          weight_kg: ex.weight_kg ?? null, video_url: ex.video_url ?? null,
          notes: ex.notes ?? null, sort_order: j,
        });
      }
    }
    toast({ title: plan ? "Ficha atualizada!" : "Ficha criada!" });
    setSaving(false);
    onSaved();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">{plan ? "Editar Ficha" : "Nova Ficha de Treino"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Nome da ficha *</label>
              <Input className="mt-1" placeholder="Ex: Hipertrofia ABC" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Objetivo</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="">Selecionar...</option>
                {["Hipertrofia", "Emagrecimento", "Força", "Resistência", "Reabilitação", "Condicionamento"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Nível</label>
              <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">Selecionar...</option>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Semanas</label>
              <Input className="mt-1" type="number" min={1} placeholder="Ex: 12" value={weeks} onChange={e => setWeeks(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Dias/semana</label>
              <Input className="mt-1" type="number" min={1} max={7} placeholder="Ex: 3" value={daysPerWeek} onChange={e => setDaysPerWeek(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observações</label>
              <Input className="mt-1" placeholder="Notas gerais sobre a ficha..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {loadingSessions ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, si) => (
                <div key={si} className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 flex items-center gap-3">
                    <Input className="h-7 text-sm font-medium bg-transparent border-0 focus-visible:ring-0 p-0 flex-1"
                      placeholder="Nome da sessão" value={session.name} onChange={e => updateSession(si, "name", e.target.value)} />
                    <span className="text-xs text-muted-foreground">{session.exercises.length} exerc.</span>
                    <button onClick={() => removeSession(si)} className="p-1 rounded text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                  {session.exercises.length > 0 && (
                    <div className="px-4 py-1.5 grid grid-cols-12 gap-2 bg-muted/20 border-b border-border">
                      <span className="col-span-3 text-[10px] font-semibold text-muted-foreground uppercase">Exercício</span>
                      <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase">Do banco</span>
                      <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase">Sér.</span>
                      <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase">Reps</span>
                      <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase">Desc</span>
                      <span className="col-span-1 text-[10px] font-semibold text-muted-foreground uppercase">Kg</span>
                      <span className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase">Vídeo</span>
                    </div>
                  )}
                  <div className="divide-y divide-border/50">
                    {session.exercises.map((ex, ei) => (
                      <div key={ei} className="px-4 py-2 grid grid-cols-12 gap-2 items-center">
                        <Input className="col-span-3 h-7 text-xs" placeholder="Nome" value={ex.name} onChange={e => updateExercise(si, ei, "name", e.target.value)} />
                        <div className="col-span-2">
                          <select className="w-full h-7 rounded-md border border-input bg-background text-xs px-1 focus:outline-none"
                            value={ex.exercise_id ?? ""} onChange={e => { const found = exerciseBank.find(b => b.id === e.target.value); if (found) pickFromBank(si, ei, found); }}>
                            <option value="">Selecionar...</option>
                            {exerciseBank.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <Input className="col-span-1 h-7 text-xs text-center" type="number" min={1} value={ex.sets} onChange={e => updateExercise(si, ei, "sets", parseInt(e.target.value))} />
                        <Input className="col-span-1 h-7 text-xs text-center" placeholder="10" value={ex.reps} onChange={e => updateExercise(si, ei, "reps", e.target.value)} />
                        <Input className="col-span-1 h-7 text-xs text-center" type="number" value={ex.rest_seconds} onChange={e => updateExercise(si, ei, "rest_seconds", parseInt(e.target.value))} />
                        <Input className="col-span-1 h-7 text-xs text-center" type="number" placeholder="kg" value={ex.weight_kg ?? ""} onChange={e => updateExercise(si, ei, "weight_kg", e.target.value ? parseFloat(e.target.value) : undefined)} />
                        <div className="col-span-2 flex items-center gap-1">
                          <Input className="h-7 text-xs flex-1" placeholder="URL YouTube" value={ex.video_url ?? ""} onChange={e => updateExercise(si, ei, "video_url", e.target.value)} />
                          {ex.video_url && <a href={ex.video_url} target="_blank" rel="noreferrer" className="p-1 rounded text-primary hover:text-primary/80"><Play className="w-3.5 h-3.5" /></a>}
                        </div>
                        <button onClick={() => removeExercise(si, ei)} className="col-span-1 p-1 rounded text-muted-foreground hover:text-destructive flex justify-center"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-border">
                    <button onClick={() => addExercise(si)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                      <Plus className="w-3.5 h-3.5" />Adicionar exercício
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addSession} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <Plus className="w-4 h-4" />Adicionar sessão (Treino A, B, C...)
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : plan ? "Salvar" : "Criar ficha"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Seção Fichas ─────────────────────────────────────────────────────────────

const PlansSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | undefined>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("workout_plans").select("*").eq("coach_id", coachId).eq("is_template", true).order("name");
    setPlans(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [coachId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta ficha?")) return;
    await supabase.from("workout_plans").delete().eq("id", id);
    toast({ title: "Ficha excluída" });
    load();
  };

  const handleDuplicate = async (plan: WorkoutPlan) => {
    const { data } = await supabase.from("workout_plans").insert({
      coach_id: coachId, name: `${plan.name} (cópia)`, goal: plan.goal, level: plan.level,
      weeks: plan.weeks, days_per_week: plan.days_per_week, description: plan.description, is_template: true,
    }).select("id").single();
    if (data?.id) {
      const { data: sessions } = await supabase.from("workout_sessions").select("*, session_exercises(*)").eq("workout_plan_id", plan.id);
      for (const s of sessions ?? []) {
        const { data: ns } = await supabase.from("workout_sessions").insert({ workout_plan_id: data.id, name: s.name, sort_order: s.sort_order }).select("id").single();
        if (ns?.id) {
          for (const ex of (s as any).session_exercises ?? []) {
            await supabase.from("session_exercises").insert({ ...ex, id: undefined, session_id: ns.id });
          }
        }
      }
    }
    toast({ title: "Ficha duplicada!" });
    load();
    setMenuOpen(null);
  };

  const filtered = plans.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar fichas..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowEditor(true); }}>
          <Plus className="w-4 h-4" />Nova ficha
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">{plans.length === 0 ? "Nenhuma ficha cadastrada" : "Nenhum resultado"}</p>
          {plans.length === 0 && <Button size="sm" className="mt-4 gap-2" onClick={() => setShowEditor(true)}><Plus className="w-4 h-4" />Criar primeira ficha</Button>}
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm pr-6 truncate">{plan.name}</h3>
              {plan.goal && <p className="text-xs text-primary mt-1">{plan.goal}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {plan.level && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{plan.level}</span>}
                {plan.weeks && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{plan.weeks} sem.</span>}
                {plan.days_per_week && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{plan.days_per_week}x/sem</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {showEditor && <WorkoutEditor coachId={coachId} plan={editing} onClose={() => setShowEditor(false)} onSaved={() => { setShowEditor(false); load(); }} />}
      </AnimatePresence>
    </div>
  );
};

// ─── Page Principal ───────────────────────────────────────────────────────────

type Section = "hub" | "plans" | "exercises" | "techniques" | "presets" | "cardio";

const LibraryWorkoutPage = () => {
  const { user } = useAuthStore();
  const [section, setSection] = useState<Section>("hub");
  const current = HUB_ITEMS.find(h => h.key === section);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <button onClick={() => setSection("hub")} className="hover:text-foreground transition-colors">Treino</button>
          {section !== "hub" && (
            <><ChevronRight className="w-3.5 h-3.5" /><span className="text-foreground font-medium">{current?.label}</span></>
          )}
        </div>
        <h1 className="text-2xl font-bold">{section === "hub" ? "Biblioteca de Treinos" : current?.label}</h1>
        {section === "hub" && <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas fichas e banco de exercícios com vídeos</p>}
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
                  <div>
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Central de Ajuda</p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {WORKOUT_HELP_LINKS.map(link => (
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
        {section === "plans"     && user && <PlansSection coachId={user.id} />}
        {section === "exercises" && user && <ExercisesSection coachId={user.id} />}
        {(section === "techniques" || section === "presets" || section === "cardio") && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            {section === "techniques" && <Zap className="w-12 h-12 mb-3 opacity-30" />}
            {section === "presets"    && <LayoutGrid className="w-12 h-12 mb-3 opacity-30" />}
            {section === "cardio"     && <Heart className="w-12 h-12 mb-3 opacity-30" />}
            <p className="text-sm font-medium">{HUB_ITEMS.find(h => h.key === section)?.label}</p>
            <p className="text-xs mt-1">Em breve disponível.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryWorkoutPage;
