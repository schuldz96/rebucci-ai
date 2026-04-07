import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/data/mockData";

interface ContactState {
  contacts: Contact[];
  loading: boolean;
  loadContacts: () => Promise<void>;
  addContact: (contact: Omit<Contact, "id" | "createdAt">) => Promise<void>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
}

const mapRow = (r: Record<string, unknown>): Contact => ({
  id: r.id as string,
  name: r.name as string,
  email: r.email as string,
  phone: r.phone as string,
  company: r.company as string,
  status: r.status as Contact["status"],
  createdAt: r.created_at as string,
  activationDate: r.activation_date as string | undefined,
  endDate: r.end_date as string | undefined,
  lastFeedback: r.last_feedback as string | undefined,
  nextFeedback: r.next_feedback as string | undefined,
});

export const useContactStore = create<ContactState>((set) => ({
  contacts: [],
  loading: false,

  loadContacts: async () => {
    set({ loading: true });
    // Busca todos os contatos (Supabase limita a 1000 por query, então pagina)
    const all: Contact[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...data.map(mapRow));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    set({ contacts: all, loading: false });
  },

  updateContact: async (id, updates) => {
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.company !== undefined) patch.company = updates.company;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.activationDate !== undefined) patch.activation_date = updates.activationDate || null;
    if (updates.endDate !== undefined) patch.end_date = updates.endDate || null;
    if (updates.lastFeedback !== undefined) patch.last_feedback = updates.lastFeedback || null;
    if (updates.nextFeedback !== undefined) patch.next_feedback = updates.nextFeedback || null;
    set((state) => ({
      contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    if (Object.keys(patch).length > 0) {
      await supabase.from("contacts").update(patch).eq("id", id);
    }
  },

  addContact: async (contact) => {
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        status: contact.status,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      set((state) => ({ contacts: [mapRow(data), ...state.contacts] }));
    }
  },
}));
