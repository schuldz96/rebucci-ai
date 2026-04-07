import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Processa ~25 contatos por invocação (1 req a cada 2s = ~50s, dentro do limite de 60s)
const BATCH_PER_INVOCATION = 25;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Busca endpoint Prime de feedbacks
    const { data: endpoints } = await supabase
      .from("prime_endpoints")
      .select("*")
      .or("name.ilike.%feedback%,url.ilike.%feedback%")
      .limit(1);

    if (!endpoints || endpoints.length === 0) {
      return json({ error: "Nenhum endpoint Prime de feedbacks configurado" });
    }

    const ep = endpoints[0];
    const baseUrl = ep.url.replace(/\{\{.*?\}\}/g, "").replace(/\/+$/, "");
    const authToken = ep.auth_token || "";
    const today = new Date().toISOString().slice(0, 10);

    // Busca contatos que ainda não foram checados hoje (ou nunca)
    // Usa um campo "feedback_synced_at" para tracking, ou ordena por last_feedback ASC
    // Estratégia: busca contatos ordenados por quem tem next_feedback mais antigo/null
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, email")
      .not("email", "ilike", "%@sem-email.local")
      .order("next_feedback", { ascending: true, nullsFirst: true })
      .limit(BATCH_PER_INVOCATION);

    if (!contacts || contacts.length === 0) {
      return json({ done: true, message: "Sem contatos para processar" });
    }

    let updated = 0;
    let noFeedback = 0;
    let errors = 0;

    // Processa 1 por vez com delay de 2s
    for (const contact of contacts) {
      try {
        const feedbackUrl = `${baseUrl}/${encodeURIComponent(contact.email)}`;
        const res = await fetch(feedbackUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });

        if (!res.ok) { errors++; continue; }

        const fbJson = await res.json();
        const feedbacks = fbJson.data?.feedbacks ?? [];

        const patch: Record<string, string | null> = {};

        if (Array.isArray(feedbacks) && feedbacks.length > 0) {
          const dates: string[] = feedbacks
            .map((f: Record<string, unknown>) =>
              (f.scheduled_date as string) ?? (f.date as string) ?? ""
            )
            .filter((d: string) => d.length >= 10)
            .map((d: string) => d.slice(0, 10))
            .sort();

          if (dates.length > 0) {
            const past = dates.filter((d) => d <= today);
            const future = dates.filter((d) => d > today);
            patch.last_feedback = past.length > 0 ? past[past.length - 1] : null;
            patch.next_feedback = future.length > 0 ? future[0] : null;
          }
          updated++;
        } else {
          // Sem feedbacks — marca null para não processar de novo na próxima rodada
          // (next_feedback fica null, vai pro fim da fila na próxima ordenação)
          noFeedback++;
        }

        // Sempre atualiza para mover o contato na fila (mesmo sem feedback)
        if (Object.keys(patch).length > 0) {
          await supabase.from("contacts").update(patch).eq("id", contact.id);
        }

        // Delay 2s entre requests
        if (contact !== contacts[contacts.length - 1]) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch {
        errors++;
      }
    }

    // Log
    try {
      await supabase.from("webhook_logs").insert({
        instance_name: "prime-sync",
        event: "sync-feedbacks",
        status: "completed",
        details: JSON.stringify({
          batch: contacts.length,
          updated,
          noFeedback,
          errors,
        }),
      });
    } catch { /* silencioso */ }

    return json({
      success: true,
      batch: contacts.length,
      updated,
      noFeedback,
      errors,
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
