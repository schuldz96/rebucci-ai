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

  let processed = 0;

  for (const item of items) {
    try {
      // Marca como processada imediatamente para evitar duplicatas
      await supabase
        .from("response_queue")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", item.id)
        .is("processed_at", null);

      const agentConfig = item.agent_config as Record<string, unknown>;
      const instanceName = item.instance_name as string;
      const phone = item.phone as string;
      const remoteJid = item.remote_jid as string;
      const messageText = item.message_text as string;

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

      // RAG e histórico em paralelo
      const [ragContext, conversationHistory] = await Promise.all([
        searchVectorstore(supabase, tokenRow.token, instanceName, messageText),
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
        await log(supabase, "rag_context_found", { instance: instanceName, jid: remoteJid, details: `${ragContext.length} chars` });
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

      // Envia a mensagem
      const sendRes = await fetch(`${evoConfig.api_url}/message/sendText/${sendInstance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evoConfig.api_token as string },
        body: JSON.stringify({ number: phone, text: aiResponse }),
      });
      const sendJson = await sendRes.json().catch(() => ({}));

      await log(supabase, "sent", {
        instance: instanceName,
        jid: remoteJid,
        msg: aiResponse.slice(0, 200),
        details: JSON.stringify(sendJson).slice(0, 300),
      });

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
