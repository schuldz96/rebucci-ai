import { useState } from "react";
import { Dumbbell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LibraryWorkoutPage = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Biblioteca de Treinos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas fichas de treino</p>
          </div>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Nova ficha de treino
          </Button>
        </div>
        <div className="relative mt-4 w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar ficha de treino..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma ficha de treino cadastrada</p>
          <p className="text-xs mt-1">Crie sua primeira ficha — Sprint 4</p>
          <Button size="sm" className="mt-4 gap-2"><Plus className="w-4 h-4" />Criar ficha</Button>
        </div>
      </div>
    </div>
  );
};

export default LibraryWorkoutPage;
