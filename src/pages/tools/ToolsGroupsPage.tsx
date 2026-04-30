import { useState, useEffect } from "react";
import { UsersRound, Plus, Trash2, Edit2, Users, Loader2, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Group {
  id: string;
  name: string;
  description?: string;
  color?: string;
  member_count: number;
  created_at: string;
}

const COLORS = [
  "#9d66ff", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
];

// ─── Modal ────────────────────────────────────────────────────────────────────

const GroupModal = ({
  group,
  coachId,
  onClose,
  onSaved,
}: {
  group?: Group;
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [color, setColor] = useState(group?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { coach_id: coachId, name, description: description || null, color };
    const { error } = group
      ? await supabase.from("groups").update(payload).eq("id", group.id)
      : await supabase.from("groups").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: group ? "Grupo atualizado!" : "Grupo criado!" });
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
          <h2 className="font-semibold text-foreground">{group ? "Editar Grupo" : "Novo Grupo"}</h2>
          <button onClick={onClose} className="text-xl text-muted-foreground hover:text-foreground px-2">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nome *</label>
            <Input className="mt-1" placeholder="Ex: Alunos Online" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <Input className="mt-1" placeholder="Opcional..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Cor</label>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full border-2 transition-all", color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : group ? "Salvar" : "Criar grupo"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const ToolsGroupsPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Group | undefined>();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("groups")
      .select("*, group_members(id)")
      .eq("coach_id", user.id)
      .order("name");

    setGroups(
      (data ?? []).map((g) => ({
        ...g,
        member_count: (g.group_members as any[])?.length ?? 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este grupo? Os alunos não serão removidos.")) return;
    await supabase.from("groups").delete().eq("id", id);
    toast({ title: "Grupo excluído" });
    load();
  };

  const handleBroadcast = (group: Group) => {
    toast({ title: `Mensagem em massa para "${group.name}"`, description: "Integração com WhatsApp — em desenvolvimento" });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Organize alunos em grupos para ações em massa</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Novo grupo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <UsersRound className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum grupo criado ainda</p>
            <p className="text-xs mt-1">Crie grupos para enviar mensagens em massa ou filtrar alunos</p>
            <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditing(undefined); setShowModal(true); }}>
              <Plus className="w-4 h-4" />Criar primeiro grupo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${g.color}20` }}>
                      <UsersRound className="w-5 h-5" style={{ color: g.color ?? "#9d66ff" }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{g.name}</h3>
                      {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {g.member_count} membro{g.member_count !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleBroadcast(g)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-400/10 transition-colors"
                      title="Mensagem em massa"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditing(g); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && user && (
          <GroupModal
            group={editing}
            coachId={user.id}
            onClose={() => { setShowModal(false); setEditing(undefined); }}
            onSaved={() => { setShowModal(false); setEditing(undefined); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolsGroupsPage;
