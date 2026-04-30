import { useState } from "react";
import { Copy, Check, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ─── Digital Manager Guru ─────────────────────────────────────────────────────

const GuruConfig = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${window.location.origin}/api/webhook/guru/${coachId}`;

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "URL do webhook copiada!" });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure o webhook no painel do Digital Manager Guru. Quando uma venda for aprovada, o aluno e a consultoria serão criados automaticamente no CRM.
      </p>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL do Webhook</label>
        <div className="flex items-center gap-2 mt-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button variant="outline" size="sm" onClick={copy} className="gap-2 shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">Passo a passo:</p>
        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Acesse o painel do Digital Manager Guru</li>
          <li>Vá em <strong className="text-foreground">Configurações → Webhooks</strong></li>
          <li>Clique em <strong className="text-foreground">Adicionar webhook</strong></li>
          <li>Cole a URL acima no campo de endpoint</li>
          <li>Selecione o evento <strong className="text-foreground">Venda aprovada</strong></li>
          <li>Salve e faça um teste de disparo</li>
        </ol>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-foreground mb-2">Campos mapeados automaticamente:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ["Nome do cliente", "customer.name"],
            ["E-mail", "customer.email"],
            ["Telefone", "customer.phone"],
            ["Produto comprado", "product.name → plano"],
            ["Valor da venda", "payment.amount"],
            ["Forma de pagamento", "payment.method"],
          ].map(([label, field]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              <span className="text-muted-foreground">{label}</span>
              <span className="text-primary font-mono ml-auto">{field}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── App Card ─────────────────────────────────────────────────────────────────

interface AppDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  status: "active" | "soon" | "available";
  category: string;
}

const APPS: AppDef[] = [
  { id: "guru", name: "Digital Manager Guru", desc: "Webhook de venda → cria aluno e consultoria automaticamente", icon: "💳", status: "active", category: "Vendas" },
  { id: "hotmart", name: "Hotmart", desc: "Integração via webhook de compra aprovada", icon: "🔥", status: "soon", category: "Vendas" },
  { id: "eduzz", name: "Eduzz", desc: "Integração via webhook de compra", icon: "📦", status: "soon", category: "Vendas" },
  { id: "kiwify", name: "Kiwify", desc: "Integração via webhook de venda", icon: "🥝", status: "soon", category: "Vendas" },
  { id: "portal", name: "Portal do Aluno", desc: "Link único para o aluno acompanhar treinos, dietas e feedbacks", icon: "👤", status: "soon", category: "Engajamento" },
  { id: "app", name: "App Android/iOS", desc: "Aplicativo móvel dedicado para seus alunos", icon: "📱", status: "soon", category: "Engajamento" },
  { id: "whatsapp", name: "WhatsApp Business API", desc: "Envio automatizado de mensagens via API oficial", icon: "💬", status: "available", category: "Comunicação" },
  { id: "zapier", name: "Zapier", desc: "Conecte o CRM com +5.000 aplicativos", icon: "⚡", status: "soon", category: "Automação" },
];

const STATUS_BADGE = {
  active: { label: "Ativo", cls: "text-green-400 bg-green-400/10" },
  soon: { label: "Em breve", cls: "text-muted-foreground bg-muted" },
  available: { label: "Disponível", cls: "text-blue-400 bg-blue-400/10" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AppsPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>("guru");
  const [category, setCategory] = useState("Todos");

  const categories = ["Todos", ...Array.from(new Set(APPS.map((a) => a.category)))];
  const filtered = category === "Todos" ? APPS : APPS.filter((a) => a.category === category);

  const handleAppClick = (app: AppDef) => {
    if (app.status === "active") {
      setExpanded((prev) => prev === app.id ? null : app.id);
    } else if (app.status === "available") {
      toast({ title: `${app.name}`, description: "Entre em contato com o suporte para ativar esta integração." });
    } else {
      toast({ title: `${app.name} — Em breve`, description: "Esta integração estará disponível em breve." });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Apps & Integrações</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Conecte o CRM com suas ferramentas de vendas e comunicação</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-sm text-primary">
            <Zap className="w-4 h-4" />
            <span className="font-medium">1 integração ativa</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                category === c ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-3">
          {filtered.map((app) => {
            const badge = STATUS_BADGE[app.status];
            const isExpanded = expanded === app.id;
            return (
              <div
                key={app.id}
                className={cn("rounded-xl border transition-all", isExpanded ? "border-primary/50" : "border-border")}
              >
                <button
                  onClick={() => handleAppClick(app)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  <span className="text-3xl shrink-0">{app.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{app.name}</p>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", badge.cls)}>{badge.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{app.desc}</p>
                  </div>
                  {app.status === "active" && (
                    <ExternalLink className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-180")} />
                  )}
                </button>

                {isExpanded && app.id === "guru" && user && (
                  <div className="px-5 pb-5 border-t border-border pt-4">
                    <GuruConfig coachId={user.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppsPage;
