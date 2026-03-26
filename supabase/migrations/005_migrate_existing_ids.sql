-- ============================================================
-- Migrar IDs existentes de deals e contacts para IDs curtos
-- deals  → 8 caracteres
-- contacts → 6 caracteres
-- ============================================================

-- Garante que a função já existe (idempotente)
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

-- ── Migrar deals existentes ───────────────────────────────────
DO $$
DECLARE
  r RECORD;
  new_id text;
BEGIN
  FOR r IN
    SELECT id FROM deals WHERE length(id) > 8
  LOOP
    new_id := generate_short_id(8, 'deals', 'id');

    -- Atualizar FK em outras tabelas se houver
    UPDATE deals SET id = new_id WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── Migrar contacts existentes ────────────────────────────────
DO $$
DECLARE
  r RECORD;
  new_id text;
BEGIN
  FOR r IN
    SELECT id FROM contacts WHERE length(id) > 6
  LOOP
    new_id := generate_short_id(6, 'contacts', 'id');

    -- Atualizar FK em deals que referenciam este contato
    UPDATE deals SET contact_id = new_id WHERE contact_id = r.id;

    UPDATE contacts SET id = new_id WHERE id = r.id;
  END LOOP;
END;
$$;

-- Confirmar defaults para novos registros
ALTER TABLE deals    ALTER COLUMN id SET DEFAULT generate_short_id(8, 'deals',    'id');
ALTER TABLE contacts ALTER COLUMN id SET DEFAULT generate_short_id(6, 'contacts', 'id');
