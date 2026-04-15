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

      // Busca dados do contato/deal para injetar contexto no prompt
      let contactContext = "";
      try {
        const pv = [phone];
        if (phone.startsWith("55") && phone.length === 12) {
          pv.push(`${phone.slice(0, 4)}9${phone.slice(4)}`);
        } else if (phone.startsWith("55") && phone.length === 13) {
          pv.push(`${phone.slice(0, 4)}${phone.slice(5)}`);
        }

        // Deal
        const { data: dealRows } = await supabase
          .from("deals")
          .select("id, title, stage, contact_name, contact_id, phone, value")
          .or(pv.map((v) => `phone.eq.${v}`).join(","))
          .order("created_at", { ascending: false })
          .limit(1);

        if (dealRows && dealRows.length > 0) {
          const deal = dealRows[0];
          const parts: string[] = [`Nome: ${deal.contact_name || "N/A"}`, `Estágio: ${deal.stage || "N/A"}`];

          // Contato vinculado
          if (deal.contact_id) {
            const { data: contact } = await supabase
              .from("contacts")
              .select("company, status, activation_date, end_date, last_feedback, next_feedback")
              .eq("id", deal.contact_id)
              .maybeSingle();

            if (contact) {
              if (contact.company) parts.push(`Plano: ${contact.company}`);
              if (contact.status) parts.push(`Status: ${contact.status}`);
              if (contact.activation_date) parts.push(`Data Ativação: ${contact.activation_date}`);
              if (contact.end_date) parts.push(`Data Término: ${contact.end_date}`);
              if (contact.last_feedback) parts.push(`Último Feedback: ${contact.last_feedback}`);
              if (contact.next_feedback) parts.push(`Próximo Feedback: ${contact.next_feedback}`);

              // Verifica se está inativo/vencido
              const today = new Date().toISOString().slice(0, 10);
              if (contact.end_date && contact.end_date < today) {
                parts.push("⚠️ PLANO VENCIDO — sugerir renovação");
              }
              if (contact.next_feedback && contact.next_feedback < today) {
                parts.push("⚠️ FEEDBACK ATRASADO");
              }
            }
          }

          contactContext = `\n\nDADOS DO ALUNO:\n${parts.join("\n")}`;
        }
      } catch { /* silencioso */ }

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

      // Injeta dados do contato (plano, datas, feedback, status)
      if (contactContext) {
        promptParts.push(contactContext + "\n\nUse esses dados para responder perguntas sobre plano, datas, feedback e renovação. Se o plano está VENCIDO, sugira renovação de forma natural. Se o feedback está atrasado, lembre o aluno de enviar as fotos.");
      }

      if (ragContext) {
        promptParts.push(
          `\n\nCONTEXTO DA BASE DE CONHECIMENTO (RAG):\n${ragContext}\n\nIMPORTANTE: O histórico de conversa com este aluno (mensagens acima) tem PRIORIDADE sobre o RAG. Se o aluno acabou de dizer algo, responda no contexto da conversa atual. O RAG é referência complementar, não substitui a conversa em andamento.`
        );
      }

      promptParts.push("\nREGRA DE FORMATAÇÃO: Responda de forma curta e direta. Use \\n\\n entre parágrafos SOMENTE quando realmente tratar de assuntos diferentes. Não force separação. Cada parágrafo deve ter conteúdo útil — nunca um parágrafo só de saudação ou só de despedida.");

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
        });
        // Aguarda o tempo de digitação
        await new Promise((r) => setTimeout(r, typingSeconds * 1000));
      }

      // Divide por parágrafos que o GPT separou com \n\n
      let parts: string[] = aiResponse.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

      // Filtra parágrafos inúteis (só saudação ou só despedida sem conteúdo)
      const greetingOnly = /^(e ai[!,.]?|opa[!,.]?|fala[a]*[!,.]?|bom dia[a]*[!,.]?|boa tarde[!,.]?|boa noite[!,.]?)?\s*(tudo bem\??|como voc[eê] est[aá]\??)?$/i;
      const closingOnly = /^(qualquer (coisa|d[uú]vida),?\s*(s[oó] chamar|me (chama|avisa))[.!]?\s*(abra[aá]co!?)?|abra[aá]co!?)$/i;

      if (parts.length > 1) {
        parts = parts.filter((p, i) => {
          // Mantém sempre o primeiro e o último se forem os únicos com conteúdo
          if (parts.length <= 1) return true;
          // Remove parágrafos que são SÓ saudação solta (sem conteúdo real)
          if (greetingOnly.test(p.trim())) return false;
          // Remove parágrafos que são SÓ despedida genérica
          if (closingOnly.test(p.trim())) return false;
          return true;
        });
        // Garante que sobrou pelo menos 1 parte
        if (parts.length === 0) parts = [aiResponse.replace(/\n\n+/g, " ").trim()];
      }

      // Limita a no máximo 3 mensagens
      if (parts.length > 3) {
        const first2 = parts.slice(0, 2);
        const rest = parts.slice(2).join(" ");
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
        });
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
        }, { onConflict: "instance_name,external_message_id", ignoreDuplicates: true });
      }

      // Atualiza conversa com última mensagem enviada pela IA
      await supabase.from("conversas_whatsapp").upsert({
        instance_name: instanceName,
        remote_jid: remoteJid,
        ultima_mensagem: parts[parts.length - 1],
        ultima_mensagem_em: new Date().toISOString(),
        status: "answered",
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "instance_name,remote_jid" });

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
