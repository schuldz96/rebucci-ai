/**
 * Migra IDs de contacts (6 dígitos) e deals (8 dígitos).
 * Lógica segura: INSERT → valida → DELETE antigo.
 * Em caso de falha no INSERT, mantém o registro antigo intacto.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://urrbpxrtdzurfdsucukb.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmJweHJ0ZHp1cmZkc3VjdWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4Nzg3NSwiZXhwIjoyMDg5OTYzODc1fQ.cygbRECDzUrJ0fUDGiGqC_FSZDb6QupoZ7g8N3RcyfM";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const usedIds = new Set();

function genId(len) {
  let id;
  do {
    const first = Math.floor(Math.random() * 9) + 1;
    let rest = "";
    for (let i = 1; i < len; i++) rest += Math.floor(Math.random() * 10);
    id = `${first}${rest}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

const isShortNumeric = (id, len) => new RegExp(`^\\d{${len}}$`).test(id);

async function run() {
  console.log("✓ Usando service role\n");

  // ── Contacts ─────────────────────────────────────────────
  const { data: contacts, error: cErr } = await supabase.from("contacts").select("*");
  if (cErr) { console.error("Erro contacts:", cErr.message); process.exit(1); }

  contacts.filter(c => isShortNumeric(c.id, 6)).forEach(c => usedIds.add(c.id));
  const oldContacts = contacts.filter(c => !isShortNumeric(c.id, 6));
  console.log(`Contacts a migrar: ${oldContacts.length}`);

  const contactIdMap = {};
  const migratedContactIds = [];

  for (const c of oldContacts) {
    const newId = genId(6);
    const { id: _id, ...rest } = c;
    const { error } = await supabase.from("contacts").insert({ ...rest, id: newId });
    if (error) {
      console.error(`  ✗ Contact ${c.id} → falhou: ${error.message} (mantendo original)`);
      continue;
    }
    contactIdMap[c.id] = newId;
    migratedContactIds.push(c.id);
    console.log(`  ✓ Contact: ${c.id} → ${newId} (${c.name})`);
  }

  // ── Deals ─────────────────────────────────────────────────
  const { data: deals, error: dErr } = await supabase.from("deals").select("*");
  if (dErr) { console.error("Erro deals:", dErr.message); process.exit(1); }

  deals.filter(d => isShortNumeric(d.id, 8)).forEach(d => usedIds.add(d.id));
  const oldDeals = deals.filter(d => !isShortNumeric(d.id, 8));
  console.log(`\nDeals a migrar: ${oldDeals.length}`);

  const migratedDealIds = [];

  for (const d of oldDeals) {
    const newId = genId(8);
    const newContactId = d.contact_id ? (contactIdMap[d.contact_id] ?? d.contact_id) : null;
    const { id: _id, ...rest } = d;
    const { error } = await supabase.from("deals").insert({ ...rest, id: newId, contact_id: newContactId });
    if (error) {
      console.error(`  ✗ Deal ${d.id} → falhou: ${error.message} (mantendo original)`);
      continue;
    }
    migratedDealIds.push(d.id);
    console.log(`  ✓ Deal: ${d.id} → ${newId} (${d.title})`);
  }

  // ── Apagar antigos (só os que foram migrados com sucesso) ──
  if (migratedDealIds.length > 0) {
    console.log("\nApagando deals antigos migrados...");
    for (const id of migratedDealIds) {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) console.error(`  ✗ Erro delete deal ${id}: ${error.message}`);
      else console.log(`  ✓ Deletado: ${id}`);
    }
  }

  if (migratedContactIds.length > 0) {
    console.log("\nApagando contacts antigos migrados...");
    for (const id of migratedContactIds) {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) console.error(`  ✗ Erro delete contact ${id}: ${error.message}`);
      else console.log(`  ✓ Deletado: ${id}`);
    }
  }

  console.log("\n✅ Migração concluída!");
}

run().catch(console.error);
