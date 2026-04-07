import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Busca contatos com email válido (paginado)
    const contacts: { id: string; email: string }[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("contacts")
        .select("id, email")
        .not("email", "ilike", "%@sem-email.local")
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      contacts.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }

    const today = new Date().toISOString().slice(0, 10);
    let updated = 0;
    let noFeedback = 0;
    let errors = 0;

    // Processa em paralelo (10 de cada vez para não sobrecarregar a API)
    const PARALLEL = 10;
    for (let i = 0; i < contacts.length; i += PARALLEL) {
      const batch = contacts.slice(i, i + PARALLEL);

      const results = await Promise.allSettled(batch.map(async (contact) => {
        try {
          const feedbackUrl = `${baseUrl}/${encodeURIComponent(contact.email)}`;
          const res = await fetch(feedbackUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
          });

          if (!res.ok) return null;

          const fbJson = await res.json();
          const feedbacks = fbJson.data?.feedbacks ?? fbJson.feedbacks ?? fbJson.data ?? [];
          if (!Array.isArray(feedbacks) || feedbacks.length === 0) return null;

          // Extrai datas dos feedbacks (campo = scheduled_date)
          const dates: string[] = feedbacks
            .map((f: Record<string, unknown>) =>
              (f.scheduled_date as string) ?? (f.date as string) ?? (f.feedback_date as string) ?? ""
            )
            .filter((d: string) => d.length >= 10)
            .map((d: string) => d.slice(0, 10))
            .sort();

          if (dates.length === 0) return null;

          // Último feedback: maior data ≤ hoje
          const past = dates.filter((d) => d <= today);
          const lastFeedback = past.length > 0 ? past[past.length - 1] : null;

          // Próximo feedback: menor data > hoje
          const future = dates.filter((d) => d > today);
          const nextFeedback = future.length > 0 ? future[0] : null;

          // Atualiza contato
          const patch: Record<string, string | null> = {};
          if (lastFeedback) patch.last_feedback = lastFeedback;
          if (nextFeedback) patch.next_feedback = nextFeedback;

          if (Object.keys(patch).length > 0) {
            await supabase.from("contacts").update(patch).eq("id", contact.id);
            return "updated";
          }
          return null;
        } catch {
          return "error";
        }
      }));

      for (const r of results) {
        if (r.status === "fulfilled") {
          if (r.value === "updated") updated++;
          else if (r.value === "error") errors++;
          else noFeedback++;
        } else {
          errors++;
        }
      }
    }

    // Log
    try {
      await supabase.from("webhook_logs").insert({
        instance_name: "prime-sync",
        event: "sync-feedbacks",
        status: "completed",
        details: JSON.stringify({ total: contacts.length, updated, noFeedback, errors }),
      });
    } catch { /* silencioso */ }

    return json({ success: true, total: contacts.length, updated, noFeedback, errors });
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
