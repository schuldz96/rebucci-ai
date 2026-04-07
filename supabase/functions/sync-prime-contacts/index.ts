import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripPhone(p: string): string {
  return p.replace(/\D/g, "");
}

function decodeHtml(str: string): string {
  return str
    .replace(/&iacute;/g, "í").replace(/&ccedil;/g, "ç").replace(/&atilde;/g, "ã")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú").replace(/&agrave;/g, "à").replace(/&ecirc;/g, "ê")
    .replace(/&ocirc;/g, "ô").replace(/&uuml;/g, "ü").replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

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
    // Busca endpoint Prime configurado
    const { data: endpoints } = await supabase
      .from("prime_endpoints")
      .select("*")
      .or("name.ilike.%active%,name.ilike.%customer%,name.ilike.%contato%,name.ilike.%sync%,url.ilike.%active%")
      .limit(1);

    if (!endpoints || endpoints.length === 0) {
      return json({ error: "Nenhum endpoint Prime de clientes ativos configurado" });
    }

    const ep = endpoints[0];
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ep.auth_token) headers["Authorization"] = `Bearer ${ep.auth_token}`;

    // Chama API Prime
    const primeRes = await fetch(ep.url, { method: ep.method || "GET", headers });
    if (!primeRes.ok) {
      return json({ error: `Prime API ${primeRes.status}` });
    }

    const primeJson = await primeRes.json();
    if (!primeJson.success || !primeJson.data?.customers) {
      return json({ error: "Resposta da Prime inválida" });
    }

    const customers = primeJson.data.customers as {
      customer: { id: number; name: string; email: string; phone: string };
      plan: { id: number; name: string; start_date: string; expiration_date: string };
    }[];

    const today = new Date().toISOString().slice(0, 10);

    // Prepara todos os contatos para upsert
    const seen = new Set<string>(); // deduplica por phone
    const contacts: {
      name: string; email: string; phone: string; company: string;
      status: string; activation_date: string | null; end_date: string | null;
    }[] = [];

    for (const item of customers) {
      const phone = stripPhone(item.customer.phone);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);

      const email = (item.customer.email || "").toLowerCase().trim() || `${phone}@sem-email.local`;
      const name = decodeHtml(item.customer.name || "").trim() || "Sem nome";
      const isActive = item.plan.expiration_date >= today;

      contacts.push({
        name,
        email,
        phone,
        company: item.plan.name || "",
        status: isActive ? "active" : "inactive",
        activation_date: item.plan.start_date || null,
        end_date: item.plan.expiration_date || null,
      });
    }

    // Upsert em batches de 500 (ON CONFLICT phone → atualiza)
    let created = 0;
    let updated = 0;
    let errors = 0;
    const BATCH = 500;

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      const { error: upsertErr, count } = await supabase
        .from("contacts")
        .upsert(batch, { onConflict: "phone", ignoreDuplicates: false, count: "exact" });

      if (upsertErr) {
        // Se upsert falha (emails duplicados cross-phone), tenta individual
        for (const c of batch) {
          const { error: singleErr } = await supabase
            .from("contacts")
            .upsert(c, { onConflict: "phone", ignoreDuplicates: false });
          if (singleErr) errors++;
          else created++;
        }
      } else {
        created += count ?? batch.length;
      }
    }

    // Log
    try {
      await supabase.from("webhook_logs").insert({
        instance_name: "prime-sync",
        event: "sync-contacts",
        status: "completed",
        details: JSON.stringify({ total: customers.length, unique: contacts.length, created, errors }),
      });
    } catch { /* silencioso */ }

    return json({ success: true, total: customers.length, unique: contacts.length, synced: created, errors });
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
