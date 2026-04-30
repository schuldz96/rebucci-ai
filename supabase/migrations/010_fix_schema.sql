-- ============================================================
-- 010_fix_schema.sql — Correções de schema e colunas faltando
-- ============================================================

-- PROFILES: adicionar specialty
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty text;

-- WORKOUT_PLANS: adicionar colunas usadas pela LibraryWorkoutPage
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS level text; -- 'iniciante' | 'intermediario' | 'avancado'
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS weeks integer;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS days_per_week integer;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- DIET_PLANS: adicionar colunas usadas pela LibraryDietPage
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS calorie_target numeric;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS protein_target numeric;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS carb_target numeric;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS fat_target numeric;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- GROUPS: adicionar color
ALTER TABLE groups ADD COLUMN IF NOT EXISTS color text DEFAULT '#9d66ff';

-- CART_RECOVERIES: adicionar colunas usadas pela CartRecoveryPage
ALTER TABLE cart_recoveries ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE cart_recoveries ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE cart_recoveries ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE cart_recoveries ADD COLUMN IF NOT EXISTS plan_name text;
ALTER TABLE cart_recoveries ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0;
ALTER TABLE cart_recoveries ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'; -- 'pending' | 'contacted' | 'recovered' | 'lost'

-- Migrar dados existentes: copiar lead_name → name (caso existam registros)
UPDATE cart_recoveries SET name = lead_name WHERE name IS NULL AND lead_name IS NOT NULL;
UPDATE cart_recoveries SET email = lead_email WHERE email IS NULL AND lead_email IS NOT NULL;
UPDATE cart_recoveries SET phone = lead_phone WHERE phone IS NULL AND lead_phone IS NOT NULL;

-- AFFILIATES: adicionar/renomear colunas
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS commission_pct numeric DEFAULT 10;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_sales integer DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_commission numeric DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'; -- 'active' | 'inactive'
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS phone text;

-- Migrar dados existentes
UPDATE affiliates SET commission_pct = commission_percent WHERE commission_pct IS NULL;
UPDATE affiliates SET referral_code = link_code WHERE referral_code IS NULL;
UPDATE affiliates SET status = CASE WHEN active THEN 'active' ELSE 'inactive' END WHERE status IS NULL;

-- FEEDBACK_TOKENS: adicionar used boolean para compatibilidade com FeedbackFormPage
ALTER TABLE feedback_tokens ADD COLUMN IF NOT EXISTS used boolean DEFAULT false;
-- Sincronizar: se used_at não é null → used = true
UPDATE feedback_tokens SET used = true WHERE used_at IS NOT NULL;

-- COACH_SETTINGS: tabela de configurações por coach
CREATE TABLE IF NOT EXISTS coach_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL UNIQUE,
  feedback_freq_days integer DEFAULT 14,
  auto_send_feedback boolean DEFAULT true,
  auto_birthday_msg boolean DEFAULT true,
  auto_expiring_msg boolean DEFAULT true,
  expiring_alert_days integer DEFAULT 7,
  pix_key text,
  default_payment_method text DEFAULT 'pix',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE coach_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON coach_settings;
CREATE POLICY "coach_own" ON coach_settings USING (coach_id = auth.uid());

-- PROGRESS_PHOTOS: garantir que bucket de storage existe via comentário
-- AÇÃO MANUAL NECESSÁRIA: criar bucket "progress-photos" no painel do Supabase
-- Storage → New bucket → Nome: progress-photos → Público: SIM
