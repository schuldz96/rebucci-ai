import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface Pipeline {
  id: string;
  name: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  color: string | null;
}

interface PipelineState {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  stages: PipelineStage[];
  loading: boolean;

  loadPipelines: () => Promise<void>;
  selectPipeline: (id: string) => Promise<void>;
  createPipeline: (name: string) => Promise<Pipeline | null>;
  renamePipeline: (id: string, name: string) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;

  createStage: (pipelineId: string, name: string) => Promise<void>;
  updateStage: (id: string, updates: Partial<Pick<PipelineStage, "name" | "color" | "order_index">>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  reorderStages: (reordered: PipelineStage[]) => Promise<void>;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: [],
  selectedPipelineId: null,
  stages: [],
  loading: false,

  loadPipelines: async () => {
    set({ loading: true });
    const { data: pipelines } = await supabase.from("pipelines").select("*").order("created_at");
    if (!pipelines || pipelines.length === 0) {
      // Cria pipeline padrão se não houver nenhum
      const { data: created } = await supabase.from("pipelines").insert({ name: "Pipeline Principal" }).select().single();
      if (created) {
        // Cria estágios padrão
        const defaultStages = ["Novo Lead", "Tentativa de Contato", "Conectado", "Qualificado", "Reunião Agendada", "No-Show", "Fechado"];
        await supabase.from("pipeline_stages").insert(defaultStages.map((name, i) => ({ pipeline_id: created.id, name, order_index: i })));
        const { data: stages } = await supabase.from("pipeline_stages").select("*").eq("pipeline_id", created.id).order("order_index");
        set({ pipelines: [created], selectedPipelineId: created.id, stages: stages ?? [], loading: false });
        return;
      }
    }
    if (pipelines && pipelines.length > 0) {
      const selectedId = get().selectedPipelineId ?? pipelines[0].id;
      const { data: stages } = await supabase.from("pipeline_stages").select("*").eq("pipeline_id", selectedId).order("order_index");
      set({ pipelines, selectedPipelineId: selectedId, stages: stages ?? [], loading: false });
    }
    set({ loading: false });
  },

  selectPipeline: async (id) => {
    set({ selectedPipelineId: id, stages: [] });
    const { data: stages } = await supabase.from("pipeline_stages").select("*").eq("pipeline_id", id).order("order_index");
    set({ stages: stages ?? [] });
  },

  createPipeline: async (name) => {
    const { data } = await supabase.from("pipelines").insert({ name }).select().single();
    if (data) {
      set((s) => ({ pipelines: [...s.pipelines, data] }));
      return data;
    }
    return null;
  },

  renamePipeline: async (id, name) => {
    await supabase.from("pipelines").update({ name }).eq("id", id);
    set((s) => ({ pipelines: s.pipelines.map((p) => (p.id === id ? { ...p, name } : p)) }));
  },

  deletePipeline: async (id) => {
    await supabase.from("pipelines").delete().eq("id", id);
    const remaining = get().pipelines.filter((p) => p.id !== id);
    const newSelected = remaining[0]?.id ?? null;
    let stages: PipelineStage[] = [];
    if (newSelected) {
      const { data } = await supabase.from("pipeline_stages").select("*").eq("pipeline_id", newSelected).order("order_index");
      stages = data ?? [];
    }
    set({ pipelines: remaining, selectedPipelineId: newSelected, stages });
  },

  createStage: async (pipelineId, name) => {
    const current = get().stages.filter((s) => s.pipeline_id === pipelineId);
    const order_index = current.length;
    const { data } = await supabase.from("pipeline_stages").insert({ pipeline_id: pipelineId, name, order_index }).select().single();
    if (data) set((s) => ({ stages: [...s.stages, data] }));
  },

  updateStage: async (id, updates) => {
    await supabase.from("pipeline_stages").update(updates).eq("id", id);
    set((s) => ({ stages: s.stages.map((st) => (st.id === id ? { ...st, ...updates } : st)) }));
  },

  deleteStage: async (id) => {
    await supabase.from("pipeline_stages").delete().eq("id", id);
    set((s) => ({ stages: s.stages.filter((st) => st.id !== id) }));
  },

  reorderStages: async (reordered) => {
    set({ stages: reordered });
    await Promise.all(reordered.map((st, i) =>
      supabase.from("pipeline_stages").update({ order_index: i }).eq("id", st.id)
    ));
  },
}));
