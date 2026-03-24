import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;

    const u = data.user;
    set({
      user: {
        id: u.id,
        email: u.email ?? "",
        name: u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Usuário",
        role: u.user_metadata?.role ?? "Usuário",
        avatar: u.user_metadata?.avatar_url,
      },
      isAuthenticated: true,
    });
    return true;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const u = data.session.user;
      set({
        user: {
          id: u.id,
          email: u.email ?? "",
          name: u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Usuário",
          role: u.user_metadata?.role ?? "Usuário",
          avatar: u.user_metadata?.avatar_url,
        },
        isAuthenticated: true,
      });
    }
  },
}));
