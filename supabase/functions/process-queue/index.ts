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
        // Concatena mensagens pendentes, removendo duplicatas exatas
        const allMsgs = [messageText, ...pending.map((p: { message_text: string }) => p.message_text)];
        const uniqueMsgs = [...new Set(allMsgs)];
        messageText = uniqueMsgs.join("\n");
      }

      // Persiste a mensagem de entrada do usuário (redundância: se webhook já salvou, ignora duplicata)
      await supabase.from("mensagens_whatsapp").upsert({
        instance_name: instanceName,
        remote_jid: remoteJid,
        corpo: messageText,
        tipo: "text",
        direcao: "entrada",
        external_message_id: `q-${item.id}`,
        message_timestamp: Math.floor(new Date(item.created_at as string).getTime() / 1000),
        enviada_em: item.created_at as string,
      }, { onConflict: "instance_name,external_message_id", ignoreDuplicates: true }).catch(() => {});

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
          `\n\nCONTEXTO DA BASE DE CONHECIMENTO (RAG):\n${ragContext}\n\nIMPORTANTE: O histórico de conversa com este aluno (mensagens acima) tem PRIORIDADE sobre o RAG. Se o aluno acabou de dizer algo, responda no contexto da conversa atual. O RAG é referência complementar, não substitui a conversa em andamento.`
        );
      }

      promptParts.push("\nREGRA DE FORMATAÇÃO: Separe sua resposta em 2 ou 3 parágrafos curtos (use \\n\\n entre eles). Cada parágrafo deve ter no máximo 1-2 frases. NUNCA envie um bloco único de texto longo.");

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

      // Divide a resposta em até 3 partes para parecer mais natural
      let parts: string[] = aiResponse.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

      // Se ficou tudo em 1 bloco, quebra por frases
      if (parts.length === 1 && parts[0].length > 80) {
        const sentences = parts[0].split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
        if (sentences.length >= 2) {
          // Distribui frases em até 3 partes equilibradas
          const targetParts = Math.min(3, sentences.length);
          const perPart = Math.ceil(sentences.length / targetParts);
          parts = [];
          for (let s = 0; s < sentences.length; s += perPart) {
            parts.push(sentences.slice(s, s + perPart).join(" ").trim());
          }
        }
      }

      // Limita a no máximo 3 mensagens (junta excedentes na última)
      if (parts.length > 3) {
        const first2 = parts.slice(0, 2);
        const rest = parts.slice(2).join("\n\n");
        parts = [...first2, rest];
      }

      let lastSendJson: Record<string, unknown> = {};
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
        lastSendJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        // Persiste mensagem de saída no banco
        const sentKey = (lastSendJson.key as Record<string, unknown>) ?? {};
        const sentMsgId = (sentKey.id as string) || `ai-${Date.now()}-${i}`;
        const nowTs = Math.floor(Date.now() / 1000);
        await supabase.from("mensagens_whatsapp").upsert({
          instance_name: instanceName,
          remote_jid: remoteJid,
          corpo: parts[i],
          tipo: "text",
          direcao: "saida",
          external_message_id: sentMsgId,
          message_timestamp: nowTs,
          enviada_em: new Date().toISOString(),
        }, { onConflict: "instance_name,external_message_id", ignoreDuplicates: true }).catch(() => {});
      }

      // Atualiza conversa com última mensagem enviada pela IA
      await supabase.from("conversas_whatsapp").upsert({
        instance_name: instanceName,
        remote_jid: remoteJid,
        ultima_mensagem: parts[parts.length - 1],
        ultima_mensagem_em: new Date().toISOString(),
        status: "answered",
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "instance_name,remote_jid" }).catch(() => {});

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

      // Avalia transições automáticas
      const transitions = (agentConfig.transitions as { id: string; trigger: string; destination: string; condition?: string }[]) ?? [];
      if (transitions.length > 0) {
        for (const tr of transitions) {
          if (!tr.destination) continue;

          let shouldMove = false;

          if (tr.trigger === "Lead respondeu") {
            shouldMove = true;
          } else if (tr.trigger === "IA avalia condição" && tr.condition) {
            // Pede ao GPT avaliar se a condição é verdadeira
            try {
              const evalRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRow.token}` },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    { role: "system", content: `Você é um avaliador de condições. Responda APENAS "SIM" ou "NÃO".\n\nCondição para mover o lead: "${tr.condition}"\n\nAvalie se a mensagem do usuário e a conversa recente indicam que esta condição foi atingida.` },
                    ...conversationHistory.slice(-6),
                    { role: "user", content: messageText },
                  ],
                  max_tokens: 10,
                  temperature: 0,
                }),
              });
              const evalJson = await evalRes.json();
              const answer = (evalJson.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
              shouldMove = answer.startsWith("SIM");
            } catch {
              // Erro na avaliação, não move
            }
          }

          if (shouldMove) {
            // Move o deal para a etapa destino
            const { data: dealRows } = await supabase
              .from("deals")
              .select("id")
              .eq("phone", phone)
              .order("created_at", { ascending: false })
              .limit(1);

            if (dealRows && dealRows.length > 0) {
              await supabase.from("deals").update({ stage: tr.destination, updated_at: new Date().toISOString() }).eq("id", dealRows[0].id);
              await log(supabase, "transition_moved", {
                instance: instanceName,
                jid: remoteJid,
                details: `trigger="${tr.trigger}" → "${tr.destination}" deal=${dealRows[0].id}`,
              });
            }
            break; // Só aplica a primeira transição que bate
          }
        }
      }

      processed++;
    } catch (err) {
      await log(supabase, "queue_item_error", { details: String(err).slice(0, 500) });
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
