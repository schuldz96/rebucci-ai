import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, Grid, List, Download, Plus, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CustomersActivePage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alunos Ativos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus alunos</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">0 Pendentes</span>
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">0 Entregue</span>
            <div className="flex items-center border border-border rounded-lg overflow-hidden ml-2">
              <button onClick={() => setViewMode("grid")} className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <Grid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar lista
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Aluno
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail ou WhatsApp..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos os planos</SelectItem></SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Modalidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="consulta">Consulta</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expiring">Vencendo</SelectItem>
                    <SelectItem value="expired">Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Prontidão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pronto">Pronto</SelectItem>
                    <SelectItem value="em_progresso">Em progresso</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Anamnese" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Respondida</SelectItem>
                    <SelectItem value="without">Sem anamnese</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Fotos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="with">Possui fotos</SelectItem>
                    <SelectItem value="without">Sem fotos</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Nota fixada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Com nota fixada</SelectItem>
                    <SelectItem value="without">Sem nota</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Ordenação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="expiry">Vencimento próximo</SelectItem>
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

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum aluno ativo encontrado</p>
          <p className="text-xs mt-1">Adicione seu primeiro aluno clicando em "Novo Aluno"</p>
        </div>
      </div>
    </div>
  );
};

export default CustomersActivePage;
