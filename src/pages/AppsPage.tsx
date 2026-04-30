import { Grid2X2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INTEGRATIONS = [
  { name: "Digital Manager Guru", desc: "Webhook de venda → cria consultoria automaticamente", icon: "💳", available: true },
  { name: "Hotmart", desc: "Integração via webhook de compra", icon: "🔥", available: false },
  { name: "Eduzz", desc: "Integração via webhook de compra", icon: "📦", available: false },
  { name: "Portal do Aluno", desc: "Link único para o aluno ver treinos e feedbacks", icon: "👤", available: false },
  { name: "App Android/iOS", desc: "Aplicativo móvel para o aluno (em breve)", icon: "📱", available: false },
];

const AppsPage = () => {
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Apps</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Integrações e aplicativos disponíveis</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATIONS.map((app) => (
            <button
              key={app.name}
              onClick={() => toast({ title: `${app.name} — Sprint ${app.available ? 5 : 7}`, description: app.available ? "Configuração em implementação" : "Em breve" })}
              className="flex items-start gap-4 p-5 rounded-xl border border-border hover:border-primary/40 text-left transition-all hover:bg-muted/30"
            >
              <span className="text-3xl">{app.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{app.name}</p>
                  {!app.available && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">Em breve</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{app.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppsPage;
