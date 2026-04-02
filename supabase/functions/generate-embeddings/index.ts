import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 100;
const MAX_BATCHES_TOTAL = 40;

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

    let targetBase: string | null = null;
    try {
      const body = await req.json();
      targetBase = body?.instance_name ?? null;
    } catch { /* body vazio ok */ }

    let bases: string[] = [];
    if (targetBase) {
      bases = [targetBase];
    } else {
      const { data: pending } = await supabase
        .from("vectorstore_status")
        .select("instance_name")
        .eq("status", "processing");
      if (!pending || pending.length === 0) {
        return json({ done: true, message: "Nenhuma base pendente" });
      }
      bases = pending.map((p: { instance_name: string }) => p.instance_name);
    }

    const { data: tokenRow } = await supabase
      .from("api_tokens")
      .select("token")
      .ilike("provider", "openai")
      .limit(1)
      .maybeSingle();

    if (!tokenRow?.token) {
      return json({ error: "Token OpenAI não encontrado" });
    }

    let batchesUsed = 0;
    const results: Record<string, { processed: number; total: number; embedded: number; status: string }> = {};

    for (const baseName of bases) {
      if (batchesUsed >= MAX_BATCHES_TOTAL) break;

      const { count: total } = await supabase
        .from("rag_chunks")
        .select("id", { count: "exact", head: true })
        .eq("instance_name", baseName);

      const totalChunks = total ?? 0;
      let baseProcessed = 0;

      while (batchesUsed < MAX_BATCHES_TOTAL) {
        const { data: chunks, error: fetchErr } = await supabase
          .from("rag_chunks")
          .select("id, content")
          .eq("instance_name", baseName)
          .is("embedding", null)
          .limit(BATCH_SIZE);

        if (fetchErr) {
          await setStatus(supabase, baseName, totalChunks, "error", `Fetch: ${fetchErr.message}`);
          break;
        }

        if (!chunks || chunks.length === 0) {
          await setStatus(supabase, baseName, totalChunks, "done");
          break;
        }

        // Separa válidos dos inválidos
        const valid: { id: string; content: string }[] = [];
        const invalidIds: string[] = [];
        for (const c of chunks) {
          if (c.content && c.content.trim().length > 0) {
            valid.push(c);
          } else {
            invalidIds.push(c.id);
          }
        }

        // Marca inválidos via RPC batch
        if (invalidIds.length > 0) {
          const now = new Date().toISOString();
          const zeroEmb = JSON.stringify(Array(1536).fill(0));
          const { error: rpcErr } = await supabase.rpc("batch_update_embeddings", {
            chunk_ids: invalidIds,
            chunk_embeddings: invalidIds.map(() => zeroEmb),
            ts: now,
          });
          if (rpcErr) {
            await setStatus(supabase, baseName, totalChunks, "error", `RPC invalid: ${rpcErr.message}`);
            break;
          }
          baseProcessed += invalidIds.length;
        }

        if (valid.length === 0) {
          batchesUsed++;
          await setStatus(supabase, baseName, totalChunks, "processing");
          continue;
        }

        // OpenAI Embeddings
        const inputs = valid.map((c) => c.content.slice(0, 6000));
        const oaRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
          body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
        });

        if (!oaRes.ok) {
          const errJson = await oaRes.json().catch(() => ({}));
          const errMsg = `OpenAI ${oaRes.status}: ${JSON.stringify(errJson).slice(0, 300)}`;
          const isQuota = oaRes.status === 429 || oaRes.status === 402 ||
            JSON.stringify(errJson).includes("insufficient_quota") ||
            JSON.stringify(errJson).includes("rate_limit");

          if (isQuota) {
            for (const b of bases) {
              const { count: bTotal } = await supabase.from("rag_chunks").select("id", { count: "exact", head: true }).eq("instance_name", b);
              await setStatus(supabase, b, bTotal ?? 0, "paused", `Pausado: ${errMsg}`);
            }
            return json({ paused: true, error: errMsg });
          }

          await setStatus(supabase, baseName, totalChunks, "error", errMsg);
          break;
        }

        const oaJson = await oaRes.json();
        const embeddings: number[][] = oaJson.data.map((d: { embedding: number[] }) => d.embedding);

        // Batch update via RPC (evita statement timeout do PostgREST)
        const now = new Date().toISOString();
        const { error: rpcErr } = await supabase.rpc("batch_update_embeddings", {
          chunk_ids: valid.map((c) => c.id),
          chunk_embeddings: embeddings.map((e) => JSON.stringify(e)),
          ts: now,
        });

        if (rpcErr) {
          await setStatus(supabase, baseName, totalChunks, "error", `RPC: ${rpcErr.message}`);
          break;
        }

        baseProcessed += chunks.length;
        batchesUsed++;
        await setStatus(supabase, baseName, totalChunks, "processing");
      }

      const { count: embNow } = await supabase.from("rag_chunks").select("id", { count: "exact", head: true }).eq("instance_name", baseName).not("embedding", "is", null);
      results[baseName] = { processed: baseProcessed, total: totalChunks, embedded: embNow ?? 0, status: baseProcessed > 0 ? "ok" : "skipped" };
    }

    return json({ results, batches_used: batchesUsed });
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
  const { count: embNow } = await supabase
    .from("rag_chunks")
    .select("id", { count: "exact", head: true })
    .eq("instance_name", instance_name)
    .not("embedding", "is", null);

  await supabase.from("vectorstore_status").upsert(
    {
      instance_name,
      total_chunks,
      embedded: embNow ?? 0,
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
