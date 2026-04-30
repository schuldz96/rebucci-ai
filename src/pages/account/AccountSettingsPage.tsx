import { useState } from "react";
import { User, Dumbbell, Zap, DollarSign, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const SECTIONS = [
  { id: "profile", label: "Perfil do Coach", icon: User },
  { id: "coaching", label: "Coaching", icon: Dumbbell },
  { id: "automations", label: "Automações", icon: Zap },
  { id: "financial", label: "Financeiro", icon: DollarSign },
  { id: "integrations", label: "Integrações", icon: Plug },
];

const AccountSettingsPage = () => {
  const [section, setSection] = useState("profile");
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configurações do coach e da plataforma</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de seções */}
        <aside className="w-52 border-r border-border shrink-0 py-4 px-2 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors",
                section === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-6">
          {section === "profile" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Perfil do Coach</h2>
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input className="mt-1" placeholder="Seu nome completo" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input className="mt-1" placeholder="+55 (11) 99999-9999" />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={3} placeholder="Conte um pouco sobre você..." />
              </div>
              <Button onClick={() => toast({ title: "Perfil salvo!" })}>Salvar alterações</Button>
            </div>
          )}

          {section === "coaching" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Configurações de Coaching</h2>
              <div>
                <label className="text-sm font-medium">Frequência padrão de feedback (dias)</label>
                <div className="flex items-center gap-3 mt-2">
                  {[7, 14, 15, 21, 30].map((d) => (
                    <button key={d} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:border-primary hover:text-primary transition-colors">
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Perguntas do formulário de feedback</label>
                <p className="text-xs text-muted-foreground mt-1">Gerenciamento de perguntas — Sprint 5</p>
              </div>
              <Button onClick={() => toast({ title: "Configurações salvas!" })}>Salvar</Button>
            </div>
          )}

          {section !== "profile" && section !== "coaching" && (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <div className="text-center">
                {(() => { const s = SECTIONS.find(x => x.id === section); return s ? <s.icon className="w-10 h-10 mx-auto mb-2 opacity-30" /> : null; })()}
                <p className="text-sm font-medium">{SECTIONS.find(x => x.id === section)?.label} — Sprint 5</p>
                <p className="text-xs mt-1 opacity-60">Em implementação</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
