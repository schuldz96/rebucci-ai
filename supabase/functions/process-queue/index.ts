import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function searchVectorstore(
  supabase: ReturnType<typeof createClient>,
  openaiToken: string,
  instanceName: string,
  query: string,
): Promise<string> {
  try {
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiToken}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query.slice(0, 2000) }),
    });
    if (!embRes.ok) return "";
    const embJson = await embRes.json();
    const queryEmbedding: number[] = embJson.data?.[0]?.embedding;
    if (!queryEmbedding) return "";

    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 5,
      p_instance_name: instanceName,
    });

    if (!matches || matches.length === 0) return "";

    return (matches as { content: string; similarity: number }[])
      .map((m, i) => `[Trecho ${i + 1}] ${m.content.slice(0, 800)}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

async function fetchConversationHistory(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  phone: string,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  try {
    const { data } = await supabase
      .from("ai_conversation_history")
      .select("role, content")
      .eq("instance_name", instanceName)
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return [];
    return (data as { role: "user" | "assistant"; content: string }[]).reverse();
  } catch {
    return [];
  }
}

async function log(
  supabase: ReturnType<typeof createClient>,
  status: string,
  extra: Record<string, string> = {},
) {
  try {
    await supabase.from("webhook_logs").insert({
      instance_name: extra.instance ?? "",
      event: extra.event ?? "process-queue",
      remote_jid: extra.jid ?? "",
      message_text: extra.msg ?? "",
      status,
      details: extra.details ?? "",
    });
  } catch (_) { /* silencioso */ }
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Busca mensagens prontas para enviar (scheduled_at <= agora, não processadas)
  const { data: items, error } = await supabase
    .from("response_queue")
    .select("*")
    .lte("scheduled_at", new Date().toISOString())
    .is("processed_at", null)
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (error || !items || items.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Deduplica por telefone: só processa o item mais antigo por número nesta rodada.
  // Itens extras do mesmo número são absorvidos dentro do loop, evitando respostas duplicadas.
  const seenPhones = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = `${item.instance_name}:${item.phone}`;
    if (seenPhones.has(key)) return false;
    seenPhones.add(key);
    return true;
  });

  let processed = 0;

  for (const item of uniqueItems) {
    try {
      // Atomic claim: só prossegue se esta instância conseguiu marcar como processada
      // Evita race condition entre múltiplas chamadas do pg_cron
      const { data: claimed } = await supabase
        .from("response_queue")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", item.id)
        .is("processed_at", null)
        .select("id");

      if (!claimed || claimed.length === 0) continue; // outro worker já pegou

      const agentConfig = item.agent_config as Record<string, unknown>;
      const instanceName = item.instance_name as string;
      const phone = item.phone as string;
      const remoteJid = item.remote_jid as string;
      let messageText = item.message_text as string;

      // Absorve mensagens pendentes do mesmo número que ainda não foram processadas
      const { data: pending } = await supabase
        .from("response_queue")
        .select("id, message_text")
        .eq("instance_name", instanceName)
        .eq("phone", phone)
        .is("processed_at", null)
        .neq("id", item.id);

      if (pending && pending.length > 0) {
        const ids = pending.map((p: { id: string }) => p.id);
        await supabase.from("response_queue")
          .update({ processed_at: new Date().toISOString() })
          .in("id", ids);
        messageText = [messageText, ...pending.map((p: { message_text: string }) => p.message_text)].join("\n");
      }

      // Token OpenAI
      const { data: tokenRow } = await supabase
        .from("api_tokens")
        .select("token")
        .ilike("provider", "openai")
        .limit(1)
        .maybeSingle();

      if (!tokenRow?.token) {
        await log(supabase, "no_openai_token", { instance: instanceName });
        continue;
      }

      // Config Evolution API
      const { data: evoConfig } = await supabase
        .from("evolution_config")
        .select("api_url, api_token")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!evoConfig) {
        await log(supabase, "no_evo_config", { instance: instanceName });
        continue;
      }

      // Usa rag_base_id do agente se configurado; caso contrário usa instanceName
      const ragSearchName = agentConfig.rag_enabled && agentConfig.rag_base_id
        ? String(agentConfig.rag_base_id).replace(/^rag-/, "")
        : instanceName;

      // RAG e histórico em paralelo
      const [ragContext, conversationHistory] = await Promise.all([
        searchVectorstore(supabase, tokenRow.token, ragSearchName, messageText),
        fetchConversationHistory(supabase, instanceName, phone),
      ]);

      // Monta system prompt
      const promptParts: string[] = [];
      if (agentConfig.system_prompt) promptParts.push(agentConfig.system_prompt as string);
      if (agentConfig.prompt_complement) promptParts.push(agentConfig.prompt_complement as string);

      if (ragContext) {
        promptParts.push(
          `\n\nCONTEXTO RELEVANTE DO HISTÓRICO DE ATENDIMENTOS:\n${ragContext}\n\nUse o contexto acima para embasar sua resposta quando relevante.`
        );
      }

      const systemPrompt = promptParts.join("\n\n") || "Você é um assistente de atendimento ao cliente. Responda em português.";

      const messages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: messageText },
      ];

      // OpenAI
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 600, temperature: 0.7 }),
      });
      const aiJson = await aiRes.json();
      const aiResponse: string = (aiJson.choices?.[0]?.message?.content ?? "").trim();

      if (!aiResponse) {
        await log(supabase, "openai_empty", { instance: instanceName, details: JSON.stringify(aiJson).slice(0, 300) });
        continue;
      }

      // Simulação de digitação (grouping_delay segundos)
      const sendInstance = (agentConfig.instance_name as string) || instanceName;
      const typingSeconds = Math.min(Number(agentConfig.grouping_delay ?? 0), 60);

      if (typingSeconds > 0) {
        // Envia presença "digitando"
        await fetch(`${evoConfig.api_url}/chat/sendPresence/${sendInstance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evoConfig.api_token as string },
          body: JSON.stringify({ number: phone, presence: "composing", delay: typingSeconds * 1000 }),
        }).catch(() => {});
        // Aguarda o tempo de digitação
        await new Promise((r) => setTimeout(r, typingSeconds * 1000));
      }

      // Divide a resposta em partes naturais para envio em múltiplas mensagens
      const rawParts = aiResponse.split(/\n/).map((p) => p.trim()).filter((p) => p.length > 0);

      // Agrupa linhas curtas consecutivas (ex: listas) e quebra blocos grandes por frase
      const parts: string[] = [];
      let buffer = "";
      for (const line of rawParts) {
        if (buffer && (buffer.length + line.length > 350 || buffer.endsWith("?") || buffer.endsWith("!"))) {
          parts.push(buffer);
          buffer = line;
        } else {
          buffer = buffer ? `${buffer}\n${line}` : line;
        }
      }
      if (buffer) parts.push(buffer);

      let lastSendJson = {};
      for (let i = 0; i < parts.length; i++) {
        // Typing proporcional ao tamanho da parte (mín 1s, máx 4s)
        const partTyping = Math.min(4, Math.max(1, Math.round(parts[i].length / 60)));
        await fetch(`${evoConfig.api_url}/chat/sendPresence/${sendInstance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evoConfig.api_token as string },
          body: JSON.stringify({ number: phone, presence: "composing", delay: partTyping * 1000 }),
        }).catch(() => {});
        await new Promise((r) => setTimeout(r, partTyping * 1000));

        const res = await fetch(`${evoConfig.api_url}/message/sendText/${sendInstance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evoConfig.api_token as string },
          body: JSON.stringify({ number: phone, text: parts[i] }),
        });
        lastSendJson = await res.json().catch(() => ({}));
      }

      // Log completo: entrada, resposta e contexto RAG
      try {
        await supabase.from("ai_logs").insert({
          instance_name: instanceName,
          phone,
          remote_jid: remoteJid,
          user_message: messageText,
          ai_response: aiResponse,
          rag_context: ragContext || null,
          rag_base: ragContext ? ragSearchName : null,
          model: "gpt-4o-mini",
          parts_sent: parts.length,
        });
      } catch (_) { /* log falhou, não bloqueia fluxo */ }

      // Salva histórico
      await supabase.from("ai_conversation_history").insert([
        { instance_name: instanceName, phone, role: "user", content: messageText },
        { instance_name: instanceName, phone, role: "assistant", content: aiResponse },
      ]);

      processed++;
    } catch (err) {
      await log(supabase, "queue_item_error", { details: String(err).slice(0, 500) });
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
