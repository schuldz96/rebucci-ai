import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { KANBAN_STAGES, type Deal } from "@/data/mockData";

interface DealState {
  deals: Deal[];
  stages: string[];
  loading: boolean;
  loadDeals: () => Promise<void>;
  moveDeal: (dealId: string, newStage: string) => Promise<void>;
  addDeal: (deal: Omit<Deal, "id">) => Promise<void>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
}

const mapRow = (r: Record<string, unknown>): Deal => ({
  id: r.id as string,
  title: r.title as string,
  contactName: r.contact_name as string,
  value: r.value as number,
  priority: r.priority as Deal["priority"],
  stage: r.stage as string,
  contactId: r.contact_id as string | undefined,
  phone: r.phone as string | undefined,
  responsibleUser: r.responsible_user as string | undefined,
  group: r.group as string | undefined,
  pipelineId: r.pipeline_id as string | undefined,
});

export const useDealStore = create<DealState>((set) => ({
  deals: [],
  stages: KANBAN_STAGES,
  loading: false,

  loadDeals: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      set({ deals: data.map(mapRow) });
    }
    set({ loading: false });
  },

  moveDeal: async (dealId, newStage) => {
    set((state) => ({
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    }));
    await supabase.from("deals").update({ stage: newStage }).eq("id", dealId);
  },

  addDeal: async (deal) => {
    const { data, error } = await supabase
      .from("deals")
      .insert({
        title: deal.title,
        contact_name: deal.contactName,
        value: deal.value,
        priority: deal.priority,
        stage: deal.stage,
        contact_id: deal.contactId ?? null,
        phone: deal.phone ?? null,
        responsible_user: deal.responsibleUser ?? null,
        group: deal.group ?? null,
        pipeline_id: deal.pipelineId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      set((state) => ({ deals: [mapRow(data), ...state.deals] }));
    }
  },

  deleteDeal: async (id) => {
    set((state) => ({ deals: state.deals.filter((d) => d.id !== id) }));
    await supabase.from("deals").delete().eq("id", id);
  },

  updateDeal: async (id, updates) => {
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    const patch: Record<string, unknown> = {};
    if (updates.contactId !== undefined) patch.contact_id = updates.contactId;
    if (updates.stage !== undefined) patch.stage = updates.stage;
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.value !== undefined) patch.value = updates.value;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.contactName !== undefined) patch.contact_name = updates.contactName;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (Object.keys(patch).length > 0) {
      await supabase.from("deals").update(patch).eq("id", id);
    }
  },
}));
