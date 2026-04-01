import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function searchVectorstore(
  supabase: ReturnType<typeof createClient>,
  openaiToken: string,
  baseNames: string[],
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

    // Busca em todas as bases configuradas, 10 resultados no total
    const allMatches: { content: string; similarity: number; instance_name: string }[] = [];
    for (const baseName of baseNames) {
      const { data: matches } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.25,
        match_count: 10,
        p_instance_name: baseName,
      });
      if (matches) allMatches.push(...(matches as { content: string; similarity: number; instance_name: string }[]));
    }

    if (allMatches.length === 0) return "";

    // Ordena por similaridade e pega top 10
    allMatches.sort((a, b) => b.similarity - a.similarity);
    return allMatches.slice(0, 10)
      .map((m, i) => `[Trecho ${i + 1}] ${m.content.slice(0, 1200)}`)
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

      // Busca todas as bases com embeddings para este agente
      const ragBaseNames: string[] = [];
      if (agentConfig.rag_enabled) {
        // Base principal configurada no agente
        if (agentConfig.rag_base_id) {
          ragBaseNames.push(String(agentConfig.rag_base_id).replace(/^rag-/, ""));
        }
        // Busca todas as bases com status "done" ou "processing" (parcialmente pronta)
        const { data: allBases } = await supabase
          .from("vectorstore_status")
          .select("instance_name")
          .in("status", ["done", "processing"]);
        if (allBases) {
          for (const b of allBases) {
            if (!ragBaseNames.includes(b.instance_name)) ragBaseNames.push(b.instance_name);
          }
        }
      }
      const ragSearchName = ragBaseNames[0] || instanceName;

      // RAG e histórico em paralelo
      const [ragContext, conversationHistory] = await Promise.all([
        ragBaseNames.length > 0
          ? searchVectorstore(supabase, tokenRow.token, ragBaseNames, messageText)
          : Promise.resolve(""),
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

      // Divide a resposta em partes — cada parágrafo (separado por \n\n) vira uma mensagem separada
      // Se não houver \n\n, quebra por frases (. ! ?) para não mandar textão
      let parts: string[] = aiResponse.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

      // Se ficou tudo em 1 bloco e é grande, quebra por frases
      if (parts.length === 1 && parts[0].length > 200) {
        const sentences: string[] = [];
        let buf = "";
        for (const seg of parts[0].split(/(?<=[.!?])\s+/)) {
          if (buf && buf.length + seg.length > 200) {
            sentences.push(buf.trim());
            buf = seg;
          } else {
            buf = buf ? `${buf} ${seg}` : seg;
          }
        }
        if (buf) sentences.push(buf.trim());
        if (sentences.length > 1) parts = sentences;
      }

      let lastSendJson = {};
      for (let i = 0; i < parts.length; i++) {
        // Typing proporcional ao tamanho (~50 chars/s de leitura humana, mín 3s, máx 8s)
        const partTyping = Math.min(8, Math.max(3, Math.round(parts[i].length / 30)));
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
      const { error: logErr } = await supabase.from("ai_logs").insert({
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
      if (logErr) {
        await log(supabase, "ai_log_error", { instance: instanceName, details: logErr.message });
      }

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
