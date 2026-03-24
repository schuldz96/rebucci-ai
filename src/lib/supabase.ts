import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://urrbpxrtdzurfdsucukb.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmJweHJ0ZHp1cmZkc3VjdWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODc4NzUsImV4cCI6MjA4OTk2Mzg3NX0.eX6alOIGkQFw5v6nf21jXisWgEGQxoVCFPrrYqAzSTY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
