import { Network } from "lucide-react";

const AffiliatesPage = () => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">Afiliados</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus afiliados e comissões</p>
    </div>
    <div className="flex-1 overflow-auto flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Afiliados — Sprint 4</p>
        <p className="text-xs mt-1">Links de afiliado com comissão por venda</p>
      </div>
    </div>
  </div>
);

export default AffiliatesPage;
