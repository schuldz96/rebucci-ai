import { Upload, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ImportCustomersPage = () => {
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Importar Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Importe alunos via arquivo CSV</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-lg space-y-6">
          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-1">Passo 1 — Baixar template</h3>
            <p className="text-sm text-muted-foreground mb-4">Baixe o modelo CSV com as colunas esperadas e preencha com seus alunos.</p>
            <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Download do template — Sprint 6" })}>
              <Download className="w-4 h-4" />
              Baixar template CSV
            </Button>
          </div>

          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center hover:border-primary/40 transition-colors cursor-pointer" onClick={() => toast({ title: "Upload de CSV — Sprint 6" })}>
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">Clique para fazer upload do CSV</p>
            <p className="text-xs text-muted-foreground mt-1">ou arraste e solte aqui</p>
            <p className="text-xs text-muted-foreground mt-3">Funcionalidade completa — Sprint 6</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCustomersPage;
