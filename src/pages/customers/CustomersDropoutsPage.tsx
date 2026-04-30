import { UserMinus } from "lucide-react";

const CustomersDropoutsPage = () => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">Desistências</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Alunos que encerraram o plano</p>
    </div>
    <div className="flex-1 overflow-auto flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <UserMinus className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Desistências — Sprint 6</p>
        <p className="text-xs mt-1">Reativar alunos e acompanhar histórico de saída</p>
      </div>
    </div>
  </div>
);

export default CustomersDropoutsPage;
