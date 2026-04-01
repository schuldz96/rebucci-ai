import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 200;
const MAX_BATCHES_PER_CALL = 5; // Processa até 1000 chunks por invocação (~50s)

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

    let instance_name: string | null = null;
    try {
      const body = await req.json();
      instance_name = body?.instance_name ?? null;
    } catch { /* body vazio ok */ }

    // Busca todas as bases com status "processing" (processa múltiplas)
    if (!instance_name) {
      const { data: pending } = await supabase
        .from("vectorstore_status")
        .select("instance_name")
        .eq("status", "processing")
        .limit(1)
        .maybeSingle();

      if (!pending) {
        return json({ done: true, message: "Nenhuma base pendente" });
      }
      instance_name = pending.instance_name;
    }

    // Verifica se está pausado — não processa
    const { data: statusRow } = await supabase
      .from("vectorstore_status")
      .select("status")
      .eq("instance_name", instance_name)
      .maybeSingle();

    if (statusRow?.status === "paused") {
      return json({ paused: true, message: "Base pausada. Use 'Continuar' para retomar." });
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

    // Conta total
    const { count: total } = await supabase
      .from("rag_chunks")
      .select("id", { count: "exact", head: true })
      .eq("instance_name", instance_name);

    const totalChunks = total ?? 0;
    let totalProcessed = 0;

    // Loop: processa múltiplos batches por chamada
    for (let batch = 0; batch < MAX_BATCHES_PER_CALL; batch++) {
      // Busca próximo lote sem embedding
      const { data: chunks, error: fetchErr } = await supabase
        .from("rag_chunks")
        .select("id, content")
        .eq("instance_name", instance_name)
        .is("embedding", null)
        .limit(BATCH_SIZE);

      if (fetchErr) {
        await setStatus(supabase, instance_name, totalChunks, "error", fetchErr.message);
        return json({ error: fetchErr.message });
      }

      // Sem mais chunks — concluído
      if (!chunks || chunks.length === 0) {
        await setStatus(supabase, instance_name, totalChunks, "done");
        return json({ done: true, total: totalChunks, processed: totalProcessed });
      }

      // Chama OpenAI Embeddings
      const inputs = chunks.map((c) => c.content.slice(0, 6000));
      const oaRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
        body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
      });

      if (!oaRes.ok) {
        const errJson = await oaRes.json().catch(() => ({}));
        const errMsg = `OpenAI ${oaRes.status}: ${JSON.stringify(errJson).slice(0, 300)}`;

        // Rate limit (429) ou quota (402/429 insufficient_quota) → PAUSA em vez de erro
        const isQuota = oaRes.status === 429 || oaRes.status === 402 ||
          JSON.stringify(errJson).includes("insufficient_quota") ||
          JSON.stringify(errJson).includes("rate_limit");

        if (isQuota) {
          await setStatus(supabase, instance_name, totalChunks, "paused", `Pausado: ${errMsg}`);
          return json({ paused: true, processed: totalProcessed, error: errMsg });
        }

        await setStatus(supabase, instance_name, totalChunks, "error", errMsg);
        return json({ error: errMsg, processed: totalProcessed });
      }

      const oaJson = await oaRes.json();
      const embeddings: number[][] = oaJson.data.map((d: { embedding: number[] }) => d.embedding);

      // Salva embeddings no banco (parallel)
      const now = new Date().toISOString();
      await Promise.all(
        chunks.map((chunk, i) =>
          supabase
            .from("rag_chunks")
            .update({ embedding: JSON.stringify(embeddings[i]), embedded_at: now })
            .eq("id", chunk.id)
        )
      );

      totalProcessed += chunks.length;

      // Atualiza progresso
      const { count: embeddedNow } = await supabase
        .from("rag_chunks")
        .select("id", { count: "exact", head: true })
        .eq("instance_name", instance_name)
        .not("embedding", "is", null);

      const embedded = embeddedNow ?? 0;
      const remaining = totalChunks - embedded;

      await supabase.from("vectorstore_status").upsert(
        {
          instance_name,
          total_chunks: totalChunks,
          embedded,
          status: remaining <= 0 ? "done" : "processing",
          updated_at: now,
        },
        { onConflict: "instance_name" }
      );

      if (remaining <= 0) {
        return json({ done: true, total: totalChunks, processed: totalProcessed });
      }
    }

    return json({ done: false, processed: totalProcessed, total: totalChunks });
  } catch (err) {
    return json({ error: String(err) });
  }
});

async function setStatus(
  supabase: ReturnType<typeof createClient>,
  instance_name: string,
  total_chunks: number,
  status: string,
  error_message?: string,
) {
  const { count: embeddedNow } = await supabase
    .from("rag_chunks")
    .select("id", { count: "exact", head: true })
    .eq("instance_name", instance_name)
    .not("embedding", "is", null);

  await supabase.from("vectorstore_status").upsert(
    {
      instance_name,
      total_chunks,
      embedded: embeddedNow ?? 0,
      status,
      error_message: error_message ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "instance_name" }
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
