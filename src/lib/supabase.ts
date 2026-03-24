import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL e Anon Key são obrigatórios. Verifique o arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
