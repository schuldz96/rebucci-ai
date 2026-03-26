-- ============================================================
-- IDs numéricos curtos: deals = 8 dígitos, contacts = 6 dígitos
-- (substituído pela migration 005 que também migra dados existentes)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_numeric_id(len int, tbl text, col text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  taken  boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..len LOOP
      result := result || floor(random() * 10)::int::text;
    END LOOP;
    result := (floor(random() * 9) + 1)::int::text || substr(result, 2);
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1)', tbl, col)
      INTO taken USING result;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE deals    ALTER COLUMN id SET DEFAULT generate_numeric_id(8, 'deals',    'id');
ALTER TABLE contacts ALTER COLUMN id SET DEFAULT generate_numeric_id(6, 'contacts', 'id');
