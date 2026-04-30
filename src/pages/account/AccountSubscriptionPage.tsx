import { useState } from "react";
import { CreditCard, CheckCircle2, Zap, Shield, HeadphonesIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 97,
    maxStudents: 30,
    features: ["Até 30 alunos ativos", "Dashboard e agenda", "Feedbacks automatizados", "Biblioteca de treinos/dietas", "Suporte por e-mail"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 197,
    maxStudents: 100,
    features: ["Até 100 alunos ativos", "Tudo do Starter", "Integração Digital Manager Guru", "Recuperação de carrinho", "Afiliados e comissões", "Suporte prioritário via WhatsApp"],
    highlight: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: 347,
    maxStudents: 999,
    features: ["Alunos ilimitados", "Tudo do Pro", "Portal do aluno (breve)", "App Android/iOS (breve)", "API de integração", "Gerente de conta dedicado"],
    highlight: false,
  },
];

const AccountSubscriptionPage = () => {
  const { toast } = useToast();
  const [currentPlan] = useState("pro");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const handleUpgrade = (planId: string) => {
    if (planId === currentPlan) return;
    toast({ title: "Redirecionando para o checkout...", description: "Você será redirecionado para finalizar a assinatura." });
  };

  const handleCancelSubscription = () => {
    toast({ title: "Para cancelar, entre em contato com o suporte", description: "Fale conosco pelo chat ou WhatsApp." });
  };

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie seu plano da plataforma</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Status atual */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Plano Pro — Ativo</p>
              <p className="text-sm text-muted-foreground">Próxima cobrança em <strong>15/05/2026</strong> · {fmtBRL(197)}/mês</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Ativo</span>
            </div>
          </div>
        </div>

        {/* Toggle mensal/anual */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Faturamento</span>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setBilling("monthly")}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                billing === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                billing === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Anual <span className="text-[10px] text-green-400 font-semibold">-20%</span>
            </button>
          </div>
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const price = billing === "annual" ? Math.round(plan.price * 0.8) : plan.price;
            const isCurrent = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl border p-5 flex flex-col gap-4 relative",
                  plan.highlight ? "border-primary/50 bg-primary/5" : "border-border",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                    Mais popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-[10px] font-bold uppercase">
                    Atual
                  </span>
                )}
                <div>
                  <p className="font-bold text-foreground text-base">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">Até {plan.maxStudents === 999 ? "∞" : plan.maxStudents} alunos</p>
                </div>
                <div>
                  <span className="text-3xl font-bold text-foreground">{fmtBRL(price)}</span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                  {billing === "annual" && <p className="text-xs text-green-400 mt-0.5">Economize {fmtBRL((plan.price - price) * 12)}/ano</p>}
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : plan.highlight ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.id)}
                  className="w-full"
                >
                  {isCurrent ? "Plano atual" : "Fazer upgrade"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Shield, title: "Garantia de 7 dias", desc: "Cancelamento sem custo nos primeiros 7 dias" },
            { icon: CreditCard, title: "Pagamento seguro", desc: "PIX, cartão de crédito ou boleto bancário" },
            { icon: HeadphonesIcon, title: "Suporte especializado", desc: "Nossa equipe atende via chat e WhatsApp" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-xl border border-border">
              <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Links úteis */}
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => toast({ title: "Histórico de faturas em breve" })}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver histórico de faturas
          </button>
          <span className="text-border">·</span>
          <button onClick={handleCancelSubscription} className="text-muted-foreground hover:text-destructive transition-colors">
            Cancelar assinatura
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSubscriptionPage;
