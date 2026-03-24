import { useState } from "react";
import { mockInstances } from "@/data/mockData";
import { motion } from "framer-motion";
import { MessageSquare, Wifi, Brain, Save, Zap, RefreshCw, Eye, EyeOff, Search, Users, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

type SettingsSection = "evolution" | "users";
type EvoTab = "config" | "instances" | "rag";

/* ── Sidebar menu items ── */
const menuSections = [
  {
    title: "Integrações",
    items: [
      { id: "evolution" as const, label: "EvolutionAPI", icon: Link2 },
    ],
  },
  {
    title: "Gerenciamento de conta",
    items: [
      { id: "users" as const, label: "Usuários e equipes", icon: Users },
    ],
  },
];

/* ── Mock data for instances tab ── */
const mockInstancesDetailed = [
  { id: "inst-1", name: "Rafa", owner: "Rafa", phone: "+55 (48) 9603-8324", provider: "WHATSAPP-BAILEYS", status: "online" as const, contacts: 156, msgs: 33162, chats: 71, webhookUrl: "https://qdiqkdmkfzhfkpczrkzc.supabase.co/functions/v1/whatsapp-w..." },
  { id: "inst-2", name: "Dados", owner: "Marcos Schuldz", phone: "+55 (48) 9685-1955", provider: "WHATSAPP-BAILEYS", status: "online" as const, contacts: 370, msgs: 21930, chats: 54, webhookUrl: "https://qdiqkdmkfzhfkpczrkzc.supabase.co/functions/v1/whatsapp-w..." },
];

/* ── Mock users ── */
const mockUsers = [
  { id: "u-1", name: "Marcos Schuldz", email: "marcos.schuldz@gmail.com", role: "Admin", permissionSet: "--", team: "--", status: "Ativo" },
];

const SettingsPage = () => {
  const [section, setSection] = useState<SettingsSection>("evolution");
  const [evoTab, setEvoTab] = useState<EvoTab>("config");
  const [apiUrl, setApiUrl] = useState("https://evolutionapi.fluxosautomatizados.com.br");
  const [apiKey, setApiKey] = useState("sk-evo-mock-key-12345678");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [ragInstance, setRagInstance] = useState("");
  const [ragFreq, setRagFreq] = useState<"once" | "daily">("once");
  const [userSearch, setUserSearch] = useState("");

  const handleTestConnection = async () => {
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 1000));
    setTestResult(apiUrl ? "Conexão estabelecida com sucesso! ✅" : "Preencha a URL da API");
  };

  return (
    <div className="flex h-screen">
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
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors",
                    section === item.id
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
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
            {/* Header */}
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
              {([
                { id: "config" as const, label: "Configuração" },
                { id: "instances" as const, label: "Instâncias" },
                { id: "rag" as const, label: "RAG / Histórico" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEvoTab(t.id)}
                  className={cn(
                    "px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
                    evoTab === t.id
                      ? "text-primary border-primary font-medium"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Config tab ── */}
            {evoTab === "config" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="surface-elevated p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Configuração da API</h2>
                    <span className="text-xs px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-500 font-medium">Configurado</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">URL da API *</label>
                    <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.evolution.com" className={inputCls} />
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
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                      <Save className="w-4 h-4" /> Salvar credenciais
                    </button>
                    <button onClick={handleTestConnection} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                      <Zap className="w-4 h-4" /> Testar conexão
                    </button>
                  </div>
                  {testResult && <p className="text-sm text-foreground">{testResult}</p>}
                </div>

                {/* Quick access cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: MessageSquare, label: "WhatsApp", desc: "Envie mensagens pelo CRM" },
                    { icon: Wifi, label: "Webhooks", desc: "Receba mensagens em tempo real" },
                    { icon: Brain, label: "RAG / IA", desc: "Gere base de conhecimento" },
                  ].map((card) => (
                    <div key={card.label} className="surface-elevated p-5 flex flex-col items-center text-center gap-2 hover:border-primary/30 transition-colors cursor-pointer">
                      <card.icon className="w-6 h-6 text-primary" />
                      <p className="text-sm font-medium text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Instances tab ── */}
            {evoTab === "instances" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Instâncias WhatsApp</h2>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                    <RefreshCw className="w-4 h-4" /> Atualizar
                  </button>
                </div>

                {mockInstancesDetailed.map((inst) => (
                  <div key={inst.id} className="surface-elevated p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                          {inst.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{inst.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">Conectado</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{inst.provider}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{inst.owner}</p>
                          <p className="text-xs text-muted-foreground">{inst.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-sm font-bold text-foreground">{inst.contacts.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">contatos</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{inst.msgs.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">msgs</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{inst.chats}</p>
                          <p className="text-[10px] text-muted-foreground">chats</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-medium">Online</span>
                        </div>
                      </div>
                    </div>

                    {/* Webhook callback */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Link2 className="w-3 h-3" /> WEBHOOK CALLBACK
                      </p>
                      <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-2">
                        <p className="text-xs text-muted-foreground">URL de callback para Evolution API enviar mensagens inbound:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-foreground truncate bg-secondary px-3 py-2 rounded-lg border border-border">{inst.webhookUrl}</code>
                          <button className="text-xs text-primary hover:underline font-medium shrink-0">Copiar</button>
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground shrink-0" />
                        </div>
                        <p className="text-[10px] text-muted-foreground">✓ Cole esta URL em: Evolution Dashboard → Webhooks → adicionar novo webhook</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── RAG tab ── */}
            {evoTab === "rag" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Info card */}
                <div className="surface-elevated p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Base de Conhecimento (RAG)</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gere uma base de conhecimento a partir do histórico de conversas do WhatsApp. O sistema amostra as conversas mais recentes, extrai o texto e organiza em chunks estruturados prontos para uso por IAs.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">📥 Busca chats</span>
                    <span className="flex items-center gap-1.5">💬 Amostra mensagens</span>
                    <span className="flex items-center gap-1.5">✂️ Divide em chunks</span>
                    <span className="flex items-center gap-1.5">💾 Salva no banco</span>
                  </div>
                </div>

                {/* Generate RAG */}
                <div className="surface-elevated p-6 space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Gerar RAG</h3>
                  <p className="text-xs text-muted-foreground">
                    Selecione uma instância e o tipo de agendamento. Top 15 chats recebem amostragem profunda (até 1.000 msgs cada), rank 16-35 recebem amostragem média (até 600 msgs), demais recebem amostragem leve (até 200 msgs). Estimativa: ~25.000 mensagens amostradas.
                  </p>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Instância</label>
                    <select value={ragInstance} onChange={(e) => setRagInstance(e.target.value)} className={inputCls}>
                      <option value="">Selecione uma instância</option>
                      {mockInstances.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Frequência</label>
                    <div className="flex gap-3">
                      <button onClick={() => setRagFreq("once")} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors", ragFreq === "once" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                        ⚡ Gerar uma vez
                      </button>
                      <button onClick={() => setRagFreq("daily")} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors", ragFreq === "daily" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                        📅 Gerar diariamente
                      </button>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    ▶ Gerar RAG
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ═══════ USERS ═══════ */}
        {section === "users" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Usuários e equipes</h1>
              <p className="text-sm text-muted-foreground mt-1">Crie novos usuários, personalize as permissões de usuário e remova usuários da conta.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {["Usuários", "Licenças", "Equipes", "Conjuntos de permissões", "Pré-definições"].map((t, i) => (
                <button key={t} className={cn("px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px", i === 0 ? "text-foreground border-foreground font-medium" : "text-muted-foreground border-transparent hover:text-foreground")}>
                  {t}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-foreground">1</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usuários</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ativos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inativos</p>
              </div>
            </div>

            {/* Search + Create */}
            <div className="flex items-center justify-between">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Pesquisar nome ou endereço de e-mail" className={cn(inputCls, "pl-9 max-w-xs")} />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
                Criar usuário
              </button>
            </div>

            {/* Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conjunto de permissão</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipe</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">MA</div>
                          <div>
                            <p className="text-sm font-medium text-primary">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
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
