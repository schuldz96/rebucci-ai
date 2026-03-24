import { create } from "zustand";
import { mockDeals, KANBAN_STAGES, type Deal } from "@/data/mockData";

interface DealState {
  deals: Deal[];
  stages: string[];
  moveDeal: (dealId: string, newStage: string) => void;
  addDeal: (deal: Omit<Deal, "id">) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
}

export const useDealStore = create<DealState>((set) => ({
  deals: mockDeals,
  stages: KANBAN_STAGES,
  moveDeal: (dealId, newStage) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    })),
  addDeal: (deal) =>
    set((state) => ({
      deals: [...state.deals, { ...deal, id: `deal-${Date.now()}` }],
    })),
  updateDeal: (id, updates) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
}));
