/**
 * Processa o Marco.csv e gera chunks Q&A para o RAG.
 *
 * Uso: node scripts/process-marco-csv.mjs
 *
 * O script:
 * 1. Lê o CSV e agrupa mensagens por conversa (remote_jid)
 * 2. Extrai pares pergunta→resposta (aluno→Marco)
 * 3. Concatena multi-mensagens do Marco em uma resposta
 * 4. Deduplica e filtra templates/automáticos
 * 5. Insere no rag_chunks do Supabase
 * 6. Cria entrada no vectorstore_status para gerar embeddings
 */

import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const SUPABASE_URL = "https://urrbpxrtdzurfdsucukb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmJweHJ0ZHp1cmZkc3VjdWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM4Nzg3NSwiZXhwIjoyMDg5OTYzODc1fQ.cygbRECDzUrJ0fUDGiGqC_FSZDb6QupoZ7g8N3RcyfM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RAG_INSTANCE_NAME = "marco-voice";
const CSV_PATH = "Marco.csv";
const MAX_CHUNKS = 5000;

// Templates e mensagens automáticas a ignorar
const SKIP_PATTERNS = [
  /▶️.*◀️/,
  /⚠️.*⚠️/,
  /🚨.*🚨/,
  /modelo\d/i,
  /^\*Olá, seja muito bem-vindo/,
  /^\*Seus primeiros passos/,
  /^Seus primeiros passos/,
  /^Olá, seja muito bem-vindo/,
  /^Use essas informações para logar/,
  /^Link navegador/,
  /^Baixar o app/,
  /^Andro$/,
  /follow_x\d/i,
  /renovacao_/i,
  /Alerta de Feedback/,
  /Alerta de Anamnese/,
];

function isTemplate(msg) {
  return SKIP_PATTERNS.some((p) => p.test(msg));
}

// Parse CSV manualmente (mais rápido que library para 1.5M linhas)
async function parseCSV() {
  console.log("📖 Lendo CSV...");
  const convs = new Map();
  let lineCount = 0;

  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let isFirst = true;
  let partial = "";

  for await (const rawLine of rl) {
    if (isFirst) { isFirst = false; continue; } // skip header

    // Handle multi-line messages (quoted fields with newlines)
    const line = partial ? partial + "\n" + rawLine : rawLine;

    // Count quotes to detect incomplete fields
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      partial = line;
      continue;
    }
    partial = "";

    // Parse: "jid",true/false,"message" or "jid",true/false,message
    const match = line.match(/^"([^"]+)",(true|false),(.*)$/s);
    if (!match) continue;

    const jid = match[1];
    const fromMe = match[2] === "true";
    let msg = match[3].trim();
    // Remove surrounding quotes
    if (msg.startsWith('"') && msg.endsWith('"')) {
      msg = msg.slice(1, -1).replace(/""/g, '"');
    }

    if (!convs.has(jid)) convs.set(jid, []);
    convs.get(jid).push({ fromMe, msg });
    lineCount++;

    if (lineCount % 200000 === 0) console.log(`  ${lineCount.toLocaleString()} linhas...`);
  }

  console.log(`✅ ${lineCount.toLocaleString()} mensagens em ${convs.size.toLocaleString()} conversas`);
  return convs;
}

function extractQAPairs(convs) {
  console.log("🔍 Extraindo pares Q&A...");
  const pairs = [];

  for (const [jid, msgs] of convs) {
    for (let i = 0; i < msgs.length; i++) {
      // Busca pergunta do aluno
      if (msgs[i].fromMe) continue;
      const question = msgs[i].msg.trim();
      if (question.length < 8) continue;

      // Busca resposta(s) do Marco (pode ser multi-mensagem)
      const responseParts = [];
      let j = i + 1;
      while (j < msgs.length && msgs[j].fromMe) {
        const part = msgs[j].msg.trim();
        if (part && !isTemplate(part)) {
          responseParts.push(part);
        }
        j++;
      }

      if (responseParts.length === 0) continue;
      const response = responseParts.join("\n");
      if (response.length < 10) continue;

      // Ignora se a resposta é template
      if (isTemplate(response)) continue;

      pairs.push({ question, response });
    }
  }

  console.log(`✅ ${pairs.length.toLocaleString()} pares Q&A extraídos`);
  return pairs;
}

function deduplicateAndRank(pairs) {
  console.log("🧹 Deduplicando e rankeando...");

  // Deduplica por hash da resposta (mesma resposta = mesmo conhecimento)
  const seen = new Map();
  for (const pair of pairs) {
    const key = pair.response.toLowerCase().slice(0, 100);
    if (!seen.has(key)) {
      seen.set(key, pair);
    } else {
      // Mantém o par com pergunta mais longa (mais contexto)
      const existing = seen.get(key);
      if (pair.question.length > existing.question.length) {
        seen.set(key, pair);
      }
    }
  }

  // Filtra e rankeia por qualidade
  let unique = Array.from(seen.values()).filter((p) => {
    // Pergunta substantiva
    if (p.question.length < 15) return false;
    // Resposta substantiva
    if (p.response.length < 20) return false;
    // Não é só saudação
    if (/^(oi|olá|bom dia|boa tarde|boa noite|tudo bem)\??$/i.test(p.response)) return false;
    return true;
  });

  // Ordena por qualidade (respostas mais longas e informativas primeiro)
  unique.sort((a, b) => {
    const scoreA = a.response.length + a.question.length * 0.5;
    const scoreB = b.response.length + b.question.length * 0.5;
    return scoreB - scoreA;
  });

  // Limita ao top N
  unique = unique.slice(0, MAX_CHUNKS);

  console.log(`✅ ${unique.length.toLocaleString()} pares únicos selecionados`);
  return unique;
}

function createChunks(pairs) {
  console.log("📦 Criando chunks para RAG...");

  return pairs.map((pair, idx) => ({
    instance_name: RAG_INSTANCE_NAME,
    chat_id: `qa-${idx}`,
    contact_name: "Marco Voice",
    content: `PERGUNTA DO ALUNO: ${pair.question}\n\nRESPOSTA DO MARCO: ${pair.response}`,
    message_count: 2,
    chunk_index: idx,
  }));
}

async function insertChunks(chunks) {
  console.log(`💾 Inserindo ${chunks.length} chunks no banco...`);

  // Cria job
  const { data: job, error: jobErr } = await supabase.from("rag_jobs").insert({
    instance_name: RAG_INSTANCE_NAME,
    message_limit: chunks.length,
    status: "processing",
    total_messages: chunks.length * 2,
    total_chunks: chunks.length,
  }).select("id").single();

  if (jobErr) {
    console.error("Erro ao criar job:", jobErr.message);
    return null;
  }

  console.log(`  Job: ${job.id}`);

  // Limpa chunks antigos do mesmo instance_name
  await supabase.from("rag_chunks").delete().eq("instance_name", RAG_INSTANCE_NAME);

  // Insere em batches de 500
  let inserted = 0;
  for (let b = 0; b < chunks.length; b += 500) {
    const batch = chunks.slice(b, b + 500).map((c) => ({ ...c, job_id: job.id }));
    const { error } = await supabase.from("rag_chunks").insert(batch);
    if (error) {
      console.error(`  Erro no batch ${b}:`, error.message);
    } else {
      inserted += batch.length;
    }
    if ((b + 500) % 2000 === 0) console.log(`  ${inserted.toLocaleString()} inseridos...`);
  }

  // Atualiza job
  await supabase.from("rag_jobs").update({ status: "done" }).eq("id", job.id);

  // Cria/atualiza vectorstore_status para trigger de embeddings
  await supabase.from("vectorstore_status").upsert({
    instance_name: RAG_INSTANCE_NAME,
    status: "pending",
    total_chunks: chunks.length,
    embedded_chunks: 0,
  }, { onConflict: "instance_name" });

  console.log(`✅ ${inserted} chunks inseridos. Vectorstore status: pending`);
  return job.id;
}

// === MAIN ===
async function main() {
  console.log("🚀 Processamento do Marco.csv para RAG\n");

  const convs = await parseCSV();
  const pairs = extractQAPairs(convs);
  const ranked = deduplicateAndRank(pairs);
  const chunks = createChunks(ranked);
  const jobId = await insertChunks(chunks);

  if (jobId) {
    console.log("\n📊 Resumo:");
    console.log(`  Conversas processadas: ${convs.size.toLocaleString()}`);
    console.log(`  Pares Q&A brutos: ${pairs.length.toLocaleString()}`);
    console.log(`  Chunks finais: ${chunks.length.toLocaleString()}`);
    console.log(`  Job ID: ${jobId}`);
    console.log(`\n⏳ Agora execute o generate-embeddings para criar os vetores.`);
    console.log(`   O pg_cron já faz isso automaticamente a cada minuto.`);
  }
}

main().catch(console.error);
