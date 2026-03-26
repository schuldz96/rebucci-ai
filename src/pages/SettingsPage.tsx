import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Wifi, Brain, Save, Zap, RefreshCw,
  Eye, EyeOff, Search, Users, Link2, Copy, Check, Loader2, Pencil, X,
  Plus, Trash2, Shield, Tag, ChevronDown, Building2, Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { evolutionApi, type EvoInstance } from "@/lib/evolutionApi";

const SUPABASE_URL = "https://urrbpxrtdzurfdsucukb.supabase.co";
const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type SettingsSection = "general" | "users" | "evolution" | "meta";
type EvoTab = "config" | "instances" | "rag";
type UserTab = "users" | "licenses" | "teams" | "permissions" | "presets";
type ModalType = null | "user" | "team" | "perm" | "preset";

interface CrmUser { id: string; name: string; email: string; role: string; team_id: string | null; permission_set_id: string | null; status: "active" | "inactive"; created_at: string; }
interface Team { id: string; name: string; description: string | null; }
interface PermissionSet { id: string; name: string; description: string | null; }
interface Preset { id: string; name: string; type: string; content: string | null; }

const menuSections = [
  { title: "Geral", items: [{ id: "general" as const, label: "Informações básicas", icon: Building2 }] },
  { title: "Gerenciamento de conta", items: [{ id: "users" as const, label: "Usuários", icon: Users }] },
  { title: "Integrações", items: [
    { id: "evolution" as const, label: "EvolutionAPI", icon: Link2 },
    { id: "meta" as const, label: "Meta API", icon: Facebook },
  ]},
];

const SettingsPage = () => {
  const [section, setSection] = useState<SettingsSection>("general");
  const [evoTab, setEvoTab] = useState<EvoTab>("config");

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

  // Load RAG jobs
  const loadRagJobs = useCallback(async () => {
    const { data } = await supabase.from("rag_jobs").select("*").order("created_at", { ascending: false }).limit(10);
    if (data) setRagJobs(data);
  }, []);

  // Carregar instâncias ao mudar para aba que precisar delas
  useEffect(() => {
    if ((evoTab === "instances" || evoTab === "rag") && isConfigured && instances.length === 0) {
      loadInstances();
    }
    if (evoTab === "rag") loadRagJobs();
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

      setRagStatus("Buscando conversas...");
      const chats = await evolutionApi.fetchChats(ragInstance);
      const activeChats = chats.slice(0, 200); // máx 200 chats

      const msgsPerChat = Math.max(10, Math.floor(ragMessageLimit / Math.max(activeChats.length, 1)));
      let totalMessages = 0;
      let totalChunks = 0;
      const CHUNK_SIZE = 50; // mensagens por chunk

      setRagStatus(`Processando ${activeChats.length} conversas...`);

      for (const chat of activeChats) {
        const msgs = await evolutionApi.fetchMessages(ragInstance, chat.remoteJid, msgsPerChat);
        if (msgs.length === 0) continue;

        // Dividir em chunks de CHUNK_SIZE mensagens
        for (let i = 0; i < msgs.length; i += CHUNK_SIZE) {
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
            contact_name: chat.pushName ?? chat.name ?? chat.remoteJid.split("@")[0],
            content,
            message_count: slice.length,
            chunk_index: Math.floor(i / CHUNK_SIZE),
          });
          totalChunks++;
        }
        totalMessages += msgs.length;
      }

      await supabase.from("rag_jobs").update({
        status: "done",
        total_messages: totalMessages,
        total_chunks: totalChunks,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);

      setRagStatus(`✅ Concluído! ${totalMessages.toLocaleString()} mensagens → ${totalChunks} chunks`);
      loadRagJobs();
    } catch (err) {
      setRagStatus(`❌ Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
    setRagLoading(false);
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
                <h2 className="text-xl font-bold text-foreground">Informações básicas</h2>
                <p className="text-sm text-muted-foreground">Dados gerais da sua conta</p>
              </div>
            </div>
            <div className="surface-elevated p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome da empresa</label>
                <input placeholder="Ex: RebucciAI" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email de contato</label>
                <input type="email" placeholder="contato@empresa.com" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</label>
                <input placeholder="+55 42 99999-0000" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuso horário</label>
                <select className={inputCls}>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                  <option value="America/Manaus">America/Manaus (UTC-4)</option>
                  <option value="America/Belem">America/Belem (UTC-3)</option>
                </select>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                <Save className="w-4 h-4" /> Salvar alterações
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
                  <button onClick={handleGenerateRag} disabled={ragLoading || !ragInstance}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {ragLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "▶"} Gerar RAG
                  </button>
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
                          <div className="text-right">
                            <span className={cn("text-xs px-2 py-1 rounded-full font-medium",
                              job.status === "done" ? "bg-emerald-500/20 text-emerald-500" :
                                job.status === "error" ? "bg-destructive/20 text-destructive" :
                                  "bg-primary/20 text-primary"
                            )}>{job.status}</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(job.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
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
                { key: "licenses" as const, label: "Licenças" },
                { key: "teams" as const, label: "Equipes" },
                { key: "permissions" as const, label: "Conjuntos de permissões" },
                { key: "presets" as const, label: "Pré-definições" },
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

            {/* ── Licenças ── */}
            {!usersLoading && userTab === "licenses" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="surface-elevated p-6 rounded-xl border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Plano Pro</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Licença ativa — acesso completo ao CRM e integrações</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-medium">Ativa</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div><p className="text-2xl font-bold text-foreground">{crmUsers.length}</p><p className="text-xs text-muted-foreground">Usuários ativos</p></div>
                    <div><p className="text-2xl font-bold text-foreground">Ilimitado</p><p className="text-xs text-muted-foreground">Conversas</p></div>
                    <div><p className="text-2xl font-bold text-foreground">∞</p><p className="text-xs text-muted-foreground">Instâncias WhatsApp</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 shrink-0 text-primary" />
                    <span>Para alterar o plano ou adicionar licenças, entre em contato com o suporte.</span>
                  </div>
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

            {/* ── Conjuntos de permissões ── */}
            {!usersLoading && userTab === "permissions" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => openModal("perm")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" /> Novo conjunto
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        {["Nome", "Descrição", "Usuários", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permSets.map((p) => {
                        const users = crmUsers.filter(u => u.permission_set_id === p.id).length;
                        return (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />{p.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.description ?? "--"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{users}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleDeletePerm(p.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {permSets.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum conjunto de permissão criado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Pré-definições ── */}
            {!usersLoading && userTab === "presets" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => openModal("preset")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" /> Nova pré-definição
                  </button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        {["Nome", "Tipo", "Conteúdo", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {presets.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />{p.name}</td>
                          <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{p.type}</span></td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{p.content ?? "--"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDeletePreset(p.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {presets.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma pré-definição criada</td></tr>
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
