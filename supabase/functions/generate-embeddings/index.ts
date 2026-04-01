import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 50;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lê instance_name do body (opcional — se não fornecido, busca qualquer base pendente)
    let instance_name: string | null = null;
    try {
      const body = await req.json();
      instance_name = body?.instance_name ?? null;
    } catch { /* body vazio ok */ }

    // Se não veio instance_name, busca a próxima base com status "processing"
    if (!instance_name) {
      const { data: pending } = await supabase
        .from("vectorstore_status")
        .select("instance_name")
        .eq("status", "processing")
        .limit(1)
        .maybeSingle();

      if (!pending) {
        // Nada a processar
        return json({ done: true, message: "Nenhuma base pendente" });
      }
      instance_name = pending.instance_name;
    }

    // Busca token OpenAI
    const { data: tokenRow } = await supabase
      .from("api_tokens")
      .select("token")
      .ilike("provider", "openai")
      .limit(1)
      .maybeSingle();

    if (!tokenRow?.token) {
      return json({ error: "Token OpenAI não encontrado" });
    }

    // Conta total e já embeddados
    const { count: total } = await supabase
      .from("rag_chunks")
      .select("id", { count: "exact", head: true })
      .eq("instance_name", instance_name);

    const { count: alreadyDone } = await supabase
      .from("rag_chunks")
      .select("id", { count: "exact", head: true })
      .eq("instance_name", instance_name)
      .not("embedding", "is", null);

    const totalChunks = total ?? 0;
    const embedded = alreadyDone ?? 0;

    // Busca próximo lote sem embedding
    const { data: chunks, error: fetchErr } = await supabase
      .from("rag_chunks")
      .select("id, content")
      .eq("instance_name", instance_name)
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (fetchErr) {
      await supabase.from("vectorstore_status").upsert(
        { instance_name, status: "error", error_message: fetchErr.message, updated_at: new Date().toISOString() },
        { onConflict: "instance_name" }
      );
      return json({ error: fetchErr.message });
    }

    // Sem mais chunks pendentes — concluído
    if (!chunks || chunks.length === 0) {
      await supabase.from("vectorstore_status").upsert(
        { instance_name, total_chunks: totalChunks, embedded: totalChunks, status: "done", updated_at: new Date().toISOString() },
        { onConflict: "instance_name" }
      );
      return json({ done: true, total: totalChunks, embedded: totalChunks });
    }

    // Chama OpenAI Embeddings para o lote
    const inputs = chunks.map((c) => c.content.slice(0, 6000));
    const oaRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
    });

    if (!oaRes.ok) {
      const errJson = await oaRes.json().catch(() => ({}));
      const errMsg = `OpenAI ${oaRes.status}: ${JSON.stringify(errJson).slice(0, 300)}`;
      await supabase.from("vectorstore_status").upsert(
        { instance_name, status: "error", error_message: errMsg, updated_at: new Date().toISOString() },
        { onConflict: "instance_name" }
      );
      return json({ error: errMsg });
    }

    const oaJson = await oaRes.json();
    const embeddings: number[][] = oaJson.data.map((d: { embedding: number[] }) => d.embedding);

    // Salva embeddings no banco
    const now = new Date().toISOString();
    await Promise.all(
      chunks.map((chunk, i) =>
        supabase
          .from("rag_chunks")
          .update({ embedding: JSON.stringify(embeddings[i]), embedded_at: now })
          .eq("id", chunk.id)
      )
    );

    const newEmbedded = embedded + chunks.length;
    const remaining = totalChunks - newEmbedded;

    // Atualiza status — pg_cron vai chamar novamente se ainda houver pendentes
    await supabase.from("vectorstore_status").upsert(
      {
        instance_name,
        total_chunks: totalChunks,
        embedded: newEmbedded,
        status: remaining <= 0 ? "done" : "processing",
        updated_at: now,
      },
      { onConflict: "instance_name" }
    );

    return json({
      done: remaining <= 0,
      processed: chunks.length,
      embedded: newEmbedded,
      total: totalChunks,
      remaining: Math.max(0, remaining),
    });
  } catch (err) {
    return json({ error: String(err) });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
