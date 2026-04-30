-- ============================================================
-- 009_coaching_schema.sql — Módulo de Coaching Completo
-- Todas as tabelas com RLS + policies (coach_id = auth.uid())
-- ============================================================

-- PROFILES (dados do coach — separado de auth.users e crm_users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text,
  phone text,
  bio text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON profiles;
CREATE POLICY "coach_own" ON profiles USING (id = auth.uid());

-- PLANS (produtos/planos de consultoria — schema completo 8 etapas)
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  -- Etapa 1
  product_type text DEFAULT 'plan', -- 'plan' | 'event' | 'link_avulso'
  -- Etapa 2
  active boolean DEFAULT true,
  show_in_general_listing boolean DEFAULT false,
  show_in_renewal_listing boolean DEFAULT true,
  exclusive_renewal_listing boolean DEFAULT false,
  -- Etapa 3
  modality text DEFAULT 'online', -- 'online' | 'personal' | 'consulta'
  -- Etapa 4
  includes_diet boolean DEFAULT false,
  includes_workout boolean DEFAULT false,
  -- Etapa 5
  name text NOT NULL,
  description text,
  delivery_days integer DEFAULT 5,
  -- Etapa 6
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  period_label text, -- 'Mensal' | 'Trimestral' | etc.
  payment_methods text DEFAULT 'pix_cartao', -- 'pix' | 'cartao' | 'pix_cartao'
  max_installments integer DEFAULT 12,
  is_recurring boolean DEFAULT false,
  absorb_interest boolean DEFAULT false,
  -- Etapa 7
  request_documents_on_first_purchase boolean DEFAULT false,
  auto_schedule_feedbacks boolean DEFAULT false,
  feedback_frequency_days integer DEFAULT 15,
  -- Etapa 8
  upsell_enabled boolean DEFAULT false,
  upsell_product_id uuid REFERENCES plans(id),
  -- Meta
  url_slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON plans;
CREATE POLICY "coach_own" ON plans USING (coach_id = auth.uid());

-- CUSTOMERS (alunos de coaching — diferente de contacts do CRM)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  gender text, -- 'masculino' | 'feminino' | 'outro'
  birthdate date,
  height_cm numeric,
  photo_url text,
  app_installed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON customers;
CREATE POLICY "coach_own" ON customers USING (coach_id = auth.uid());

-- CONSULTORIAS (vínculo aluno ↔ plano com período)
CREATE TABLE IF NOT EXISTS consultorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id),
  status text DEFAULT 'active', -- 'active' | 'inactive' | 'pending'
  prontidao text, -- 'pronto' | 'em_progresso' | 'aguardando'
  start_date date NOT NULL,
  end_date date NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'pending', -- 'paid' | 'pending' | 'overdue'
  payment_method text, -- 'pix' | 'dinheiro' | 'cartao' | 'boleto' | 'outro'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE consultorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON consultorias;
CREATE POLICY "coach_own" ON consultorias USING (coach_id = auth.uid());

-- ANAMNESIS (formulário de saúde do aluno)
CREATE TABLE IF NOT EXISTS anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  answers jsonb DEFAULT '{}',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE anamnesis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON anamnesis;
CREATE POLICY "coach_own" ON anamnesis USING (coach_id = auth.uid());

-- FEEDBACK_FORMS (perguntas configuráveis por coach)
CREATE TABLE IF NOT EXISTS feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  question text NOT NULL,
  type text DEFAULT 'text', -- 'text' | 'scale' | 'choice'
  options jsonb,
  order_index integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON feedback_forms;
CREATE POLICY "coach_own" ON feedback_forms USING (coach_id = auth.uid());

-- FEEDBACK_TOKENS (link público por aluno — sem login)
CREATE TABLE IF NOT EXISTS feedback_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON feedback_tokens;
CREATE POLICY "coach_own" ON feedback_tokens USING (coach_id = auth.uid());
-- Policy pública para leitura do token (aluno sem login)
DROP POLICY IF EXISTS "public_read_token" ON feedback_tokens;
CREATE POLICY "public_read_token" ON feedback_tokens FOR SELECT USING (true);

-- FEEDBACKS (respostas dos alunos)
CREATE TABLE IF NOT EXISTS feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  token_id uuid REFERENCES feedback_tokens(id),
  answers jsonb DEFAULT '{}',
  weight_kg numeric,
  has_photos boolean DEFAULT false,
  status text DEFAULT 'pending', -- 'pending' | 'partial' | 'answered' | 'seen' | 'expired'
  scheduled_for date,
  answered_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON feedbacks;
CREATE POLICY "coach_own" ON feedbacks USING (coach_id = auth.uid());
-- Policy pública para INSERT (aluno responde sem login)
DROP POLICY IF EXISTS "public_insert_feedback" ON feedbacks;
CREATE POLICY "public_insert_feedback" ON feedbacks FOR INSERT WITH CHECK (true);

-- APPOINTMENTS (eventos da agenda)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  consultoria_id uuid REFERENCES consultorias(id) ON DELETE SET NULL,
  feedback_id uuid REFERENCES feedbacks(id) ON DELETE SET NULL,
  type text NOT NULL, -- 'feedback' | 'checkin' | 'consultation' | 'birthday' | 'renewal'
  title text,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled'
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON appointments;
CREATE POLICY "coach_own" ON appointments USING (coach_id = auth.uid());

-- PROGRESS_PHOTOS (fotos de progresso)
CREATE TABLE IF NOT EXISTS progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  feedback_id uuid REFERENCES feedbacks(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  type text DEFAULT 'front', -- 'front' | 'back' | 'side_left' | 'side_right'
  taken_at date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON progress_photos;
CREATE POLICY "coach_own" ON progress_photos USING (coach_id = auth.uid());

-- WEIGHT_LOGS
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  weight_kg numeric NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON weight_logs;
CREATE POLICY "coach_own" ON weight_logs USING (coach_id = auth.uid());

-- BODY_FAT_LOGS
CREATE TABLE IF NOT EXISTS body_fat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  body_fat_pct numeric NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE body_fat_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON body_fat_logs;
CREATE POLICY "coach_own" ON body_fat_logs USING (coach_id = auth.uid());

-- HYDRATION_LOGS
CREATE TABLE IF NOT EXISTS hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  water_ml integer NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON hydration_logs;
CREATE POLICY "coach_own" ON hydration_logs USING (coach_id = auth.uid());

-- EXERCISE_LOGS
CREATE TABLE IF NOT EXISTS exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  muscle_group text,
  sets integer,
  reps integer,
  weight_kg numeric,
  logged_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON exercise_logs;
CREATE POLICY "coach_own" ON exercise_logs USING (coach_id = auth.uid());

-- CARDIO_LOGS
CREATE TABLE IF NOT EXISTS cardio_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  cardio_type text,
  duration_min integer,
  distance_km numeric,
  logged_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cardio_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON cardio_logs;
CREATE POLICY "coach_own" ON cardio_logs USING (coach_id = auth.uid());

-- EXAMS
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  exam_date date,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON exams;
CREATE POLICY "coach_own" ON exams USING (coach_id = auth.uid());

-- CUSTOMER_EVALUATIONS (avaliações físicas completas)
CREATE TABLE IF NOT EXISTS customer_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  weight_kg numeric,
  body_fat_pct numeric,
  arm_cm numeric,
  waist_cm numeric,
  hip_cm numeric,
  thigh_cm numeric,
  calf_cm numeric,
  notes text,
  evaluated_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON customer_evaluations;
CREATE POLICY "coach_own" ON customer_evaluations USING (coach_id = auth.uid());

-- CUSTOMER_NOTES (notas internas do coach)
CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON customer_notes;
CREATE POLICY "coach_own" ON customer_notes USING (coach_id = auth.uid());

-- WORKOUT_PLANS (biblioteca de treinos)
CREATE TABLE IF NOT EXISTS workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON workout_plans;
CREATE POLICY "coach_own" ON workout_plans USING (coach_id = auth.uid());

-- WORKOUT_SESSIONS
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  day_label text,
  order_index integer DEFAULT 0
);
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "via_plan" ON workout_sessions;
CREATE POLICY "via_plan" ON workout_sessions USING (
  EXISTS (SELECT 1 FROM workout_plans WHERE id = plan_id AND coach_id = auth.uid())
);

-- EXERCISES
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sets integer,
  reps text,
  load text,
  rest_seconds integer,
  video_url text,
  notes text,
  order_index integer DEFAULT 0
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "via_session" ON exercises;
CREATE POLICY "via_session" ON exercises USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    JOIN workout_plans wp ON wp.id = ws.plan_id
    WHERE ws.id = session_id AND wp.coach_id = auth.uid()
  )
);

-- CUSTOMER_WORKOUT_PLANS (treino atribuído ao aluno)
CREATE TABLE IF NOT EXISTS customer_workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  workout_plan_id uuid REFERENCES workout_plans(id) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);
ALTER TABLE customer_workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON customer_workout_plans;
CREATE POLICY "coach_own" ON customer_workout_plans USING (coach_id = auth.uid());

-- WORKOUT_LOGS (treinos realizados)
CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  workout_plan_id uuid REFERENCES workout_plans(id),
  session_id uuid REFERENCES workout_sessions(id),
  completed_at timestamptz DEFAULT now(),
  notes text
);
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON workout_logs;
CREATE POLICY "coach_own" ON workout_logs USING (coach_id = auth.uid());

-- DIET_PLANS (biblioteca de dietas)
CREATE TABLE IF NOT EXISTS diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  objective text,
  total_calories integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON diet_plans;
CREATE POLICY "coach_own" ON diet_plans USING (coach_id = auth.uid());

-- MEALS
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id uuid REFERENCES diet_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  time text,
  order_index integer DEFAULT 0
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "via_plan" ON meals;
CREATE POLICY "via_plan" ON meals USING (
  EXISTS (SELECT 1 FROM diet_plans WHERE id = diet_plan_id AND coach_id = auth.uid())
);

-- MEAL_FOODS
CREATE TABLE IF NOT EXISTS meal_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity numeric,
  unit text DEFAULT 'g',
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  order_index integer DEFAULT 0
);
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "via_meal" ON meal_foods;
CREATE POLICY "via_meal" ON meal_foods USING (
  EXISTS (
    SELECT 1 FROM meals m
    JOIN diet_plans dp ON dp.id = m.diet_plan_id
    WHERE m.id = meal_id AND dp.coach_id = auth.uid()
  )
);

-- CUSTOMER_DIET_PLANS (dieta atribuída ao aluno)
CREATE TABLE IF NOT EXISTS customer_diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  diet_plan_id uuid REFERENCES diet_plans(id) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);
ALTER TABLE customer_diet_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON customer_diet_plans;
CREATE POLICY "coach_own" ON customer_diet_plans USING (coach_id = auth.uid());

-- TRANSACTIONS (financeiro)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  consultoria_id uuid REFERENCES consultorias(id) ON DELETE SET NULL,
  type text DEFAULT 'payment', -- 'payment' | 'refund' | 'charge'
  amount numeric NOT NULL,
  status text DEFAULT 'pending', -- 'paid' | 'pending' | 'overdue' | 'refunded'
  payment_method text,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON transactions;
CREATE POLICY "coach_own" ON transactions USING (coach_id = auth.uid());

-- REVENUE_GOALS (metas mensais)
CREATE TABLE IF NOT EXISTS revenue_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  goal_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, month, year)
);
ALTER TABLE revenue_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON revenue_goals;
CREATE POLICY "coach_own" ON revenue_goals USING (coach_id = auth.uid());

-- GROUPS (grupos de alunos)
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON groups;
CREATE POLICY "coach_own" ON groups USING (coach_id = auth.uid());

-- GROUP_MEMBERS
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now()
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON group_members;
CREATE POLICY "coach_own" ON group_members USING (coach_id = auth.uid());

-- CART_RECOVERIES (carrinhos abandonados)
CREATE TABLE IF NOT EXISTS cart_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  plan_id uuid REFERENCES plans(id),
  lead_name text NOT NULL,
  lead_email text,
  lead_phone text,
  contacted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cart_recoveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON cart_recoveries;
CREATE POLICY "coach_own" ON cart_recoveries USING (coach_id = auth.uid());

-- AFFILIATES
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  email text,
  commission_percent numeric DEFAULT 10,
  link_code text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON affiliates;
CREATE POLICY "coach_own" ON affiliates USING (coach_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  consultoria_id uuid REFERENCES consultorias(id) ON DELETE SET NULL,
  type text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_own" ON notifications;
CREATE POLICY "coach_own" ON notifications USING (coach_id = auth.uid());
