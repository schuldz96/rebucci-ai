-- ============================================================
-- IDs curtos únicos para deals (8 chars) e contacts (6 chars)
-- Caracteres: sem 0/O/I/l para evitar confusão visual
-- ============================================================

CREATE OR REPLACE FUNCTION generate_short_id(len int, tbl text, col text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text;
  taken  boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..len LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1)', tbl, col)
      INTO taken USING result;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN result;
END;
$$;

-- Aplicar nos defaults
ALTER TABLE deals    ALTER COLUMN id SET DEFAULT generate_short_id(8, 'deals',    'id');
ALTER TABLE contacts ALTER COLUMN id SET DEFAULT generate_short_id(6, 'contacts', 'id');
