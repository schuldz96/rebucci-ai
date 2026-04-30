-- ── Banco de exercícios do coach ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  muscle_group text,
  description text,
  video_url text,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exercises_coach ON exercises;
CREATE POLICY exercises_coach ON exercises USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- ── Sessões de treino (Treino A, B, C...) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id uuid REFERENCES workout_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workout_sessions_coach ON workout_sessions;
CREATE POLICY workout_sessions_coach ON workout_sessions USING (
  EXISTS (SELECT 1 FROM workout_plans w WHERE w.id = workout_plan_id AND w.coach_id = auth.uid())
);

-- ── Exercícios dentro de uma sessão ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  name text NOT NULL,
  sets integer DEFAULT 3,
  reps text DEFAULT '10',
  rest_seconds integer DEFAULT 60,
  weight_kg numeric,
  video_url text,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_exercises_coach ON session_exercises;
CREATE POLICY session_exercises_coach ON session_exercises USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    JOIN workout_plans w ON w.id = ws.workout_plan_id
    WHERE ws.id = session_id AND w.coach_id = auth.uid()
  )
);

-- ── Alimentos (banco de alimentos do coach) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  quantity numeric DEFAULT 100,
  unit text DEFAULT 'g',
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foods_coach ON foods;
CREATE POLICY foods_coach ON foods USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- ── Refeições dentro de um plano de dieta ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id uuid REFERENCES diet_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  time_suggestion text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meals_coach ON meals;
CREATE POLICY meals_coach ON meals USING (
  EXISTS (SELECT 1 FROM diet_plans d WHERE d.id = diet_plan_id AND d.coach_id = auth.uid())
);

-- ── Alimentos dentro de uma refeição ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric DEFAULT 100,
  unit text DEFAULT 'g',
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meal_foods_coach ON meal_foods;
CREATE POLICY meal_foods_coach ON meal_foods USING (
  EXISTS (
    SELECT 1 FROM meals m
    JOIN diet_plans d ON d.id = m.diet_plan_id
    WHERE m.id = meal_id AND d.coach_id = auth.uid()
  )
);
