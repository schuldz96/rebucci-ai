-- Adiciona colunas que podem estar faltando na tabela plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS modality text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS includes text[];
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS upsell_enabled boolean DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS upsell_product_id uuid REFERENCES plans(id);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS auto_schedule_feedbacks boolean DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS feedback_frequency_days integer DEFAULT 14;
