-- ── Perguntas personalizadas de anamnese ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS anamnesis_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'text', -- text, textarea, select, scale, yesno, number
  options text[],
  sort_order integer DEFAULT 0,
  required boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE anamnesis_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anamnesis_questions_coach ON anamnesis_questions;
CREATE POLICY anamnesis_questions_coach ON anamnesis_questions
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- ── Tokens públicos de anamnese ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anamnesis_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE anamnesis_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anamnesis_tokens_coach ON anamnesis_tokens;
CREATE POLICY anamnesis_tokens_coach ON anamnesis_tokens
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
DROP POLICY IF EXISTS anamnesis_tokens_public ON anamnesis_tokens;
CREATE POLICY anamnesis_tokens_public ON anamnesis_tokens
  FOR SELECT USING (true);

-- ── Configurações de anamnese do coach ────────────────────────────────────────
ALTER TABLE coach_settings
  ADD COLUMN IF NOT EXISTS anamnesis_mode text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS anamnesis_categories jsonb DEFAULT '["habVida","habSono","saude","atividadeFisica"]'::jsonb;
