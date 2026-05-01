CREATE TABLE IF NOT EXISTS consultoria_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consultoria_id uuid REFERENCES consultorias(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consultoria_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_owns_consultoria_addons" ON consultoria_addons
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
