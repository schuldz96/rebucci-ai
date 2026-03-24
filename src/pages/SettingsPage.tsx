import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Wifi, Brain, Save, Zap, RefreshCw,
  Eye, EyeOff, Search, Users, Link2, Copy, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { evolutionApi, type EvoInstance } from "@/lib/evolutionApi";

const SUPABASE_URL = "https://urrbpxrtdzurfdsucukb.supabase.co";
const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type SettingsSection = "evolution" | "users";
type EvoTab = "config" | "instances" | "rag";

const mockUsers = [
  { id: "u-1", name: "Marcos Schuldz", email: "marcos.schuldz@gmail.com", role: "Admin", permissionSet: "--", team: "--", status: "Ativo" },
];

const menuSections = [
  { title: "Integrações", items: [{ id: "evolution" as const, label: "EvolutionAPI", icon: Link2 }] },
  { title: "Gerenciamento de conta", items: [{ id: "users" as const, label: "Usuários e equipes", icon: Users }] },
];

const SettingsPage = () => {
  const [section, setSection] = useState<SettingsSection>("evolution");
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

  // RAG state
  const [ragInstance, setRagInstance] = useState("");
  const [ragMessageLimit, setRagMessageLimit] = useState(10000);
  const [ragFreq, setRagFreq] = useState<"once" | "daily">("once");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragStatus, setRagStatus] = useState<string | null>(null);
  const [ragJobs, setRagJobs] = useState<{ id: string; instance_name: string; status: string; total_messages: number | null; total_chunks: number | null; created_at: string }[]>([]);

  // Users state
  const [userSearch, setUserSearch] = useState("");

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

  useEffect(() => {
    if (evoTab === "rag") loadRagJobs();
  }, [evoTab, loadRagJobs]);

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

      // Garantir webhook imutável para cada instância
      const newWebhooks: Record<string, string> = {};
      for (const inst of raw) {
        const name = inst.instance.instanceName;
        const { data: existing } = await supabase.from("instance_webhooks").select("webhook_token").eq("instance_name", name).single();
        if (existing) {
          newWebhooks[name] = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${existing.webhook_token}`;
        } else {
          const { data: created } = await supabase.from("instance_webhooks").insert({ instance_name: name }).select("webhook_token").single();
          if (created) newWebhooks[name] = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?token=${created.webhook_token}`;
        }
      }
      setWebhooks(newWebhooks);
    } catch {
      /* silencioso */
    }
    setLoadingInstances(false);
  };

  useEffect(() => {
    if (evoTab === "instances" && isConfigured && instances.length === 0) loadInstances();
  }, [evoTab, isConfigured]);

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
                              <span className="text-sm font-semibold text-foreground">{name}</span>
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", isOnline ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground")}>
                                {isOnline ? "Conectado" : "Desconectado"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">WHATSAPP-BAILEYS</span>
                            </div>
                            {inst.instance.owner && <p className="text-xs text-muted-foreground">{inst.instance.owner}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-center">
                          {inst.contacts != null && <div><p className="text-sm font-bold text-foreground">{inst.contacts.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">contatos</p></div>}
                          {inst.messages != null && <div><p className="text-sm font-bold text-foreground">{inst.messages.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">msgs</p></div>}
                          {inst.chats != null && <div><p className="text-sm font-bold text-foreground">{inst.chats}</p><p className="text-[10px] text-muted-foreground">chats</p></div>}
                          <div className={cn("flex items-center gap-1.5", isOnline ? "text-emerald-500" : "text-muted-foreground")}>
                            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-muted-foreground")} />
                            <span className="text-xs font-medium">{isOnline ? "Online" : "Offline"}</span>
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
            <div className="flex gap-1 border-b border-border">
              {["Usuários", "Licenças", "Equipes", "Conjuntos de permissões", "Pré-definições"].map((t, i) => (
                <button key={t} className={cn("px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px", i === 0 ? "text-foreground border-foreground font-medium" : "text-muted-foreground border-transparent hover:text-foreground")}>{t}</button>
              ))}
            </div>
            <div className="flex items-center gap-6">
              {[["1", "Usuários"], ["1", "Ativos"], ["0", "Inativos"]].map(([n, l]) => (
                <div key={l}><p className="text-2xl font-bold text-foreground">{n}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</p></div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Pesquisar nome ou e-mail" className={cn(inputCls, "pl-9 max-w-xs")} />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">Criar usuário</button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["Nome", "Cargo", "Conjunto de permissão", "Equipe", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">MA</div>
                          <div><p className="text-sm font-medium text-primary">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{u.role}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.permissionSet}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.team}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-foreground">{u.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
