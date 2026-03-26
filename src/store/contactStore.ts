import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/data/mockData";

interface ContactState {
  contacts: Contact[];
  loading: boolean;
  loadContacts: () => Promise<void>;
  addContact: (contact: Omit<Contact, "id" | "createdAt">) => Promise<void>;
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
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      set({ contacts: data.map(mapRow) });
    }
    set({ loading: false });
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
