import { useState } from "react";
import { Filter, ChevronDown, ChevronUp, Search, Download, Plus, PartyPopper, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const CustomersListPage = () => {
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus clientes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-violet-400 border-violet-400/40 hover:bg-violet-400/10">
              <PartyPopper className="w-4 h-4" />
              Aniversariantes
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Excluídos
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar lista
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar manualmente
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, e-mail ou WhatsApp..." className="pl-9" />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Status e Plano</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select><SelectTrigger><SelectValue placeholder="Status do plano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="never">Nunca ativado</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos os planos</SelectItem></SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Vencimento próximo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os vencimentos</SelectItem>
                    <SelectItem value="7">Próximos 7 dias</SelectItem>
                    <SelectItem value="30">Próximos 30 dias</SelectItem>
                    <SelectItem value="expired">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="App instalado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os apps</SelectItem>
                    <SelectItem value="with">Com app instalado</SelectItem>
                    <SelectItem value="without">Sem app</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-1">Pagamento</p>
              <Select><SelectTrigger className="w-[280px]"><SelectValue placeholder="Cobranças automáticas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cobranças</SelectItem>
                  <SelectItem value="with">Com cobrança automática</SelectItem>
                  <SelectItem value="without">Sem cobrança</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-1">Ordenação</p>
              <Select><SelectTrigger className="w-[220px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Nome A-Z</SelectItem>
                  <SelectItem value="name_desc">Nome Z-A</SelectItem>
                  <SelectItem value="newest">Mais recente</SelectItem>
                  <SelectItem value="expiry">Vencimento próximo</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button size="sm">Filtrar</Button>
                <Button size="sm" variant="outline">Limpar filtros</Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr>
              {["Cliente", "WhatsApp", "E-mail", "Plano contratado", "Status", "Ações"].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center py-16 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum cliente encontrado</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersListPage;
