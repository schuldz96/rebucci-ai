import { BarChart3 } from "lucide-react";

const CustomersEngagementPage = () => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">Engajamento</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Score de engajamento dos seus alunos</p>
    </div>
    <div className="flex-1 overflow-auto flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Engajamento — Sprint 6</p>
        <p className="text-xs mt-1">Score por aluno com semáforo visual (verde/amarelo/vermelho)</p>
      </div>
    </div>
  </div>
);

export default CustomersEngagementPage;
