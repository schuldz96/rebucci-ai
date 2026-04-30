import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ImportProtocolsPage = () => {
  const { toast } = useToast();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Importar Treinos/Dietas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Importe protocolos via planilha</p>
      </div>
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Importar Treinos/Dietas — Sprint 6</p>
          <p className="text-xs mt-1">Upload de planilha com estrutura de treino ou dieta</p>
        </div>
      </div>
    </div>
  );
};

export default ImportProtocolsPage;
