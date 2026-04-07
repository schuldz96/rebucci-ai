import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cleanPhone(p: string): string {
  let d = p.replace(/\D/g, "");

  // DDI duplicado: 5555... (BR), 351351... (PT), 4444... (UK)
  if (d.startsWith("5555") && d.length > 13) d = d.slice(2);
  if (d.startsWith("351351") && d.length > 14) d = d.slice(3);
  if (d.startsWith("4444") && d.length > 12) d = d.slice(2);

  // DDD duplicado sem DDI: 6161..., 2121..., etc.
  const ddd2 = d.slice(0, 2);
  const ddd4 = d.slice(2, 4);
  if (ddd2 === ddd4 && !d.startsWith("55") && !d.startsWith("351") && !d.startsWith("44") && d.length >= 12) {
    d = `55${d.slice(2)}`;
  }

  // BR sem DDI 55 (10-12 dígitos começando com DDD válido 11-99)
  if (!d.startsWith("55") && !d.startsWith("351") && !d.startsWith("44") && d.length >= 10 && d.length <= 12) {
    const possibleDdd = parseInt(d.slice(0, 2), 10);
    if (possibleDdd >= 11 && possibleDdd <= 99) d = `55${d}`;
  }

  // Ainda longo demais: tenta remover DDI duplicado genérico
  if (d.startsWith("55") && d.length > 13) d = d.slice(2);

  return d;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", Aacute: "Á", agrave: "à", Agrave: "À", atilde: "ã", Atilde: "Ã", acirc: "â", Acirc: "Â", auml: "ä",
  eacute: "é", Eacute: "É", egrave: "è", ecirc: "ê", Ecirc: "Ê", euml: "ë",
  iacute: "í", Iacute: "Í", igrave: "ì", icirc: "î", iuml: "ï",
  oacute: "ó", Oacute: "Ó", ograve: "ò", otilde: "õ", Otilde: "Õ", ocirc: "ô", Ocirc: "Ô", ouml: "ö",
  uacute: "ú", Uacute: "Ú", ugrave: "ù", ucirc: "û", uuml: "ü", Uuml: "Ü",
  ccedil: "ç", Ccedil: "Ç", ntilde: "ñ", Ntilde: "Ñ",
};

function decodeHtml(str: string): string {
  return str
    .replace(/&(#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g, (_, __, dec, hex, name) => {
      if (dec) return String.fromCharCode(parseInt(dec, 10));
      if (hex) return String.fromCharCode(parseInt(hex, 16));
      return HTML_ENTITIES[name] ?? `&${name};`;
    });
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
    // Lock: se última execução foi < 60s atrás, skip
    const { data: lastRun } = await supabase
      .from("webhook_logs")
      .select("created_at")
      .eq("instance_name", "prime-sync")
      .eq("event", "sync-contacts")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRun) {
      const elapsed = Date.now() - new Date(lastRun.created_at).getTime();
      if (elapsed < 60000) {
        return json({ skipped: true, reason: "Já existe uma execução recente" });
      }
    }

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
      const phone = cleanPhone(item.customer.phone);
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
