import { UsersRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ToolsGroupsPage = () => {
  const { toast } = useToast();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Organize alunos em grupos para ações em massa</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => toast({ title: "Novo grupo — Sprint 6" })}>
            <Plus className="w-4 h-4" />
            Novo grupo
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <UsersRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum grupo criado</p>
          <p className="text-xs mt-1">Grupos com ações em massa — Sprint 6</p>
        </div>
      </div>
    </div>
  );
};

export default ToolsGroupsPage;
