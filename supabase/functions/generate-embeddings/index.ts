import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 25;
const MAX_BATCHES_TOTAL = 160;

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
    const results: Record<string, Record<string, unknown>> = {};

    for (const baseName of bases) {
      if (batchesUsed >= MAX_BATCHES_TOTAL) break;

      const { count: total } = await supabase
        .from("rag_chunks")
        .select("id", { count: "exact", head: true })
        .eq("instance_name", baseName);

      const totalChunks = total ?? 0;
      let baseProcessed = 0;

      while (batchesUsed < MAX_BATCHES_TOTAL) {
        // Fetch via REST direto (contorna bugs do Supabase JS client com pgvector)
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_pending_chunks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
          },
          body: JSON.stringify({ base_name: baseName, batch_limit: BATCH_SIZE }),
        });

        if (!rpcRes.ok) {
          const errText = await rpcRes.text();
          await setStatus(supabase, baseName, totalChunks, "error", `Fetch RPC ${rpcRes.status}: ${errText.slice(0, 200)}`);
          break;
        }

        const chunks: { id: string; content: string }[] = await rpcRes.json();

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

        // Marca inválidos via update individual
        if (invalidIds.length > 0) {
          const now = new Date().toISOString();
          const zeroEmb = JSON.stringify(Array(1536).fill(0));
          for (const id of invalidIds) {
            await fetch(`${supabaseUrl}/rest/v1/rag_chunks?id=eq.${id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "apikey": supabaseServiceKey,
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({ embedding: zeroEmb, embedded_at: now }),
            });
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

        // Update individual via REST (cada update = transação separada, sem timeout)
        const now = new Date().toISOString();
        let updateFailed = false;
        // Processa 5 em paralelo para velocidade sem sobrecarregar
        for (let u = 0; u < valid.length; u += 5) {
          const batch = valid.slice(u, u + 5);
          const results = await Promise.all(batch.map((chunk, idx) =>
            fetch(`${supabaseUrl}/rest/v1/rag_chunks?id=eq.${chunk.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "apikey": supabaseServiceKey,
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({
                embedding: JSON.stringify(embeddings[u + idx]),
                embedded_at: now,
              }),
            })
          ));
          const failed = results.find((r) => !r.ok);
          if (failed) {
            const errText = await failed.text();
            await setStatus(supabase, baseName, totalChunks, "error", `Update ${failed.status}: ${errText.slice(0, 200)}`);
            updateFailed = true;
            break;
          }
        }
        if (updateFailed) break;

        baseProcessed += chunks.length;
        batchesUsed++;
        await setStatus(supabase, baseName, totalChunks, "processing");
      }

      const { count: embNow } = await supabase.from("rag_chunks").select("id", { count: "exact", head: true }).eq("instance_name", baseName).not("embedded_at", "is", null);
      results[baseName] = { processed: baseProcessed, total: totalChunks, embedded: embNow ?? 0, status: baseProcessed > 0 ? "ok" : "skipped" };
    }

    return json({ results, batches_used: batchesUsed, v: "v12-patch" });
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
    .not("embedded_at", "is", null);

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
