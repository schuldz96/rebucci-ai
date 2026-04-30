import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, ChevronDown, ChevronUp, Search, Plus, Copy, Package, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const ProductsListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.origin + "/produtos");
    toast({ title: "URL copiada!", description: "Link de produtos copiado para a área de transferência." });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie os seus produtos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={copyUrl}>
              <Link className="w-4 h-4" />
              URL Prime — Todos os planos
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Simulação de venda", description: "Funcionalidade em desenvolvimento" })}>
              Simular Venda
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/products/new")}>
              <Plus className="w-4 h-4" />
              Novo produto
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
            {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {filtersOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Produto e Status</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome..." className="pl-9 w-[320px]" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select><SelectTrigger><SelectValue placeholder="Tipo de produto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="plan">Plano</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="link">Link Avulso</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Atendimento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os serviços</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="consulta">Consulta</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Filtrar</Button>
                <Button size="sm" variant="outline">Limpar filtros</Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Lista de produtos */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum produto cadastrado</p>
          <p className="text-xs mt-1">Crie seu primeiro produto clicando em "Novo produto"</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => navigate("/products/new")}>
            <Plus className="w-4 h-4" />
            Criar primeiro produto
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductsListPage;
