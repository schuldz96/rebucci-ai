-- Grupos alimentares por coach
CREATE TABLE IF NOT EXISTS food_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'food_groups' AND policyname = 'food_groups_coach') THEN
    CREATE POLICY food_groups_coach ON food_groups USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_food_groups_coach ON food_groups(coach_id);

-- Novos campos na tabela foods
ALTER TABLE foods ADD COLUMN IF NOT EXISTS description  text;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS food_group_id uuid REFERENCES food_groups(id) ON DELETE SET NULL;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS fiber        numeric DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS language     text    DEFAULT 'pt';
