-- ============================================================
-- IDs numéricos curtos: deals = 8 dígitos, contacts = 6 dígitos
-- Migra registros existentes e define defaults para novos
-- ============================================================

-- Função geradora de ID numérico único
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
    -- Evita começar com zero
    result := (floor(random() * 9) + 1)::int::text || substr(result, 2);
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1)', tbl, col)
      INTO taken USING result;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN result;
END;
$$;

-- ── Migrar deals existentes (IDs que não são 8 dígitos numéricos) ──
DO $$
DECLARE
  r      RECORD;
  new_id text;
BEGIN
  FOR r IN
    SELECT id FROM deals WHERE id !~ '^\d{8}$'
  LOOP
    new_id := generate_numeric_id(8, 'deals', 'id');
    UPDATE deals SET id = new_id WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── Migrar contacts existentes (IDs que não são 6 dígitos numéricos) ──
DO $$
DECLARE
  r      RECORD;
  new_id text;
BEGIN
  FOR r IN
    SELECT id FROM contacts WHERE id !~ '^\d{6}$'
  LOOP
    new_id := generate_numeric_id(6, 'contacts', 'id');
    -- Mantém FK em deals consistente
    UPDATE deals SET contact_id = new_id WHERE contact_id = r.id;
    UPDATE contacts SET id = new_id WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── Defaults para novos registros ──────────────────────────────
ALTER TABLE deals    ALTER COLUMN id SET DEFAULT generate_numeric_id(8, 'deals',    'id');
ALTER TABLE contacts ALTER COLUMN id SET DEFAULT generate_numeric_id(6, 'contacts', 'id');
