-- Função para atualizar embeddings em batch (evita statement timeout do PostgREST)
CREATE OR REPLACE FUNCTION batch_update_embeddings(
  chunk_ids uuid[],
  chunk_embeddings text[],
  ts text DEFAULT now()::text
)
RETURNS integer AS $$
DECLARE
  updated integer := 0;
BEGIN
  FOR i IN 1..array_length(chunk_ids, 1) LOOP
    UPDATE rag_chunks
    SET embedding = chunk_embeddings[i],
        embedded_at = ts::timestamptz
    WHERE id = chunk_ids[i];
    updated := updated + 1;
  END LOOP;
  RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
