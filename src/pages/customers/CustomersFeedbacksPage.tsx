import { useState } from "react";
import { Filter, Grid, List, ChevronDown, ChevronUp, Search, MessageCircleWarning, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const CustomersFeedbacksPage = () => {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feedbacks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Acompanhe o progresso do seu time</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <Grid className="w-4 h-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-orange-400 border-orange-400/40 hover:bg-orange-400/10">
              <AlertTriangle className="w-4 h-4" />
              Feedbacks Expirados
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
                <Input placeholder="Buscar por nome ou e-mail..." className="pl-9" />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Status e Fotos</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select><SelectTrigger><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="answered">Respondido</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Filtrar por fotos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="with">Possui fotos</SelectItem>
                    <SelectItem value="without">Sem fotos</SelectItem>
                  </SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos os planos</SelectItem></SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Status do atendimento" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
                </Select>
                <Select><SelectTrigger><SelectValue placeholder="Nota fixada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Com nota</SelectItem>
                    <SelectItem value="without">Sem nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-1">Período</p>
              <Select><SelectTrigger className="w-[220px]"><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-1">Ordenação</p>
              <Select><SelectTrigger className="w-[280px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão (não lidos primeiro)</SelectItem>
                  <SelectItem value="newest">Data mais recente</SelectItem>
                  <SelectItem value="oldest">Data mais antiga</SelectItem>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button size="sm">Filtrar</Button>
                <Button size="sm" variant="outline">Limpar</Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <MessageCircleWarning className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum feedback encontrado</p>
          <p className="text-xs mt-1">Os feedbacks dos alunos aparecerão aqui</p>
        </div>
      </div>
    </div>
  );
};

export default CustomersFeedbacksPage;
