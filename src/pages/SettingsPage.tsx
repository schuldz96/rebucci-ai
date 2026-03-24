import { useState } from "react";
import { mockInstances } from "@/data/mockData";
import { motion } from "framer-motion";
import { Plug, Radio, Bell, Wifi, WifiOff, Save, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const SettingsPage = () => {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [events, setEvents] = useState({ received: true, sent: true, connected: false });
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 1000));
    setTestResult(apiUrl ? "Conexão estabelecida com sucesso! ✅" : "Preencha a URL da API");
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie integrações e preferências</p>
      </div>

      {/* Evolution API */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plug className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Evolution API</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">URL da API</label>
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.evolution.com" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button onClick={handleTestConnection} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
              <Zap className="w-4 h-4" /> Testar Conexão
            </button>
          </div>
          {testResult && <p className="text-sm text-foreground">{testResult}</p>}
        </div>
      </motion.div>

      {/* Instances */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-elevated p-6">
        <div className="flex items-center gap-2 mb-5">
          <Radio className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Instâncias</h2>
        </div>
        <div className="space-y-3">
          {mockInstances.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                {inst.status === "online" ? (
                  <Wifi className="w-4 h-4 text-success" />
                ) : (
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{inst.name}</p>
                  <p className="text-xs text-muted-foreground">{inst.phone}</p>
                </div>
              </div>
              <button className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                inst.status === "online"
                  ? "bg-success/20 text-success"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}>
                {inst.status === "online" ? "Conectado" : "Conectar"}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Webhooks */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="surface-elevated p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground">Webhooks</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">URL do Webhook</label>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://seu-webhook.com/api" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">Eventos</label>
            <div className="space-y-2">
              {([
                { key: "received", label: "message.received", desc: "Quando uma mensagem é recebida" },
                { key: "sent", label: "message.sent", desc: "Quando uma mensagem é enviada" },
                { key: "connected", label: "instance.connected", desc: "Quando uma instância se conecta" },
              ] as const).map((evt) => (
                <label key={evt.key} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border cursor-pointer hover:bg-secondary/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={events[evt.key]}
                    onChange={(e) => setEvents({ ...events, [evt.key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{evt.label}</p>
                    <p className="text-xs text-muted-foreground">{evt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" /> Salvar Webhooks
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
