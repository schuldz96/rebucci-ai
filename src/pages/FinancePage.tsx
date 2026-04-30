import { useState } from "react";
import { DollarSign, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Tab = "transactions" | "upcoming" | "overdue";

const FinancePage = () => {
  const [tab, setTab] = useState<Tab>("transactions");
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Controle de receitas e pagamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast({ title: "Exportar — Sprint 4" })}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => toast({ title: "Registrar pagamento — Sprint 4" })}>
              <Plus className="w-4 h-4" />
              Registrar pagamento
            </Button>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: "Receita do mês", value: "R$ 0,00", color: "text-green-400" },
            { label: "A receber", value: "R$ 0,00", color: "text-yellow-400" },
            { label: "Em atraso", value: "R$ 0,00", color: "text-red-400" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 border-b border-border -mb-px">
          {[
            { id: "transactions" as Tab, label: "Transações" },
            { id: "upcoming" as Tab, label: "Cobranças futuras" },
            { id: "overdue" as Tab, label: "Inadimplentes" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Financeiro completo — Sprint 4</p>
          <p className="text-xs mt-1">Transações, cobranças futuras e inadimplentes</p>
        </div>
      </div>
    </div>
  );
};

export default FinancePage;
