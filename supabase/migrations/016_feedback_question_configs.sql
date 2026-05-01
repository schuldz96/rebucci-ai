-- Configurações de perguntas do formulário de feedback por coach
CREATE TABLE IF NOT EXISTS feedback_question_configs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_index  integer NOT NULL DEFAULT 0,
  label        text NOT NULL,
  type         text NOT NULL DEFAULT 'rating', -- 'rating' | 'text' | 'number'
  unit         text,                            -- ex: 'Kg' para type=number
  has_motivo   boolean NOT NULL DEFAULT false,
  required     boolean NOT NULL DEFAULT true,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback_question_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_question_configs' AND policyname = 'coach_owns_configs'
  ) THEN
    CREATE POLICY coach_owns_configs ON feedback_question_configs
      USING (coach_id = auth.uid())
      WITH CHECK (coach_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fqc_coach ON feedback_question_configs(coach_id, order_index);
