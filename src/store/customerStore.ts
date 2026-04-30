import { create } from "zustand";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  coach_id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gender?: string;
  birthdate?: string;
  height_cm?: number;
  photo_url?: string;
  app_installed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  coach_id: string;
  name: string;
  price: number;
  duration_days: number;
  modality: string;
  active: boolean;
  auto_schedule_feedbacks: boolean;
  feedback_frequency_days: number;
}

export interface Consultoria {
  id: string;
  coach_id: string;
  customer_id: string;
  plan_id?: string;
  status: string;
  prontidao?: string;
  start_date: string;
  end_date: string;
  value: number;
  payment_status: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  // joins
  customers?: Customer;
  plans?: Plan;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeightLog {
  id: string;
  customer_id: string;
  weight_kg: number;
  recorded_at: string;
}

export interface Feedback {
  id: string;
  coach_id: string;
  customer_id: string;
  consultoria_id?: string;
  answers: Record<string, unknown>;
  weight_kg?: number;
  has_photos: boolean;
  status: "pending" | "partial" | "answered" | "seen" | "expired";
  scheduled_for?: string;
  answered_at?: string;
  created_at: string;
  // joins
  customers?: Pick<Customer, "id" | "name" | "photo_url">;
  consultorias?: { plans?: Pick<Plan, "name"> };
}

export interface NewCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gender?: string;
  birthdate?: string;
  height_cm?: number;
  // consultoria
  plan_id?: string;
  start_date: string;
  end_date: string;
  value: number;
  payment_method?: string;
  modality?: string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CustomerState {
  consultorias: Consultoria[];
  plans: Plan[];
  feedbacks: Feedback[];
  loading: boolean;
  error: string | null;

  fetchActives: (coachId: string) => Promise<void>;
  fetchPlans: (coachId: string) => Promise<void>;
  fetchFeedbacks: (coachId: string) => Promise<void>;
  fetchCustomerById: (customerId: string) => Promise<Customer | null>;
  fetchConsultoriaByCustomer: (customerId: string, coachId: string) => Promise<Consultoria | null>;
  fetchWeightLogs: (customerId: string) => Promise<WeightLog[]>;
  fetchNotes: (customerId: string) => Promise<CustomerNote[]>;
  fetchFeedbacksByCustomer: (customerId: string) => Promise<Feedback[]>;

  createCustomer: (coachId: string, payload: NewCustomerPayload) => Promise<{ success: boolean; error?: string }>;
  createNote: (coachId: string, customerId: string, content: string, pinned: boolean) => Promise<boolean>;
  updateNote: (noteId: string, content: string, pinned: boolean) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;
  addWeightLog: (coachId: string, customerId: string, weightKg: number, date: string) => Promise<boolean>;
  markFeedbackSeen: (feedbackId: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  consultorias: [],
  plans: [],
  feedbacks: [],
  loading: false,
  error: null,

  fetchActives: async (coachId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("consultorias")
      .select(`
        *,
        customers (*),
        plans (id, name, price, duration_days, modality)
      `)
      .eq("coach_id", coachId)
      .eq("status", "active")
      .order("end_date", { ascending: true });

    if (error) { set({ loading: false, error: error.message }); return; }
    set({ consultorias: data ?? [], loading: false });
  },

  fetchPlans: async (coachId) => {
    const { data } = await supabase
      .from("plans")
      .select("id, name, price, duration_days, modality, active, auto_schedule_feedbacks, feedback_frequency_days")
      .eq("coach_id", coachId)
      .eq("active", true)
      .order("name");
    set({ plans: data ?? [] });
  },

  fetchFeedbacks: async (coachId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("feedbacks")
      .select(`
        *,
        customers (id, name, photo_url),
        consultorias (plans (name))
      `)
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });

    if (error) { set({ loading: false, error: error.message }); return; }
    set({ feedbacks: data ?? [], loading: false });
  },

  fetchCustomerById: async (customerId) => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    return data;
  },

  fetchConsultoriaByCustomer: async (customerId, coachId) => {
    const { data } = await supabase
      .from("consultorias")
      .select("*, plans(*)")
      .eq("customer_id", customerId)
      .eq("coach_id", coachId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },

  fetchWeightLogs: async (customerId) => {
    const { data } = await supabase
      .from("weight_logs")
      .select("id, customer_id, weight_kg, recorded_at")
      .eq("customer_id", customerId)
      .order("recorded_at", { ascending: true });
    return data ?? [];
  },

  fetchNotes: async (customerId) => {
    const { data } = await supabase
      .from("customer_notes")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  fetchFeedbacksByCustomer: async (customerId) => {
    const { data } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  createCustomer: async (coachId, payload) => {
    // 1. Criar customer
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        coach_id: coachId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        gender: payload.gender,
        birthdate: payload.birthdate || null,
        height_cm: payload.height_cm || null,
      })
      .select()
      .single();

    if (custErr || !customer) return { success: false, error: custErr?.message };

    // 2. Criar consultoria
    const { error: consErr } = await supabase
      .from("consultorias")
      .insert({
        coach_id: coachId,
        customer_id: customer.id,
        plan_id: payload.plan_id || null,
        status: "active",
        start_date: payload.start_date,
        end_date: payload.end_date,
        value: payload.value,
        payment_method: payload.payment_method,
        payment_status: "pending",
      });

    if (consErr) return { success: false, error: consErr.message };

    await get().fetchActives(coachId);
    return { success: true };
  },

  createNote: async (coachId, customerId, content, pinned) => {
    const { error } = await supabase
      .from("customer_notes")
      .insert({ coach_id: coachId, customer_id: customerId, content, is_pinned: pinned });
    return !error;
  },

  updateNote: async (noteId, content, pinned) => {
    const { error } = await supabase
      .from("customer_notes")
      .update({ content, is_pinned: pinned, updated_at: new Date().toISOString() })
      .eq("id", noteId);
    return !error;
  },

  deleteNote: async (noteId) => {
    const { error } = await supabase.from("customer_notes").delete().eq("id", noteId);
    return !error;
  },

  addWeightLog: async (coachId, customerId, weightKg, date) => {
    const { error } = await supabase
      .from("weight_logs")
      .insert({ coach_id: coachId, customer_id: customerId, weight_kg: weightKg, recorded_at: date });
    return !error;
  },

  markFeedbackSeen: async (feedbackId) => {
    await supabase
      .from("feedbacks")
      .update({ status: "seen", seen_at: new Date().toISOString() })
      .eq("id", feedbackId);
    set((s) => ({
      feedbacks: s.feedbacks.map((f) =>
        f.id === feedbackId ? { ...f, status: "seen" as const } : f
      ),
    }));
  },
}));
