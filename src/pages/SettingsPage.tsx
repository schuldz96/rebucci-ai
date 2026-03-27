import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare, Wifi, Brain, Save, Zap, RefreshCw,
  Eye, EyeOff, Search, Users, Link2, Copy, Check, Loader2, Pencil, X,
  Plus, Trash2, Shield, Tag, ChevronDown, Building2, Facebook, Kanban, GripVertical, Key,
} from "lucide-react";
import { usePipelineStore } from "@/store/pipelineStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { evolutionApi, type EvoInstance } from "@/lib/evolutionApi";

const SUPABASE_URL = "https://urrbpxrtdzurfdsucukb.supabase.co";
const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type SettingsSection = "general" | "users" | "pipelines" | "properties" | "tokens" | "evolution" | "meta" | "prime";
type EvoTab = "config" | "instances" | "rag";
type UserTab = "users" | "teams";
type ModalType = null | "user" | "team" | "perm" | "preset";

interface CrmUser { id: string; name: string; email: string; role: string; team_id: string | null; permission_set_id: string | null; status: "active" | "inactive"; created_at: string; }
interface Team { id: string; name: string; description: string | null; }
interface PermissionSet { id: string; name: string; description: string | null; }
interface Preset { id: string; name: string; type: string; content: string | null; }

const SECTION_MAP: Record<string, SettingsSection> = {
  geral: "general", usuarios: "users", pipelines: "pipelines", propriedades: "properties", tokens: "tokens", evolution: "evolution", meta: "meta", prime: "prime",
};
const SECTION_SLUG: Record<SettingsSection, string> = {
  general: "geral", users: "usuarios", pipelines: "pipelines", properties: "propriedades", tokens: "tokens", evolution: "evolution", meta: "meta", prime: "prime",
};

const menuSections = [
  { title: "Geral", items: [{ id: "general" as const, label: "Geral", icon: Building2 }] },
  { title: "Gerenciamento de conta", items: [
    { id: "users" as const, label: "Usuários", icon: Users },
    { id: "pipelines" as const, label: "Pipelines", icon: Kanban },
    { id: "properties" as const, label: "Propriedades", icon: Tag },
    { id: "tokens" as const, label: "Tokens", icon: Key },
  ]},
  { title: "Integrações", items: [
    { id: "evolution" as const, label: "EvolutionAPI", icon: Link2 },
    { id: "meta" as const, label: "Meta API", icon: Facebook },
    { id: "prime" as const, label: "Prime", icon: Zap },
  ]},
];

// ─── Tokens Section ───────────────────────────────────────────────────────────
const TOKEN_PROVIDERS = ["OpenAI", "Anthropic", "Google Gemini", "Groq", "Mistral", "Outro"];

const TokensSection = () => {
  const [tokens, setTokens] = useState<{ id: string; provider: string; label: string; token: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ provider: "OpenAI", label: "", token: "" });
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.from("api_tokens").select("*").order("created_at").then(({ data }) => {
      if (data) setTokens(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!form.token) return;
    setSaving(true);
    const { data } = await supabase.from("api_tokens").insert({ provider: form.provider, label: form.label || form.provider, token: form.token }).select().single();
    if (data) setTokens((prev) => [...prev, data]);
    setForm({ provider: "OpenAI", label: "", token: "" });
    setModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("api_tokens").delete().eq("id", id);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center"><Key className="w-5 h-5 text-yellow-500" /></div>
        <div><h2 className="text-xl font-bold text-foreground">Tokens</h2><p className="text-sm text-muted-foreground">Gerencie tokens de API para IA e integrações</p></div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Novo token
        </button>
      </div>
      {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
      {!loading && tokens.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhum token cadastrado</div>}
      {!loading && tokens.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Provedor", "Rótulo", "Token", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{t.provider}</span></td>
                  <td className="px-4 py-3 text-foreground">{t.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{showToken[t.id] ? t.token : "••••••••••••••••"}</span>
                      <button onClick={() => setShowToken((p) => ({ ...p, [t.id]: !p[t.id] }))} className="text-muted-foreground hover:text-foreground">
                        {showToken[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Novo token</h3>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Provedor</label>
                <select value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} className={inputCls}>
                  {TOKEN_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Rótulo (opcional)</label>
                <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex: Produção, Dev..." className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Token *</label>
                <input type="password" value={form.token} onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))} placeholder="sk-..." className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.token}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Properties Section ────────────────────────────────────────────────────────
const PROPERTY_TYPES = ["Texto", "Número", "Data", "Seleção única", "Seleção múltipla", "Booleano", "URL", "Telefone", "E-mail"];
const PROPERTY_OBJECTS = ["Negócio", "Contato"];

const PropertiesSection = () => {
  const [properties, setProperties] = useState<{ id: string; name: string; type: string; object_type: string; required: boolean; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Texto", object_type: "Negócio", required: false });
  const [saving, setSaving] = useState(false);
  const [filterObj, setFilterObj] = useState<string>("Todos");

  useEffect(() => {
    supabase.from("crm_properties").select("*").order("created_at").then(({ data }) => {
      if (data) setProperties(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const { data } = await supabase.from("crm_properties").insert(form).select().single();
    if (data) setProperties((prev) => [...prev, data]);
    setForm({ name: "", type: "Texto", object_type: "Negócio", required: false });
    setModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("crm_properties").delete().eq("id", id);
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = filterObj === "Todos" ? properties : properties.filter((p) => p.object_type === filterObj);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center"><Tag className="w-5 h-5 text-primary" /></div>
        <div><h2 className="text-xl font-bold text-foreground">Propriedades</h2><p className="text-sm text-muted-foreground">Campos personalizados para negócios e contatos</p></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 border border-border rounded-xl overflow-hidden">
          {["Todos", ...PROPERTY_OBJECTS].map((o) => (
            <button key={o} onClick={() => setFilterObj(o)}
              className={cn("px-4 py-2 text-sm transition-colors", filterObj === o ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50")}>
              {o}
            </button>
          ))}
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Nova propriedade
        </button>
      </div>
      {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
      {!loading && filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma propriedade cadastrada</div>}
      {!loading && filtered.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Nome", "Tipo", "Objeto", "Obrigatório", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{p.type}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.object_type}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs", p.required ? "text-primary" : "text-muted-foreground")}>{p.required ? "Sim" : "Não"}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Nova propriedade</h3>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Segmento, Região..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
                    {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Objeto</label>
                  <select value={form.object_type} onChange={(e) => setForm((f) => ({ ...f, object_type: e.target.value }))} className={inputCls}>
                    {PROPERTY_OBJECTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.required} onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} className="rounded" />
                <span className="text-sm text-foreground">Campo obrigatório</span>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Pipeline Settings Component ──────────────────────────────────────────────
const STAGE_COLORS = [
  { label: "Azul", value: "bg-blue-500" },
  { label: "Roxo", value: "bg-purple-500" },
  { label: "Verde", value: "bg-emerald-500" },
  { label: "Ciano", value: "bg-cyan-500" },
  { label: "Amarelo", value: "bg-yellow-500" },
  { label: "Rosa", value: "bg-pink-500" },
  { label: "Laranja", value: "bg-orange-500" },
  { label: "Vermelho", value: "bg-red-500" },
];

const PipelinesSection = () => {
  const { pipelines, selectedPipelineId, stages, loading, loadPipelines, selectPipeline, createPipeline, renamePipeline, deletePipeline, createStage, updateStage, deleteStage } = usePipelineStore();
  const [newPipelineName, setNewPipelineName] = useState("");
  const [addingPipeline, setAddingPipeline] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPipelines(); }, [loadPipelines]);

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    setSaving(true);
    const p = await createPipeline(newPipelineName.trim());
    if (p) selectPipeline(p.id);
    setNewPipelineName("");
    setAddingPipeline(false);
    setSaving(false);
  };

  const handleAddStage = async () => {
    if (!newStageName.trim() || !selectedPipelineId) return;
    await createStage(selectedPipelineId, newStageName.trim());
    setNewStageName("");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Kanban className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Pipelines</h2>
          <p className="text-sm text-muted-foreground">Configure os pipelines e etapas dos seus negócios</p>
        </div>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}

      {!loading && (
        <div className="flex gap-6">
          {/* Lista de pipelines */}
          <div className="w-56 shrink-0 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pipelines</p>
            {pipelines.map((p) => (
              <div key={p.id} className={cn("group flex items-center gap-1 px-3 py-2 rounded-xl cursor-pointer transition-colors",
                p.id === selectedPipelineId ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-foreground")}>
                {renamingId === p.id ? (
                  <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={async () => { await renamePipeline(p.id, renameVal || p.name); setRenamingId(null); }}
                    onKeyDown={async (e) => { if (e.key === "Enter") { await renamePipeline(p.id, renameVal || p.name); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }}
                    className="flex-1 bg-transparent text-sm focus:outline-none border-b border-primary" />
                ) : (
                  <span className="flex-1 text-sm truncate" onClick={() => selectPipeline(p.id)}>{p.name}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                  <button onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }} className="p-0.5 hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                  {pipelines.length > 1 && (
                    <button onClick={() => deletePipeline(p.id)} className="p-0.5 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            ))}
            {addingPipeline ? (
              <div className="flex gap-1 px-1">
                <input autoFocus value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreatePipeline(); if (e.key === "Escape") setAddingPipeline(false); }}
                  placeholder="Nome do pipeline" className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-background border border-ring focus:outline-none" />
                <button onClick={handleCreatePipeline} disabled={saving} className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingPipeline(true)}
                className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary transition-colors">
                <Plus className="w-3.5 h-3.5" /> Novo pipeline
              </button>
            )}
          </div>

          {/* Etapas do pipeline selecionado */}
          <div className="flex-1 space-y-3">
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="w-6 px-3 py-3"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome da fase</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Cor</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage) => (
                    <tr key={stage.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-3 py-3 text-muted-foreground cursor-grab"><GripVertical className="w-4 h-4" /></td>
                      <td className="px-4 py-3">
                        <input defaultValue={stage.name}
                          onBlur={(e) => { if (e.target.value !== stage.name) updateStage(stage.id, { name: e.target.value }); }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          className="w-full bg-transparent text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border px-1 py-0.5" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-4 h-4 rounded-full shrink-0", stage.color ?? "bg-primary")} />
                          <select value={stage.color ?? "bg-primary"} onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                            className="text-xs bg-transparent text-muted-foreground focus:outline-none cursor-pointer">
                            {STAGE_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteStage(stage.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stages.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma fase cadastrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Adicionar fase */}
            <div className="flex gap-2">
              <input value={newStageName} onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddStage(); }}
                placeholder="Nome da nova fase..." className={inputCls} />
              <button onClick={handleAddStage} disabled={!newStageName.trim() || !selectedPipelineId}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 shrink-0">
                <Plus className="w-4 h-4" /> Adicionar fase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsPage = () => {
  const { subsection } = useParams<{ subsection: string }>();
  const navigate = useNavigate();
  const section: SettingsSection = SECTION_MAP[subsection ?? "geral"] ?? "general";
  const setSection = (s: SettingsSection) => navigate(`/settings/${SECTION_SLUG[s]}`);
  const [evoTab, setEvoTab] = useState<EvoTab>("config");

  // Prime section state
  const [primeEndpoints, setPrimeEndpoints] = useState<{ id: string; name: string; url: string; method: string; description: string; auth_token: string }[]>([]);
  const [primeLoading, setPrimeLoading] = useState(false);
  const [primeModal, setPrimeModal] = useState(false);
  const [primeForm, setPrimeForm] = useState({ name: "", url: "", method: "GET", description: "", auth_token: "" });
  const [primeSaving, setPrimeSaving] = useState(false);
  const [primeTesting, setPrimeTesting] = useState<string | null>(null);
  const [primeTestResult, setPrimeTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // General section state
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMsg, setGeneralMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Config state
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Instances state
  const [instances, setInstances] = useState<EvoInstance[]>([]);
  const [webhooks, setWebhooks] = useState<Record<string, string>>({});
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [connectingInstance, setConnectingInstance] = useState<string | null>(null);
  const [pairingCodes, setPairingCodes] = useState<Record<string, string>>({});

  // RAG state
  const [ragInstance, setRagInstance] = useState("");
  const [ragMessageLimit, setRagMessageLimit] = useState(10000);
  const [ragFreq, setRagFreq] = useState<"once" | "daily">("once");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragStatus, setRagStatus] = useState<string | null>(null);
  const [ragJobs, setRagJobs] = useState<{ id: string; instance_name: string; status: string; total_messages: number | null; total_chunks: number | null; created_at: string }[]>([]);
  const ragCancelRef = React.useRef(false);
  const csvCancelRef = React.useRef(false);

  // Vectorstore state
  const [vsInstance, setVsInstance] = useState("");
  const [vsLoading, setVsLoading] = useState(false);
  const [vsStatuses, setVsStatuses] = useState<{ instance_name: string; total_chunks: number; embedded: number; status: string; error_message?: string | null }[]>([]);

  // CSV upload state
  const [csvInstance, setCsvInstance] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  // Users section state
  const [userTab, setUserTab] = useState<UserTab>("users");
  const [userSearch, setUserSearch] = useState("");
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [permSets, setPermSets] = useState<PermissionSet[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load saved config from Supabase
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("evolution_config").select("*").order("created_at", { ascending: false }).limit(1).single();
      if (data) {
        setConfigId(data.id);
        setApiUrl(data.api_url);
        setApiKey(data.api_token);
        setIsConfigured(true);
        evolutionApi.configure(data.api_url, data.api_token);
      }
    };
    load();
  }, []);

  // Load & save general settings
  useEffect(() => {
    supabase.from("company_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setCompanyName(data.company_name ?? "");
        setContactEmail(data.contact_email ?? "");
        setCompanyPhone(data.phone ?? "");
        setTimezone(data.timezone ?? "America/Sao_Paulo");
      }
    });
  }, []);

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    setGeneralMsg(null);
    try {
      const { data: existing } = await supabase.from("company_settings").select("id").limit(1).maybeSingle();
      const payload = { company_name: companyName, contact_email: contactEmail, phone: companyPhone, timezone };
      if (existing?.id) {
        await supabase.from("company_settings").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("company_settings").insert(payload);
      }
      setGeneralMsg({ ok: true, text: "Configurações salvas com sucesso." });
    } catch {
      setGeneralMsg({ ok: false, text: "Erro ao salvar configurações." });
    }
    setSavingGeneral(false);
  };

  // Load Prime endpoints
  useEffect(() => {
    if (section !== "prime") return;
    setPrimeLoading(true);
    supabase.from("prime_endpoints").select("*").order("created_at").then(({ data }) => {
      if (data) setPrimeEndpoints(data);
      setPrimeLoading(false);
    });
  }, [section]);

  const handleSavePrimeEndpoint = async () => {
    if (!primeForm.name || !primeForm.url) return;
    setPrimeSaving(true);
    const { data } = await supabase.from("prime_endpoints").insert({
      name: primeForm.name, url: primeForm.url, method: primeForm.method,
      description: primeForm.description || null, auth_token: primeForm.auth_token || null,
    }).select().single();
    if (data) setPrimeEndpoints((prev) => [...prev, data]);
    setPrimeForm({ name: "", url: "", method: "GET", description: "", auth_token: "" });
    setPrimeModal(false);
    setPrimeSaving(false);
  };

  const handleDeletePrimeEndpoint = async (id: string) => {
    await supabase.from("prime_endpoints").delete().eq("id", id);
    setPrimeEndpoints((prev) => prev.filter((e) => e.id !== id));
  };

  const handleTestPrimeEndpoint = async (endpoint: { id: string; url: string; method: string; auth_token: string }) => {
    setPrimeTesting(endpoint.id);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (endpoint.auth_token) headers["Authorization"] = `Bearer ${endpoint.auth_token}`;
      const res = await fetch(endpoint.url, { method: endpoint.method, headers });
      setPrimeTestResult((prev) => ({ ...prev, [endpoint.id]: { ok: res.ok, msg: `${res.status} ${res.statusText}` } }));
    } catch (e) {
      setPrimeTestResult((prev) => ({ ...prev, [endpoint.id]: { ok: false, msg: e instanceof Error ? e.message : "Erro" } }));
    }
    setPrimeTesting(null);
  };

  // Load RAG jobs
  const loadRagJobs = useCallback(async () => {
    const { data } = await supabase.from("rag_jobs").select("*").order("created_at", { ascending: false }).limit(10);
    if (data) setRagJobs(data);
  }, []);

  const handleDeleteJob = async (jobId: string) => {
    await supabase.from("rag_chunks").delete().eq("job_id", jobId);
    await supabase.from("rag_jobs").delete().eq("id", jobId);
    loadRagJobs();
  };

  const handleCancelJob = async (jobId: string) => {
    ragCancelRef.current = true;
    csvCancelRef.current = true;
    await supabase.from("rag_jobs").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", jobId);
    loadRagJobs();
  };

  const loadVsStatus = useCallback(async () => {
    const { data } = await supabase.from("vectorstore_status").select("*").order("instance_name");
    if (data) setVsStatuses(data);
  }, []);

  const handleGenerateEmbeddings = async () => {
    if (!vsInstance) return;
    setVsLoading(true);
    try {
      // Inicia status
      const now = new Date().toISOString();
      await supabase.from("vectorstore_status").upsert(
        { instance_name: vsInstance, status: "processing", last_run: now, updated_at: now },
        { onConflict: "instance_name" }
      );
      await loadVsStatus();

      // Chama Edge Function em loop até terminar
      while (true) {
        const { data, error } = await supabase.functions.invoke("generate-embeddings", {
          body: { instance_name: vsInstance },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        await loadVsStatus();

        if (data?.done) break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      await supabase.from("vectorstore_status").upsert(
        { instance_name: vsInstance, status: "error", error_message: msg, updated_at: new Date().toISOString() },
        { onConflict: "instance_name" }
      );
      await loadVsStatus();
    } finally {
      setVsLoading(false);
    }
  };

  // Carregar instâncias ao mudar para aba que precisar delas
  useEffect(() => {
    if ((evoTab === "instances" || evoTab === "rag") && isConfigured && instances.length === 0) {
      loadInstances();
    }
    if (evoTab === "rag") { loadRagJobs(); loadVsStatus(); }
  }, [evoTab, isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveConfig = async () => {
    if (!apiUrl || !apiKey) return;
    setSaving(true);
    try {
      if (configId) {
        await supabase.from("evolution_config").update({ api_url: apiUrl, api_token: apiKey, updated_at: new Date().toISOString() }).eq("id", configId);
      } else {
        const { data } = await supabase.from("evolution_config").insert({ api_url: apiUrl, api_token: apiKey }).select().single();
        if (data) setConfigId(data.id);
      }
      evolutionApi.configure(apiUrl, apiKey);
      setIsConfigured(true);
      setTestResult({ ok: true, msg: "Credenciais salvas com sucesso! ✅" });
    } catch {
      setTestResult({ ok: false, msg: "Erro ao salvar credenciais." });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    evolutionApi.configure(apiUrl, apiKey);
    const ok = await evolutionApi.testConnection();
    setTestResult({ ok, msg: ok ? "Conexão estabelecida com sucesso! ✅" : "Falha na conexão. Verifique a URL e o token." });
    setTesting(false);
  };

  const loadInstances = async () => {
    setLoadingInstances(true);
    try {
      const raw = await evolutionApi.fetchInstances();
      setInstances(raw);
      if (raw.length > 0 && !ragInstance) setRagInstance(raw[0].instance.instanceName);

      // Garantir webhook imutável para cada instância + carregar nomes customizados
      const newWebhooks: Record<string, string> = {};
      const newDisplayNames: Record<string, string> = {};
      for (const inst of raw) {
        const name = inst.instance.instanceName;
        const { data: existing } = await supabase.from("instance_webhooks").select("webhook_token, display_name").eq("instance_name", name).single();
        if (existing) {
          newWebhooks[name] = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${existing.webhook_token}`;
          if (existing.display_name) newDisplayNames[name] = existing.display_name;
        } else {
          const { data: created } = await supabase.from("instance_webhooks").insert({ instance_name: name }).select("webhook_token, display_name").single();
          if (created) newWebhooks[name] = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${created.webhook_token}`;
        }
      }
      setWebhooks(newWebhooks);
      setDisplayNames(newDisplayNames);

      // Sincroniza instâncias para a tabela instances (usada pelo AIAgentModal)
      for (const inst of raw) {
        const name = inst.instance.instanceName;
        const status = inst.instance.connectionStatus === "open" ? "online" : "offline";
        await supabase.from("instances").upsert({ name, phone: '', status }, { onConflict: "name", ignoreDuplicates: false });
      }
    } catch {
      /* silencioso */
    }
    setLoadingInstances(false);
  };


  const saveDisplayName = async (instanceName: string) => {
    const name = editNameValue.trim();
    await supabase.from("instance_webhooks")
      .update({ display_name: name || null })
      .eq("instance_name", instanceName);
    setDisplayNames((prev) => ({ ...prev, [instanceName]: name }));
    setEditingName(null);
  };

  const handleConnect = async (instanceName: string) => {
    setConnectingInstance(instanceName);
    const result = await evolutionApi.connectInstance(instanceName);
    if (result?.pairingCode) {
      setPairingCodes((prev) => ({ ...prev, [instanceName]: result.pairingCode! }));
    } else if (result?.code) {
      setPairingCodes((prev) => ({ ...prev, [instanceName]: `QR Code gerado — use o app WhatsApp para escanear` }));
    } else {
      setPairingCodes((prev) => ({ ...prev, [instanceName]: "Erro ao conectar. Verifique a instância." }));
    }
    setConnectingInstance(null);
  };

  const copyWebhook = (instanceName: string) => {
    const url = webhooks[instanceName];
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(instanceName);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  const handleGenerateRag = async () => {
    if (!ragInstance || ragMessageLimit < 1) return;
    setRagLoading(true);
    setRagStatus("Iniciando geração...");
    try {
      // Criar job
      const { data: job } = await supabase.from("rag_jobs").insert({
        instance_name: ragInstance,
        message_limit: ragMessageLimit,
        status: "processing",
      }).select().single();
      if (!job) throw new Error("Falha ao criar job");

      ragCancelRef.current = false;
      setRagStatus("Buscando conversas...");
      const chats = await evolutionApi.fetchChats(ragInstance, 1000);
      const activeChats = chats.slice(0, 1000);

      const msgsPerChat = Math.max(10, Math.floor(ragMessageLimit / Math.max(activeChats.length, 1)));
      let totalMessages = 0;
      let totalChunks = 0;
      const CHUNK_SIZE = 50;

      for (let ci = 0; ci < activeChats.length; ci++) {
        if (ragCancelRef.current) break;
        const chat = activeChats[ci];
        setRagStatus(`Processando conversa ${ci + 1} de ${activeChats.length}…`);

        const msgs = await evolutionApi.fetchMessages(ragInstance, chat.remoteJid, msgsPerChat);
        if (msgs.length === 0) continue;

        for (let i = 0; i < msgs.length; i += CHUNK_SIZE) {
          if (ragCancelRef.current) break;
          const slice = msgs.slice(i, i + CHUNK_SIZE);
          const content = slice
            .map((m) => {
              const who = m.key.fromMe ? "Atendente" : (m.pushName ?? "Cliente");
              const text = evolutionApi.extractMessageText(m);
              const time = new Date(m.messageTimestamp * 1000).toLocaleDateString("pt-BR");
              return `[${time}] ${who}: ${text}`;
            })
            .join("\n");

          await supabase.from("rag_chunks").insert({
            job_id: job.id,
            instance_name: ragInstance,
            chat_id: chat.remoteJid,
            contact_name: chat.name ?? chat.remoteJid.split("@")[0],
            content,
            message_count: slice.length,
            chunk_index: Math.floor(i / CHUNK_SIZE),
          });
          totalChunks++;
        }
        totalMessages += msgs.length;
      }

      const cancelled = ragCancelRef.current;
      await supabase.from("rag_jobs").update({
        status: "done",
        total_messages: totalMessages,
        total_chunks: totalChunks,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);

      // Auto-criar/atualizar rag_bases para esta instância
      await supabase.from("rag_bases").upsert(
        { id: `rag-${ragInstance}`, name: `Histórico ${ragInstance}`, origin: "whatsapp", document_count: totalChunks },
        { onConflict: "id" }
      );

      setRagStatus(cancelled
        ? `⚠️ Cancelado. ${totalMessages.toLocaleString()} msgs → ${totalChunks} chunks salvos.`
        : `✅ Concluído! ${totalMessages.toLocaleString()} mensagens → ${totalChunks} chunks`);
      loadRagJobs();
    } catch (err) {
      setRagStatus(`❌ Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
    ragCancelRef.current = false;
    setRagLoading(false);
  };

  // ── CSV Upload ──────────────────────────────────────────────────────────────
  const parseCSV = (text: string): string[][] => {
    // Detecta separador automaticamente (vírgula, ponto-vírgula, tab)
    const firstLine = text.split("\n")[0] ?? "";
    const sep = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
    return text
      .split("\n")
      .map((line) => line.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")))
      .filter((row) => row.some((c) => c.length > 0));
  };

  const handleCsvFile = (file: File) => {
    setCsvFile(file);
    setCsvStatus(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const rows = parseCSV(text);
      setCsvPreview(rows.slice(0, 5));
    };
    reader.readAsText(file, "utf-8");
  };

  const handleProcessCsv = async () => {
    if (!csvFile || !csvInstance) return;
    setCsvLoading(true);
    csvCancelRef.current = false;
    setCsvStatus("Lendo arquivo...");
    try {
      const text = await csvFile.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV vazio ou sem dados após o cabeçalho.");

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Detecta índices das colunas relevantes
      const idxJid = headers.findIndex(h => /remote.?jid|contato|contact|phone|numero/i.test(h));
      const idxFromMe = headers.findIndex(h => /from.?me|enviado|sent/i.test(h));
      const idxMsg = headers.findIndex(h => /mensagem|message|texto|text|body|conteudo/i.test(h));

      setCsvStatus("Agrupando conversas por contato...");

      // Agrupa mensagens por remote_jid
      const convMap = new Map<string, string[]>();
      for (const row of dataRows) {
        const jid = idxJid >= 0 ? (row[idxJid] ?? "desconhecido") : "desconhecido";
        const fromMe = idxFromMe >= 0 ? (row[idxFromMe] ?? "") : "";
        const msg = idxMsg >= 0 ? (row[idxMsg] ?? "") : row.join(" | ");
        if (!msg.trim()) continue;

        const speaker = String(fromMe).toLowerCase() === "true" || fromMe === "1" ? "[Atendente]" : "[Cliente]";
        const line = `${speaker} ${msg.trim()}`;

        if (!convMap.has(jid)) convMap.set(jid, []);
        convMap.get(jid)!.push(line);
      }

      const uniqueContacts = convMap.size;
      setCsvStatus(`${uniqueContacts.toLocaleString()} conversas únicas encontradas. Criando job...`);

      // Cria job
      const { data: job } = await supabase.from("rag_jobs").insert({
        instance_name: csvInstance,
        message_limit: dataRows.length,
        status: "processing",
      }).select().single();
      if (!job) throw new Error("Falha ao criar job");

      // Estratégia de chunking:
      // - Conversas com < 5 msgs → agrupa até 20 contatos por chunk (resumo compacto)
      // - Conversas com 5-500 msgs → 1 chunk por conversa
      // - Conversas com > 500 msgs → divide em partes de 500 msgs
      const MIN_MSGS_STANDALONE = 5;
      const MAX_MSGS_PER_CHUNK = 500;
      const SHORT_CONVS_PER_CHUNK = 20;
      const INSERT_BATCH = 20;
      let totalChunks = 0;
      let processed = 0;

      const pending: object[] = [];
      const shortConvBuffer: string[] = [];

      const flushShortConvs = () => {
        if (shortConvBuffer.length === 0) return;
        const content = shortConvBuffer.join("\n\n---\n\n");
        pending.push({
          job_id: job.id,
          instance_name: csvInstance,
          chat_id: `short-convs-${totalChunks}`,
          contact_name: "múltiplos contatos",
          content,
          message_count: shortConvBuffer.length,
          chunk_index: totalChunks,
        });
        shortConvBuffer.length = 0;
        totalChunks++;
      };

      for (const [jid, lines] of convMap) {
        const phone = jid.split("@")[0];

        if (lines.length < MIN_MSGS_STANDALONE) {
          // Conversa curta → acumula no buffer
          shortConvBuffer.push(`Conversa com ${phone}:\n${lines.join("\n")}`);
          if (shortConvBuffer.length >= SHORT_CONVS_PER_CHUNK) flushShortConvs();
        } else {
          // Conversa normal → 1 chunk por bloco de MAX_MSGS_PER_CHUNK mensagens
          for (let start = 0; start < lines.length; start += MAX_MSGS_PER_CHUNK) {
            const slice = lines.slice(start, start + MAX_MSGS_PER_CHUNK);
            const chunkIdx = Math.floor(start / MAX_MSGS_PER_CHUNK);
            const content = `Conversa com ${phone}${chunkIdx > 0 ? ` (parte ${chunkIdx + 1})` : ""}:\n${slice.join("\n")}`;
            pending.push({
              job_id: job.id,
              instance_name: csvInstance,
              chat_id: jid,
              contact_name: phone,
              content,
              message_count: slice.length,
              chunk_index: totalChunks,
            });
            totalChunks++;
          }
        }

        processed++;

        // Flush a cada INSERT_BATCH chunks
        if (pending.length >= INSERT_BATCH) {
          await supabase.from("rag_chunks").insert([...pending]);
          pending.length = 0;
          setCsvStatus(`Salvando... ${processed.toLocaleString()} de ${uniqueContacts.toLocaleString()} conversas (${totalChunks} chunks)`);
        }

        if (csvCancelRef.current) break;
      }

      // Flush conversas curtas restantes
      flushShortConvs();

      // Flush restante
      if (pending.length > 0) {
        await supabase.from("rag_chunks").insert([...pending]);
      }

      const csvCancelled = csvCancelRef.current;
      await supabase.from("rag_jobs").update({ status: csvCancelled ? "cancelled" : "done", total_messages: dataRows.length, total_chunks: totalChunks, updated_at: new Date().toISOString() }).eq("id", job.id);

      // Auto-cria/atualiza rag_bases
      const { data: existing } = await supabase.from("rag_bases").select("document_count").eq("id", `rag-${csvInstance}`).maybeSingle();
      const prevChunks = existing?.document_count ?? 0;
      await supabase.from("rag_bases").upsert(
        { id: `rag-${csvInstance}`, name: `Histórico ${csvInstance}`, origin: "whatsapp", document_count: prevChunks + totalChunks },
        { onConflict: "id" }
      );

      setCsvStatus(csvCancelled
        ? `⚠️ Cancelado. ${processed.toLocaleString()} conversas → ${totalChunks} chunks salvos.`
        : `✅ Concluído! ${dataRows.length.toLocaleString()} mensagens → ${uniqueContacts.toLocaleString()} conversas → ${totalChunks} chunks salvos.`);
      setCsvFile(null);
      setCsvPreview([]);
      if (csvInputRef.current) csvInputRef.current.value = "";
      loadRagJobs();
    } catch (err) {
      setCsvStatus(`❌ Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
    setCsvLoading(false);
  };

  // Carrega dados da seção de usuários
  useEffect(() => {
    if (section !== "users") return;
    const load = async () => {
      setUsersLoading(true);
      const [{ data: u }, { data: t }, { data: p }, { data: pr }] = await Promise.all([
        supabase.from("crm_users").select("*").order("created_at"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("permission_sets").select("*").order("name"),
        supabase.from("presets").select("*").order("name"),
      ]);
      if (u) setCrmUsers(u);
      if (t) setTeams(t);
      if (p) setPermSets(p);
      if (pr) setPresets(pr);
      setUsersLoading(false);
    };
    load();
  }, [section]);

  const openModal = (type: ModalType) => { setFormData({}); setModalType(type); };
  const closeModal = () => { setModalType(null); setFormData({}); };
  const setField = (k: string, v: string) => setFormData((prev) => ({ ...prev, [k]: v }));

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email) return;
    setSubmitting(true);
    const { data } = await supabase.from("crm_users").insert({
      name: formData.name, email: formData.email,
      role: formData.role || "Agente",
      team_id: formData.team_id || null,
      permission_set_id: formData.permission_set_id || null,
      status: "active",
    }).select().single();
    if (data) setCrmUsers((prev) => [...prev, data]);
    setSubmitting(false);
    closeModal();
  };

  const handleDeleteUser = async (id: string) => {
    await supabase.from("crm_users").delete().eq("id", id);
    setCrmUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleToggleUserStatus = async (user: CrmUser) => {
    const next = user.status === "active" ? "inactive" : "active";
    await supabase.from("crm_users").update({ status: next }).eq("id", user.id);
    setCrmUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: next } : u));
  };

  const handleCreateTeam = async () => {
    if (!formData.name) return;
    setSubmitting(true);
    const { data } = await supabase.from("teams").insert({ name: formData.name, description: formData.description || null }).select().single();
    if (data) setTeams((prev) => [...prev, data]);
    setSubmitting(false);
    closeModal();
  };

  const handleDeleteTeam = async (id: string) => {
    await supabase.from("teams").delete().eq("id", id);
    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreatePerm = async () => {
    if (!formData.name) return;
    setSubmitting(true);
    const { data } = await supabase.from("permission_sets").insert({ name: formData.name, description: formData.description || null }).select().single();
    if (data) setPermSets((prev) => [...prev, data]);
    setSubmitting(false);
    closeModal();
  };

  const handleDeletePerm = async (id: string) => {
    await supabase.from("permission_sets").delete().eq("id", id);
    setPermSets((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreatePreset = async () => {
    if (!formData.name) return;
    setSubmitting(true);
    const { data } = await supabase.from("presets").insert({ name: formData.name, type: formData.type || "Resposta rápida", content: formData.content || null }).select().single();
    if (data) setPresets((prev) => [...prev, data]);
    setSubmitting(false);
    closeModal();
  };

  const handleDeletePreset = async (id: string) => {
    await supabase.from("presets").delete().eq("id", id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar menu */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-card/50 p-4 space-y-6 overflow-y-auto">
        {menuSections.map((sec) => (
          <div key={sec.title}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{sec.title}</p>
            <div className="space-y-0.5">
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors",
                    section === item.id ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">

        {/* ═══════ GERAL ═══════ */}
        {section === "general" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Geral</h2>
                <p className="text-sm text-muted-foreground">Dados gerais da sua conta</p>
              </div>
            </div>
            <div className="surface-elevated p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome da empresa</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: RebucciAI" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email de contato</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contato@empresa.com" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</label>
                <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+55 42 99999-0000" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuso horário</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls}>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                  <option value="America/Manaus">America/Manaus (UTC-4)</option>
                  <option value="America/Belem">America/Belem (UTC-3)</option>
                  <option value="America/Fortaleza">America/Fortaleza (UTC-3)</option>
                  <option value="America/Recife">America/Recife (UTC-3)</option>
                  <option value="America/Cuiaba">America/Cuiaba (UTC-4)</option>
                  <option value="America/Porto_Velho">America/Porto_Velho (UTC-4)</option>
                  <option value="America/Boa_Vista">America/Boa_Vista (UTC-4)</option>
                  <option value="America/Rio_Branco">America/Rio_Branco (UTC-5)</option>
                </select>
              </div>
              {generalMsg && (
                <p className={cn("text-xs", generalMsg.ok ? "text-emerald-500" : "text-destructive")}>{generalMsg.text}</p>
              )}
              <button onClick={handleSaveGeneral} disabled={savingGeneral}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {savingGeneral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar alterações
              </button>
            </div>
          </div>
        )}

        {/* ═══════ META API ═══════ */}
        {section === "meta" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Facebook className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Meta API</h2>
                <p className="text-sm text-muted-foreground">Integração com WhatsApp Business via Meta Cloud API</p>
              </div>
            </div>
            <div className="surface-elevated p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Token de acesso permanente</label>
                <div className="relative">
                  <input type="password" placeholder="EAAxxxxxxxxxxxxxxx" className={inputCls} />
                </div>
                <p className="text-[11px] text-muted-foreground">Token gerado no painel Meta for Developers → seu app → WhatsApp → API Setup</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number ID</label>
                <input placeholder="123456789012345" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp Business Account ID (WABA)</label>
                <input placeholder="123456789012345" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Versão da API</label>
                <select className={inputCls}>
                  <option value="v21.0">v21.0 (recomendada)</option>
                  <option value="v20.0">v20.0</option>
                  <option value="v19.0">v19.0</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  <Save className="w-4 h-4" /> Salvar
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  <Zap className="w-4 h-4" /> Testar conexão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TOKENS ═══════ */}
        {section === "tokens" && <TokensSection />}

        {/* ═══════ PROPRIEDADES ═══════ */}
        {section === "properties" && <PropertiesSection />}

        {/* ═══════ PRIME ═══════ */}
        {section === "prime" && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Prime</h2>
                <p className="text-sm text-muted-foreground">Gerencie os endpoints da sua API para integração</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setPrimeModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Novo endpoint
              </button>
            </div>

            {primeLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}

            {!primeLoading && primeEndpoints.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">Nenhum endpoint cadastrado</div>
            )}

            {!primeLoading && primeEndpoints.length > 0 && (
              <div className="space-y-3">
                {primeEndpoints.map((ep) => (
                  <div key={ep.id} className="surface-elevated p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded font-mono",
                            ep.method === "GET" ? "bg-emerald-500/20 text-emerald-500" :
                            ep.method === "POST" ? "bg-blue-500/20 text-blue-500" :
                            ep.method === "PUT" ? "bg-yellow-500/20 text-yellow-500" :
                            "bg-destructive/20 text-destructive"
                          )}>{ep.method}</span>
                          <p className="text-sm font-semibold text-foreground">{ep.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{ep.url}</p>
                        {ep.description && <p className="text-xs text-muted-foreground mt-1">{ep.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleTestPrimeEndpoint(ep)} disabled={primeTesting === ep.id}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40" title="Testar">
                          {primeTesting === ep.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDeletePrimeEndpoint(ep.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {primeTestResult[ep.id] && (
                      <p className={cn("text-xs px-2 py-1 rounded-lg", primeTestResult[ep.id].ok ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive")}>
                        {primeTestResult[ep.id].msg}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal novo endpoint */}
            {primeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPrimeModal(false)}>
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Novo endpoint</h3>
                    <button onClick={() => setPrimeModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Nome *</label>
                      <input value={primeForm.name} onChange={(e) => setPrimeForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Criar Lead" className={inputCls} />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1 w-28 shrink-0">
                        <label className="text-xs text-muted-foreground">Método</label>
                        <select value={primeForm.method} onChange={(e) => setPrimeForm((f) => ({ ...f, method: e.target.value }))} className={inputCls}>
                          {["GET","POST","PUT","PATCH","DELETE"].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <label className="text-xs text-muted-foreground">URL *</label>
                        <input value={primeForm.url} onChange={(e) => setPrimeForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://api.exemplo.com/v1/..." className={inputCls} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Descrição</label>
                      <input value={primeForm.description} onChange={(e) => setPrimeForm((f) => ({ ...f, description: e.target.value }))} placeholder="Para que serve este endpoint?" className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Token de autenticação (Bearer)</label>
                      <input type="password" value={primeForm.auth_token} onChange={(e) => setPrimeForm((f) => ({ ...f, auth_token: e.target.value }))} placeholder="sk-..." className={inputCls} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setPrimeModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
                    <button onClick={handleSavePrimeEndpoint} disabled={primeSaving || !primeForm.name || !primeForm.url}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">
                      {primeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ PIPELINES ═══════ */}
        {section === "pipelines" && <PipelinesSection />}

        {/* ═══════ EVOLUTION API ═══════ */}
        {section === "evolution" && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">EvolutionAPI</h1>
                <p className="text-sm text-muted-foreground">Conecte sua instância da EvolutionAPI para enviar e receber mensagens via WhatsApp diretamente do CRM.</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {([{ id: "config" as const, label: "Configuração" }, { id: "instances" as const, label: "Instâncias" }, { id: "rag" as const, label: "RAG / Histórico" }]).map((t) => (
                <button key={t.id} onClick={() => setEvoTab(t.id)}
                  className={cn("px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
                    evoTab === t.id ? "text-primary border-primary font-medium" : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >{t.label}</button>
              ))}
            </div>

            {/* ── Config ── */}
            {evoTab === "config" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="surface-elevated p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Configuração da API</h2>
                    {isConfigured && <span className="text-xs px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-500 font-medium">Configurado</span>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">URL da API *</label>
                    <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://evolutionapi.seudominio.com.br" className={inputCls} />
                    <p className="text-xs text-muted-foreground mt-1">URL base da sua instância (sem barra final)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">API Token (apikey) *</label>
                    <div className="relative">
                      <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={cn(inputCls, "pr-10")} />
                      <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Encontre em: Configurações da EvolutionAPI → Global API Key</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleSaveConfig} disabled={saving || !apiUrl || !apiKey}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar credenciais
                    </button>
                    <button onClick={handleTestConnection} disabled={testing || !apiUrl || !apiKey}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Testar conexão
                    </button>
                  </div>
                  {testResult && <p className={cn("text-sm", testResult.ok ? "text-emerald-500" : "text-destructive")}>{testResult.msg}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[{ icon: MessageSquare, label: "WhatsApp", desc: "Envie mensagens pelo CRM" }, { icon: Wifi, label: "Webhooks", desc: "Receba mensagens em tempo real" }, { icon: Brain, label: "RAG / IA", desc: "Gere base de conhecimento" }].map((card) => (
                    <div key={card.label} className="surface-elevated p-5 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-primary/30 transition-colors">
                      <card.icon className="w-6 h-6 text-primary" />
                      <p className="text-sm font-medium text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Instances ── */}
            {evoTab === "instances" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Instâncias WhatsApp</h2>
                  <button onClick={loadInstances} disabled={loadingInstances}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                    {loadingInstances ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
                  </button>
                </div>

                {!isConfigured && (
                  <p className="text-sm text-muted-foreground">Configure as credenciais na aba "Configuração" primeiro.</p>
                )}

                {instances.map((inst) => {
                  const name = inst.instance.instanceName;
                  const isOnline = inst.instance.status === "open";
                  const webhookUrl = webhooks[name] ?? "";
                  return (
                    <div key={name} className="surface-elevated p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {editingName === name ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveDisplayName(name); if (e.key === "Escape") setEditingName(null); }}
                                    className="text-sm font-semibold bg-secondary border border-primary rounded-lg px-2 py-0.5 text-foreground outline-none w-40"
                                    placeholder={name}
                                  />
                                  <button onClick={() => saveDisplayName(name)} className="text-emerald-500 hover:text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingName(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-foreground">{displayNames[name] || name}</span>
                                  <button
                                    onClick={() => { setEditingName(name); setEditNameValue(displayNames[name] || ""); }}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    title="Editar nome da caixa de entrada"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", isOnline ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground")}>
                                {isOnline ? "Conectado" : "Desconectado"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">WHATSAPP-BAILEYS</span>
                            </div>
                            {inst.instance.owner && (
                              <p className="text-xs text-muted-foreground">
                                {inst.instance.owner.replace(/@s\.whatsapp\.net|@g\.us/g, "")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-center">
                          {inst.contacts != null && <div><p className="text-sm font-bold text-foreground">{inst.contacts.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">contatos</p></div>}
                          {inst.messages != null && <div><p className="text-sm font-bold text-foreground">{inst.messages.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">msgs</p></div>}
                          {inst.chats != null && <div><p className="text-sm font-bold text-foreground">{inst.chats}</p><p className="text-[10px] text-muted-foreground">chats</p></div>}
                          <div className={cn("flex items-center gap-2", isOnline ? "text-emerald-500" : "text-muted-foreground")}>
                            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-muted-foreground")} />
                            <span className="text-xs font-medium">{isOnline ? "Online" : "Offline"}</span>
                            {!isOnline && (
                              <button
                                onClick={() => handleConnect(name)}
                                disabled={connectingInstance === name}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                              >
                                {connectingInstance === name
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Zap className="w-3 h-3" />}
                                Reconectar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Webhook imutável */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Link2 className="w-3 h-3" /> WEBHOOK CALLBACK
                        </p>
                        <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-2">
                          <p className="text-xs text-muted-foreground">URL de callback para Evolution API enviar mensagens inbound:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-foreground truncate bg-secondary px-3 py-2 rounded-lg border border-border">
                              {webhookUrl || "Gerando URL..."}
                            </code>
                            <button onClick={() => copyWebhook(name)}
                              className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                              {copiedWebhook === name ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedWebhook === name ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">✓ Cole esta URL em: Evolution Dashboard → Webhooks → adicionar novo webhook</p>
                          <p className="text-[10px] text-amber-500/80">⚠ Esta URL é permanente e não será alterada.</p>
                        </div>
                      </div>

                      {/* Pairing code */}
                      {pairingCodes[name] && (
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                          <p className="text-xs font-semibold text-primary">Código de emparelhamento</p>
                          <p className="text-sm font-mono font-bold text-foreground tracking-widest">{pairingCodes[name]}</p>
                          <p className="text-[10px] text-muted-foreground">No WhatsApp: Dispositivos conectados → Conectar com número de telefone</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {instances.length === 0 && isConfigured && !loadingInstances && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma instância encontrada. Clique em "Atualizar".</p>
                )}
              </motion.div>
            )}

            {/* ── RAG ── */}
            {evoTab === "rag" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="surface-elevated p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Base de Conhecimento (RAG)</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Processa o histórico de conversas do WhatsApp, divide em chunks estruturados e salva no banco para uso por IAs.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>📥 Busca chats</span><span>💬 Amostra mensagens</span><span>✂️ Divide em chunks</span><span>💾 Salva no banco</span>
                  </div>
                </div>

                <div className="surface-elevated p-6 space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Gerar RAG</h3>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Instância</label>
                    <select value={ragInstance} onChange={(e) => setRagInstance(e.target.value)} className={inputCls}>
                      <option value="">Selecione uma instância</option>
                      {instances.map((i) => (
                        <option key={i.instance.instanceName} value={i.instance.instanceName}>
                          {i.instance.instanceName} {i.instance.status === "open" ? "🟢" : "🔴"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Limite de mensagens
                      <span className="text-xs text-muted-foreground ml-2">(distribuído entre as conversas)</span>
                    </label>
                    <input
                      type="number"
                      value={ragMessageLimit}
                      onChange={(e) => setRagMessageLimit(Math.max(1, parseInt(e.target.value) || 1))}
                      min={100}
                      max={1000000}
                      step={1000}
                      className={inputCls}
                      placeholder="Ex: 10000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Suporta até 1.000.000 mensagens. Cada chunk contém ~50 mensagens.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Frequência</label>
                    <div className="flex gap-3">
                      {(["once", "daily"] as const).map((f) => (
                        <button key={f} onClick={() => setRagFreq(f)}
                          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                            ragFreq === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
                          )}>
                          {f === "once" ? "⚡ Gerar uma vez" : "📅 Gerar diariamente"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleGenerateRag} disabled={ragLoading || !ragInstance}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                      {ragLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "▶"} Gerar RAG
                    </button>
                    {ragLoading && (
                      <button onClick={() => { ragCancelRef.current = true; }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">
                        <X className="w-4 h-4" /> Cancelar
                      </button>
                    )}
                  </div>
                  {ragStatus && <p className="text-sm text-foreground">{ragStatus}</p>}
                </div>

                {/* Jobs histórico */}
                {ragJobs.length > 0 && (
                  <div className="surface-elevated p-6 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Histórico de gerações</h3>
                    <div className="space-y-2">
                      {ragJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border text-sm">
                          <div>
                            <p className="font-medium text-foreground">{job.instance_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.total_messages?.toLocaleString() ?? "—"} msgs • {job.total_chunks ?? "—"} chunks
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className={cn("text-xs px-2 py-1 rounded-full font-medium",
                                job.status === "done" ? "bg-emerald-500/20 text-emerald-500" :
                                  job.status === "cancelled" ? "bg-yellow-500/20 text-yellow-500" :
                                    job.status === "error" ? "bg-destructive/20 text-destructive" :
                                      "bg-primary/20 text-primary"
                              )}>{job.status}</span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(job.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            {job.status === "processing" && (
                              <button
                                onClick={() => handleCancelJob(job.id)}
                                title="Pausar processamento"
                                className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-yellow-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              title="Excluir job e chunks"
                              className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Upload CSV ── */}
                <div className="surface-elevated p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Upload de Base de Conhecimento (CSV)</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de um CSV com FAQs, scripts, produtos ou qualquer conteúdo. Cada linha vira um dado no RAG da instância.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>📄 CSV (vírgula, ponto-vírgula ou tab)</span><span>🔤 UTF-8</span><span>📦 50 linhas por chunk</span>
                  </div>
                </div>

                <div className="surface-elevated p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Instância de destino</label>
                    <select value={csvInstance} onChange={(e) => setCsvInstance(e.target.value)} className={inputCls}>
                      <option value="">Selecione uma instância</option>
                      {instances.map((i) => (
                        <option key={i.instance.instanceName} value={i.instance.instanceName}>
                          {i.instance.instanceName} {i.instance.status === "open" ? "🟢" : "🔴"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Arquivo CSV</label>
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      onClick={() => csvInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
                    >
                      <input ref={csvInputRef} type="file" accept=".csv,.txt" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
                      {csvFile ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">📄 {csvFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Arraste um CSV aqui ou clique para selecionar</p>
                          <p className="text-xs text-muted-foreground">Separadores suportados: vírgula, ponto-vírgula, tab</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {csvPreview.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Pré-visualização (primeiras 5 linhas)</p>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="text-xs w-full">
                          <thead>
                            <tr className="border-b border-border bg-secondary/50">
                              {csvPreview[0]?.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium text-foreground">{h || `Coluna ${i + 1}`}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.slice(1).map((row, ri) => (
                              <tr key={ri} className="border-b border-border last:border-0">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button onClick={handleProcessCsv} disabled={csvLoading || !csvFile || !csvInstance}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {csvLoading ? "Processando CSV…" : "Processar e Salvar no RAG"}
                  </button>
                  {csvStatus && <p className="text-sm text-foreground">{csvStatus}</p>}
                </div>

                {/* ── Vectorstore ── */}
                <div className="surface-elevated p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Vectorstore (Busca Semântica)</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gera embeddings dos chunks via OpenAI e habilita busca por similaridade semântica. Um vectorstore por instância.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>🔑 Token OpenAI</span><span>🧮 text-embedding-3-small</span><span>📐 1536 dimensões</span><span>🔍 HNSW cosine</span>
                  </div>
                </div>

                <div className="surface-elevated p-6 space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Gerar Embeddings</h3>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Instância</label>
                    <select value={vsInstance} onChange={(e) => setVsInstance(e.target.value)} className={inputCls}>
                      <option value="">Selecione uma instância</option>
                      {instances.map((i) => (
                        <option key={i.instance.instanceName} value={i.instance.instanceName}>
                          {i.instance.instanceName} {i.instance.status === "open" ? "🟢" : "🔴"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateEmbeddings}
                    disabled={vsLoading || !vsInstance}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {vsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {vsLoading ? "Gerando embeddings…" : "Gerar Embeddings"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Processa apenas chunks sem embedding. Pode ser executado novamente para novos chunks.
                  </p>
                </div>

                {/* Status por instância */}
                {vsStatuses.length > 0 && (
                  <div className="surface-elevated p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Status por instância</h3>
                      <button onClick={loadVsStatus} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Atualizar
                      </button>
                    </div>
                    <div className="space-y-3">
                      {vsStatuses.map((vs) => {
                        const pct = vs.total_chunks > 0 ? Math.round((vs.embedded / vs.total_chunks) * 100) : 0;
                        return (
                          <div key={vs.instance_name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">{vs.instance_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{vs.embedded.toLocaleString()} / {vs.total_chunks.toLocaleString()} chunks</span>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                                  vs.status === "done" ? "bg-emerald-500/20 text-emerald-500" :
                                  vs.status === "processing" ? "bg-primary/20 text-primary" :
                                  vs.status === "error" ? "bg-destructive/20 text-destructive" :
                                  "bg-secondary text-muted-foreground"
                                )}>{vs.status === "done" ? "✓ Pronto" : vs.status === "processing" ? "⚙ Processando" : vs.status === "error" ? "✗ Erro" : "idle"}</span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", vs.status === "done" ? "bg-emerald-500" : vs.status === "error" ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
                            </div>
                            {vs.error_message && <p className="text-xs text-destructive">{vs.error_message}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* ═══════ USERS ═══════ */}
        {section === "users" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Usuários e equipes</h1>
              <p className="text-sm text-muted-foreground mt-1">Crie novos usuários, personalize as permissões e remova usuários da conta.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {([
                { key: "users" as const, label: "Usuários" },
                { key: "teams" as const, label: "Equipes" },
              ]).map((t) => (
                <button key={t.key} onClick={() => setUserTab(t.key)}
                  className={cn("px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap",
                    userTab === t.key ? "text-foreground border-foreground font-medium" : "text-muted-foreground border-transparent hover:text-foreground"
                  )}>{t.label}</button>
              ))}
            </div>

            {usersLoading && (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            )}

            {/* ── Usuários ── */}
            {!usersLoading && userTab === "users" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-6">
                  {[[crmUsers.length.toString(), "Usuários"], [crmUsers.filter(u => u.status === "active").length.toString(), "Ativos"], [crmUsers.filter(u => u.status === "inactive").length.toString(), "Inativos"]].map(([n, l]) => (
                    <div key={l}><p className="text-2xl font-bold text-foreground">{n}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</p></div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Pesquisar nome ou e-mail" className={cn(inputCls, "pl-9")} />
                  </div>
                  <button onClick={() => openModal("user")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" /> Criar usuário
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        {["Nome", "Cargo", "Conjunto de permissão", "Equipe", "Status", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {crmUsers.filter((u) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map((u) => {
                        const team = teams.find(t => t.id === u.team_id);
                        const perm = permSets.find(p => p.id === u.permission_set_id);
                        const initials = u.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                        return (
                          <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{initials}</div>
                                <div><p className="text-sm font-medium text-primary">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">{u.role}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{perm?.name ?? "--"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{team?.name ?? "--"}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleToggleUserStatus(u)} className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity">
                                <span className={cn("w-2 h-2 rounded-full", u.status === "active" ? "bg-emerald-500" : "bg-muted-foreground")} />
                                <span className="text-foreground">{u.status === "active" ? "Ativo" : "Inativo"}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleDeleteUser(u.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {crmUsers.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}


            {/* ── Equipes ── */}
            {!usersLoading && userTab === "teams" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => openModal("team")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" /> Nova equipe
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        {["Nome", "Descrição", "Membros", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t) => {
                        const members = crmUsers.filter(u => u.team_id === t.id).length;
                        return (
                          <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.description ?? "--"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{members}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleDeleteTeam(t.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {teams.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma equipe criada</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}


            {/* ── Modal de criação ── */}
            {modalType && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closeModal}>
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">
                      {modalType === "user" && "Criar usuário"}
                      {modalType === "team" && "Nova equipe"}
                      {modalType === "perm" && "Novo conjunto de permissão"}
                      {modalType === "preset" && "Nova pré-definição"}
                    </h2>
                    <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>

                  {/* Campos: Usuário */}
                  {modalType === "user" && (
                    <div className="space-y-3">
                      <input placeholder="Nome completo *" value={formData.name ?? ""} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
                      <input placeholder="E-mail *" type="email" value={formData.email ?? ""} onChange={(e) => setField("email", e.target.value)} className={inputCls} />
                      <div className="relative">
                        <select value={formData.role ?? "Agente"} onChange={(e) => setField("role", e.target.value)} className={cn(inputCls, "appearance-none")}>
                          {["Admin", "Supervisor", "Agente"].map(r => <option key={r}>{r}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <div className="relative">
                        <select value={formData.team_id ?? ""} onChange={(e) => setField("team_id", e.target.value)} className={cn(inputCls, "appearance-none")}>
                          <option value="">Equipe (opcional)</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <div className="relative">
                        <select value={formData.permission_set_id ?? ""} onChange={(e) => setField("permission_set_id", e.target.value)} className={cn(inputCls, "appearance-none")}>
                          <option value="">Conjunto de permissão (opcional)</option>
                          {permSets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Campos: Equipe */}
                  {modalType === "team" && (
                    <div className="space-y-3">
                      <input placeholder="Nome da equipe *" value={formData.name ?? ""} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
                      <input placeholder="Descrição (opcional)" value={formData.description ?? ""} onChange={(e) => setField("description", e.target.value)} className={inputCls} />
                    </div>
                  )}

                  {/* Campos: Permissão */}
                  {modalType === "perm" && (
                    <div className="space-y-3">
                      <input placeholder="Nome do conjunto *" value={formData.name ?? ""} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
                      <input placeholder="Descrição (opcional)" value={formData.description ?? ""} onChange={(e) => setField("description", e.target.value)} className={inputCls} />
                    </div>
                  )}

                  {/* Campos: Preset */}
                  {modalType === "preset" && (
                    <div className="space-y-3">
                      <input placeholder="Nome *" value={formData.name ?? ""} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
                      <div className="relative">
                        <select value={formData.type ?? "Resposta rápida"} onChange={(e) => setField("type", e.target.value)} className={cn(inputCls, "appearance-none")}>
                          {["Resposta rápida", "Tag", "Nota", "Assinatura"].map(t => <option key={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <textarea placeholder="Conteúdo (opcional)" value={formData.content ?? ""} onChange={(e) => setField("content", e.target.value)} rows={3} className={cn(inputCls, "resize-none")} />
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
                    <button
                      disabled={submitting || !formData.name}
                      onClick={modalType === "user" ? handleCreateUser : modalType === "team" ? handleCreateTeam : modalType === "perm" ? handleCreatePerm : handleCreatePreset}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
