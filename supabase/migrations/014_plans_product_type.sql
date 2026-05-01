ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_category text DEFAULT 'principal';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS platform text DEFAULT 'manual';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS external_product_id text;
