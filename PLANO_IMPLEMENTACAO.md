# Plano de Implementação — RebucciAI CRM (PrimeCoaching)

> Planejamento técnico completo, página por página.
> Stack: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Zustand + Supabase
> Supabase já conectado: `urrbpxrtdzurfdsucukb.supabase.co`
> Dados: do zero — sistema novo.

---

## Decisões Arquiteturais Confirmadas

| Questão | Decisão | Impacto |
|---------|---------|---------|
| **App do aluno** | Formulário web público por link (sem login agora). Futuro: portal/app com login | Criar rota pública `/feedback/:token` fora do layout autenticado |
| **WhatsApp automação** | Sim — Evolution API + Meta API oficial. Configurável e ativável pelo coach, não ativo por padrão | Seção de automações nas Settings; envios só disparam quando coach ativa |
| **Dados existentes** | `Marco.csv` é teste. Alunos reais virão via importação CSV futuramente | Manter e refinar o sistema de importação |
| **Multi-usuário** | Hoje só um coach (Marcos). Arquitetura SaaS-ready: `coach_id` em todas as tabelas | Não criar UI de multi-tenant agora, mas o modelo de dados já suporta |
| **Gateway de pagamento** | Digital Manager Guru (webhook de venda). Pagar.me possível no futuro | Receber webhook DMG → criar consultoria automaticamente. Config nas Settings |
| **Feedback do aluno** | Link único por WhatsApp → formulário web público. Aluno não precisa de login | Tabela `feedback_tokens` com UUID público; rota `/f/:token` pública |
| **Seção "Prime" nas Settings** | Será substituída pela própria plataforma. Manter temporariamente para referência de API, remover quando features estiverem prontas | Não investir em evolução da integração Prime API — o sistema SE TORNA o Prime |

---

## Estado Atual do Sistema (o que JÁ EXISTE)

### Páginas e Componentes

| Arquivo | Status | O que faz |
|---------|--------|-----------|
| `src/lib/supabase.ts` | ✅ Funcional | Client Supabase configurado e conectado |
| `src/pages/LoginPage.tsx` | ✅ Funcional | Login real via Supabase Auth |
| `src/pages/DashboardPage.tsx` | ✅ Funcional | Cards + tabela feedbacks (Supabase `contacts`) |
| `src/pages/ContactsPage.tsx` | ✅ Funcional | Tabela de alunos com Supabase (`contacts`), filtros, redimensionamento de colunas |
| `src/pages/DealsPage.tsx` | ✅ Funcional | Kanban drag-and-drop com AI Agent por estágio |
| `src/pages/SettingsPage.tsx` | ✅ Funcional | 8 seções: geral, usuários, pipelines, propriedades, tokens, evolution, meta, prime |
| `src/pages/WhatsAppPage.tsx` | ✅ Funcional | Chat WhatsApp via Evolution API com mensagens reais |
| `src/pages/AIRagPage.tsx` | ⚠️ Parcial | UI existe, lógica RAG com mock parcial |
| `src/components/layout/AppSidebar.tsx` | ✅ Funcional | Sidebar simples sem submenus — precisa expandir |
| `src/components/layout/AppLayout.tsx` | ✅ Funcional | Layout h-screen com header |
| `src/components/layout/ProfileModal.tsx` | ✅ Funcional | Modal de perfil do usuário logado |
| `src/components/deals/AIAgentModal.tsx` | ✅ Funcional | 7 abas de config da IA por estágio do pipeline |
| `src/components/deals/DealDetailPanel.tsx` | ✅ Funcional | Painel lateral de detalhes do negócio + histórico de mensagens |
| `src/components/contacts/ContactDetailPanel.tsx` | ✅ Funcional | Painel lateral de detalhes do contato |
| `src/lib/evolutionApi.ts` | ✅ Funcional | Integração completa Evolution API |

### Stores Zustand

| Store | Status | O que faz |
|-------|--------|-----------|
| `authStore.ts` | ✅ **JÁ USA SUPABASE AUTH** | `signInWithPassword`, `signOut`, `getSession`, `restoreSession` — **NÃO é mock** |
| `contactStore.ts` | ✅ Funcional | Carrega `contacts` do Supabase com paginação |
| `dealStore.ts` | ⚠️ Parcial | Deals carregados do Supabase mas com fallback mock |
| `pipelineStore.ts` | ✅ Funcional | CRUD completo de pipelines e estágios no Supabase |
| `chatStore.ts` | ⚠️ Parcial | Conversas WhatsApp com mock + Evolution API |

### Tabelas Supabase JÁ EXISTENTES (não recriar)

| Tabela | Descrição |
|--------|-----------|
| `contacts` | Alunos/leads do CRM (usado por ContactsPage e DashboardPage) |
| `pipelines` | Pipelines do kanban |
| `pipeline_stages` | Estágios de cada pipeline |
| `agent_configs` | Configuração de IA por estágio (AIAgentModal) |
| `instances` | Instâncias WhatsApp (Evolution API) |
| `rag_bases` | Bases de conhecimento RAG |
| `api_tokens` | Tokens de LLM (OpenAI, Anthropic, Groq, etc.) |
| `crm_users` | Usuários do CRM (diferente de auth.users — tem name, role, team) |
| `prime_endpoints` | Endpoints da integração Prime API |
| `webhook_logs` | Log de webhooks recebidos |
| `ai_logs` | Log de todas as interações da IA (mensagem, resposta, RAG context, modelo) |

### Sistema de IA JÁ EXISTENTE — AIAgentModal (7 abas)

Este é o coração da IA do CRM. **Já funcional**, salvo no Supabase (`agent_configs`).

| Aba | O que configura |
|-----|----------------|
| **IA** | Provider (Evolution), instância WhatsApp, ativar/desativar por estágio |
| **Prompt** | System prompt + complemento de comportamento |
| **Comportamento** | Mensagem de boas-vindas (texto/áudio/imagem/vídeo), delay de agrupamento, delay de resposta, início da conversa |
| **Perguntas** | Lista de perguntas que a IA faz ao lead em sequência |
| **Follow-ups** | Sequências de follow-up com triggers (tempo, palavra-chave, sem resposta) |
| **RAG** | Selecionar base RAG, ativar, definir max de turnos |
| **Transições** | Regras automáticas de movimentação de leads entre estágios |

### Design System Consolidado

- **Tema:** dark mode fixo, class-based via Tailwind
- **Cor primária:** HSL 248 90% 66% → roxo `#9d66ff`
- **Cor accent:** HSL 168 80% 45% → teal
- **Cor sucesso:** HSL 152 70% 45% → verde
- **Cor warning:** HSL 38 92% 55% → laranja
- **Cor destrutivo:** HSL 0 72% 55% → vermelho
- **Radius:** `1rem` (border-radius padrão = 16px, muito arredondado)
- **Fonte:** Inter 300–800 (Google Fonts)
- **Gradientes:** `--gradient-primary` (roxo→violeta), `--gradient-accent` (teal→ciano)
- **Sombras:** `--shadow-sm/md/lg` + `--shadow-glow` (brilho roxo)
- **Classes utilitárias customizadas:** `.glass`, `.surface-elevated`, `.glow`, `.text-gradient`
- **Sidebar:** fundo HSL 228 14% 6% (mais escuro que o app)
- **Scrollbar:** 6px, thumb `bg-muted`, arredondado
- **Animações:** Framer Motion em todas as páginas (`motion.div`, `motion.tr`, `AnimatePresence`)
- **Ícones:** Lucide React exclusivamente

**Regra de layout obrigatória para toda nova página:**
```tsx
<div className="flex flex-col h-full overflow-hidden">
  <div className="shrink-0">...</div>         {/* header/filtros — não rola */}
  <div className="flex-1 overflow-auto">...</div>  {/* conteúdo — rola */}
</div>
```

---

## O que será feito em cada fase

---

## FASE 0 — Schema Completo no Banco

> **Auth já está pronto.** `authStore.ts` já usa Supabase Auth (`signInWithPassword`, `signOut`, `restoreSession`). Pular 0.1.

### 0.1 — ✅ CONCLUÍDO — Autenticação Supabase já funcional

`authStore.ts` já implementa:
- `supabase.auth.signInWithPassword()` — login
- `supabase.auth.signOut()` — logout
- `supabase.auth.getSession()` — restauração de sessão
- Busca perfil em `crm_users` por email para pegar `name` e `role`

**Não precisa de alteração.**

### 0.2 — Tabela `profiles` (dados do coach)

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  photo_url text,
  bio text,
  monthly_goal numeric DEFAULT 0,
  feedback_frequency_days integer DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON profiles USING (id = auth.uid());
```

Trigger para criar profile automaticamente ao registrar:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 0.3 — Schema Completo (todas as tabelas)

Ordem de criação (respeita dependências de foreign key):

```
1. profiles
2. plans
3. customers
4. consultorias
5. anamnesis
6. feedback_forms (perguntas configuráveis)
7. feedbacks (respostas dos alunos)
8. progress_photos
9. appointments
10. workout_plans
11. workout_sessions
12. exercises
13. diet_plans
14. meals
15. meal_foods
16. customer_workout_plans
17. customer_diet_plans
18. transactions
19. revenue_goals
20. notifications
21. groups
22. group_members
23. cart_recoveries
24. affiliates
25. workout_logs (treinos realizados pelo aluno)
```

**RLS em 100% das tabelas.** Policy padrão: `coach_id = auth.uid()`.

---

## FASE 1 — Dashboard (`/dashboard`) — REESCREVER baseado no PrimeCoaching

**Referência visual:** screenshots do PrimeCoaching confirmadas. Layout é completamente diferente do atual.

### Layout geral da página:
```
┌─────────────────────────────────────────┬──────────────────┐
│  CONTEÚDO PRINCIPAL (scroll)            │ PAINEL DIREITO   │
│                                         │ (sticky/fixo)    │
│  [Saudação personalizada]               │                  │
│  [Seção Agendamentos ▲ colapsável]      │  2784            │
│  [Seção Dashboard ▲ colapsável]         │  Clientes ativos │
│  [Seção Métricas Financeiras ▲]         │                  │
│  [Seção Último Semestre ▲]              │  ██████░░ 84%    │
│                                         │  ● Homens (2245) │
│                                         │  ● Mulheres(414) │
└─────────────────────────────────────────┴──────────────────┘
```

### Header da página:
- Saudação dinâmica baseada no horário: "Bom dia", "Boa tarde", "Boa noite" + nome do coach + emoji 👋
- Subtítulo: "Acompanhe o desempenho do seu negócio"

### Seção 1 — Agendamentos (colapsável com botão ▲/▼)
- **Seletor de dias:** barra horizontal com 5 dias (hoje + 4 próximos) estilo tab pills
  - Formato: "Qua\n29/Abr" — dia da semana + data
  - Dia selecionado: fundo azul/primário
  - Clicar muda a lista abaixo
- **Lista de compromissos do dia selecionado:**
  - Nome do aluno + tipo (Feedback, Check-in, etc.)
  - Badge status: "Respondido" (verde) / "Pendente" (cinza/amarelo)
  - Scroll interno se muitos itens
  - Clique na linha → perfil do aluno

### Painel direito (sticky — não rola com o conteúdo):
- Ícone de grupo de pessoas
- Número grande: total de clientes ativos
- Barra de progresso horizontal (cor primária)
- Porcentagem: % de homens vs mulheres (ou engajamento — a definir)
- Legenda: "● Homens (X)" e "● Mulheres (Y)"
- Permanece visível enquanto o usuário rola o conteúdo à esquerda

### Seção 2 — Dashboard (colapsável com botão ▲/▼)
Cards em grid 3 colunas com "ver detalhes >" clicável:
- **Atendimentos pendentes** — contagem + link → `/customers/actives` filtrado
- **Atendimentos ativos** — contagem + link → `/customers/actives`
- **Feedbacks pendentes** — contagem + link → `/customers/feedbacks`
- **Taxa de renovação** — porcentagem + dropdown "Todo o período / Este mês / Este ano" + link "Histórico completo"
- **Desistências (últimos 30 dias)** — contagem + link → `/customers/dropouts`

### Seção 3 — Métricas Financeiras (colapsável + toggle "Exibir valores")
- **Toggle "Exibir valores"** (switch) — oculta/exibe todos os valores monetários por privacidade
- Quando oculto: substitui valores por `••••••`

Cards em grid 3 colunas:
- **Resumo Diário:**
  - Date picker (padrão: hoje)
  - Valor do dia em R$
  - Comparativo: ↓X% menos / ↑X% mais do que dia anterior
- **Vendas por Período:**
  - Dropdown: "Esta semana / Semana passada / Este mês / Personalizado"
  - Valor total em R$
  - Comparativo com período anterior (↑↓%)
- **Vendas Mensais:**
  - Dropdown: "Abril/2026" (mês/ano selecionável)
  - Valor total em R$
  - Comparativo com mês anterior (↑↓%)
- **Ticket Médio:**
  - Valor médio por transação
  - Comparativo com período anterior
- **Expectativa de Renovação:**
  - Número de clientes com vencimento nos próximos 30 dias
  - Receita potencial total em R$
  - Comparativo com período anterior
- **Meta Mensal:**
  - Valor atual do mês vs meta configurada
  - Porcentagem atingida (ex: 100%)
  - Ícone de editar (✎) → abre modal para editar a meta
  - Quando >100%: exibe verde e "Meta atingida!"

### Seção 4 — Último Semestre (colapsável com botão ▲/▼)
- **Gráfico de ÁREA** (não barras — confirmado nas screenshots) com Recharts `AreaChart`
- Duas séries com área preenchida:
  - "Apenas novos clientes" — azul claro com fill semitransparente
  - "Renovações" — azul/roxo mais escuro
- Tooltip ao hover: mostra mês + valores das duas séries
- Legenda no topo direito com bolinhas coloridas
- Eixo X: últimos 6 meses (ex: Nov/25 → Abr/26)
- Eixo Y: 0 a máximo da série
- Linhas suaves (`type="monotone"`, `strokeWidth=2`)

### Componentes a criar:
- `src/pages/DashboardPage.tsx` — reescrever completamente
- `src/components/dashboard/DashboardGreeting.tsx` — saudação + horário
- `src/components/dashboard/CollapsibleSection.tsx` — wrapper reutilizável (título + ícone + botão ▲/▼ + children)
- `src/components/dashboard/AppointmentsDaySelector.tsx` — barra de 5 dias clicáveis
- `src/components/dashboard/AppointmentList.tsx` — lista com badges de status
- `src/components/dashboard/ActiveClientsSidePanel.tsx` — painel direito sticky com total + gênero
- `src/components/dashboard/MetricCard.tsx` — card com título, valor, comparativo, link "ver detalhes"
- `src/components/dashboard/FinancialMetricCard.tsx` — variante com toggle de visibilidade
- `src/components/dashboard/MonthlyGoalCard.tsx` — meta mensal com edição inline
- `src/components/dashboard/SemesterAreaChart.tsx` — gráfico de área (Recharts AreaChart)
- `src/components/layout/NotificationsDropdown.tsx` — sino + dropdown no header

### Queries Supabase:
```typescript
// Clientes ativos + gênero
supabase.from('customers')
  .select('id, gender')
  .eq('coach_id', user.id)

// Consultorias ativas
supabase.from('consultorias')
  .select('id', { count: 'exact', head: true })
  .eq('coach_id', user.id).eq('status', 'active')

// Feedbacks pendentes
supabase.from('feedbacks')
  .select('id', { count: 'exact', head: true })
  .eq('coach_id', user.id).eq('status', 'pending')

// Receita do dia (date picker)
supabase.from('transactions')
  .select('amount').eq('status', 'paid').eq('coach_id', user.id)
  .gte('paid_at', startOfDay).lte('paid_at', endOfDay)

// Meta mensal
supabase.from('revenue_goals')
  .select('goal_amount')
  .eq('coach_id', user.id).eq('month', currentMonth).eq('year', currentYear)
  .maybeSingle()

// Gráfico de área — 6 meses
supabase.from('consultorias')
  .select('created_at, plan_id')
  .eq('coach_id', user.id)
  .gte('created_at', sixMonthsAgo)
// Processar no client: agrupar por mês, separar novos vs renovações

// Agendamentos por dia
supabase.from('appointments')
  .select('*, customers(name)')
  .eq('coach_id', user.id)
  .gte('scheduled_at', startOfDay(selectedDate))
  .lte('scheduled_at', endOfDay(selectedDate))
  .order('scheduled_at')

// Expectativa de renovação (próx 30 dias)
supabase.from('consultorias')
  .select('value, end_date, customers(name)')
  .eq('coach_id', user.id).eq('status', 'active')
  .gte('end_date', today).lte('end_date', in30days)
```

### Nota de design:
O PrimeCoaching usa tema claro (branco/azul). **Nosso sistema mantém tema escuro.** Adaptar o layout e funcionalidades, mas usar as classes do nosso design system: `surface-elevated`, `bg-primary`, `text-muted-foreground`, etc.

---

## FASE 2 — Alunos (`/customers`) — NOVA seção

**Situação:** `ContactsPage.tsx` já existe mas é genérica (CRM). A página de Clientes do coaching é um contexto diferente — mais rico, com planos, feedbacks, treinos, progresso.

**Estratégia:** manter `/contacts` (CRM geral) e criar `/customers` (coaching específico).

### 2.1 — Ativos (`/customers/actives`) — NOVA página

**Layout — confirmado nas screenshots:**

**Header:**
- Título: "Alunos Ativos" + subtítulo "Gerencie seus alunos"
- Badges de contagem: **"X Pendentes"** (azul) | **"Y Entregue"** (verde) — contagem de consultorias pendentes vs. entregues
- Botões no topo direito: **Toggle Lista/Grid** (ícones) + **"Exportar lista"**

**Filtros (painel colapsável — confirmados):**
- Busca: texto livre por nome, email ou WhatsApp
- **Plano** — dropdown seleção múltipla
- **Modalidade** — dropdown (Online / Personal / Consulta)
- **Status** — dropdown (Todos / Ativo / Vencendo / Vencido)
- **Prontidão** — dropdown (campo específico da consultoria)
- **Anamnese** — dropdown (Todos / Respondida / Sem anamnese)
- **Fotos** — dropdown (Todas / Possui fotos / Sem fotos)
- **Nota fixada (requer atenção)** — dropdown (Todos / Com nota fixada / Sem nota)
- **Ordenação** — dropdown
- Botões: **"Filtrar"** (primário) + **"Limpar filtros"**

**Cards de aluno (visão Grid — confirmado):**
Cada card contém:
- Avatar com iniciais coloridas (ou foto de perfil)
- Nome completo + email + telefone
- Nome do plano
- Badges de status: **Anamnese ✓** (verde) ou **"Sem anamnese"** (cinza), **Fotos** (se tiver), **Treino** (se tiver), **Dieta** (se tiver), **Cardio** (ou "Sem cardio")
- **"N notas novas"** — badge laranja quando há notas não lidas
- **"X dias restantes"** — contagem de dias até vencimento do plano
- Clique → abre perfil do aluno `/customers/:id`

**Visão Lista:**
- Tabela com colunas: Foto/Avatar, Nome, Email, Plano, Status, Dias restantes, Ações
- Ação por linha: ••• menu contextual (Ver perfil, Enviar mensagem, Renovar, Encerrar)

**Componentes:**
- `src/pages/customers/CustomersActivePage.tsx`
- `src/components/customers/CustomerCard.tsx` — card grid
- `src/components/customers/CustomerRow.tsx` — linha da tabela
- `src/components/customers/CustomersFilters.tsx` — painel de filtros colapsável
- `src/components/customers/NewCustomerModal.tsx` — formulário criação

**Formulário de novo aluno:**
- Nome (obrigatório)
- Email, Telefone, WhatsApp
- Sexo, Data de Nascimento, Altura (cm)
- Plano selecionado (dropdown de `plans`)
- Modalidade (Online / Personal / Consulta)
- Data de início, Valor cobrado, Forma de pagamento
- Observações

**Queries:**
```typescript
supabase.from('consultorias')
  .select(`*, customers(*), plans(name)`)
  .eq('coach_id', user.id)
  .eq('status', 'active')
  .order('end_date', { ascending: true })
```

### 2.2 — Feedbacks (`/customers/feedbacks`) — NOVA página

**Layout — confirmado nas screenshots:**

**Header:**
- Título: **"Feedbacks"** + subtítulo "Acompanhe o progresso do seu time"
- Toggle **Lista / Grid** (ícones topo direito)
- Botão **"Feedbacks Expirados"** (laranja, topo direito) — filtra feedbacks que expiraram sem resposta

**Filtros (painel colapsável com seções):**

*STATUS E FOTOS:*
- **Filtrar por status** — dropdown: "Todos os status" / Pendente / Parcial / Respondido / Expirado
- **Filtrar por fotos** — dropdown: "Todas" / Possui fotos / Sem fotos
- **Plano** — dropdown: "Todos os planos" / [lista de planos]
- **Status do atendimento** — dropdown: "Todos" / [opções]
- **Nota fixada (requer atenção)** — dropdown: "Todos" / Com nota / Sem nota

*PERÍODO:*
- **Período** — dropdown: "Todo o período" / Esta semana / Este mês / [range personalizado]

*ORDENAÇÃO:*
- **Ordenar por** — dropdown: "Padrão (não lidos primeiro)" / Data mais recente / Data mais antiga / Nome A-Z

- Botões: **"Filtrar"** (azul) + **"Limpar"**

**Cards de feedback (visão Lista — confirmado):**
Cada card:
- Avatar (foto ou iniciais coloridas) + Nome completo + Nome do plano
- Data do feedback (ex: "29/04/2026")
- Badges de status:
  - **"Pendente"** — pill cinza com ícone envelope
  - **"Parcial"** — pill laranja (feedback incompleto / em andamento)
  - **Peso atual** — ex: "73.7 kg" (ícone balança)
  - **"Possui fotos"** (verde) ou **"Sem fotos"** (cinza) — ícone de imagem
  - **Preview do comentário** — texto truncado do campo observação (ex: "Fiquei com sinusite e tive que n...")
  - **"Não informado"** quando sem observação
- Ações no canto direito: **ícone 👁 ver** | **ícone 🗑 excluir**

**Clique no card → abre painel lateral:**
- Histórico de todas as respostas do aluno (timeline)
- Cada feedback: data, respostas às perguntas configuradas
- Fotos de progresso enviadas
- Botão "Marcar como visto" / "Responder por WhatsApp"
- Botão "Encaminhar para IA"

**Componentes:**
- `src/pages/customers/CustomersFeedbacksPage.tsx`
- `src/components/customers/FeedbackCard.tsx` — card da lista
- `src/components/customers/FeedbackPanel.tsx` — painel deslizante lateral
- `src/components/customers/FeedbackHistoryTimeline.tsx`

**Queries:**
```typescript
supabase.from('feedbacks')
  .select(`*, consultorias(*, customers(name, photo_url, initials_color), plans(name))`)
  .eq('coach_id', user.id)
  .order('created_at', { ascending: false })
// filtragem client-side ou server-side por status, período, plano, fotos
```

### 2.3 — Todos os Clientes (`/customers/list`) — NOVA página

**Layout — confirmado nas screenshots:**

**Header:**
- Título: **"Clientes"** + subtítulo "Gerencie seus clientes"
- Botões topo direito:
  - **"Aniversariantes"** (ícone bolo, roxo/outline) — filtra aniversariantes do mês
  - **"Excluídos"** (outline) — lista de clientes excluídos (soft delete)
  - **"Exportar lista"** (outline)
  - **"Adicionar manualmente"** (azul primário)

**Filtros (painel colapsável — seções confirmadas):**

*STATUS E PLANO:*
- **Status do plano** — dropdown: "Todos os status" / Ativo / Inativo / Nunca ativado
- **Plano** — dropdown: "Todos os planos" / [lista]
- **Vencimento próximo** — dropdown: "Todos os vencimentos" / Próximos 7 dias / Próximos 30 dias / Vencidos
- **App instalado** — dropdown: "Todos os apps" / Com app instalado / Sem app

*PAGAMENTO:*
- **Cobranças automáticas** — dropdown: "Todas as cobranças" / Com cobrança automática / Sem cobrança

*ORDENAÇÃO:*
- **Ordenar por** — dropdown: "Nome A-Z" / Z-A / Mais recente / Mais antigo / Vencimento próximo

- Botões: **"Filtrar"** (azul) + **"Limpar filtros"**

**Tabela — colunas confirmadas:**
| Cliente | WhatsApp | E-mail | Plano contratado | Status | Ações |
|---------|----------|--------|-----------------|--------|-------|

Detalhes de cada linha:
- **Cliente:** Avatar (foto ou iniciais coloridas) + Nome + badge **"App instalado"** (pill azul claro) abaixo do nome — só aparece quando instalado
- **WhatsApp:** Link "🟢 Enviar mensagem" (clique abre conversa Evolution API)
- **E-mail:** texto + ícone copiar
- **Plano contratado:** link azul clicável (ex: "Consultoria Online Trimestral →") + badge **"N renovações"** (com ícone de ciclo) + badge **"Expira em X dias"** quando ativo
- **Status:** badge "Ativo" (verde) ou "Inativo" (vermelho)
- **Ações:** ••• menu contextual

**Componentes:**
- `src/pages/customers/CustomersListPage.tsx`
- `src/components/customers/CustomerTableRow.tsx` — linha da tabela "todos os clientes"

### 2.4 — Engajamento (`/customers/engagement`) — NOVA página

**Lógica:**
- Score = (treinos realizados / treinos planejados no período) × 100
- Semáforo: verde >70%, amarelo 40–70%, vermelho <40%

**Layout:**
- Cards de resumo: média geral, alunos em verde/amarelo/vermelho
- Tabela: Nome | Treinos Planejados | Realizados | Score | Semáforo
- Clique → perfil do aluno

**Componentes:**
- `src/pages/customers/CustomersEngagementPage.tsx`
- `src/components/customers/EngagementBadge.tsx` — semáforo visual

**Queries:**
```typescript
supabase.from('workout_logs')
  .select('consultoria_id, completed_at')
  .gte('completed_at', thirtyDaysAgo)
// join com customer_workout_plans para calcular planejado vs. realizado
```

### 2.5 — Desistências (`/customers/dropouts`) — NOVA página

- Alunos com `status = 'inactive'` e `end_date` passada
- Colunas: Nome, Plano, Data saída, Motivo, Dias desde saída
- Ação: Reativar (abre modal de nova consultoria) | Contatar WhatsApp

**Componentes:**
- `src/pages/customers/CustomersDropoutsPage.tsx`

### 2.6 — Perfil do Aluno (`/customers/:id`) — NOVA página

**É o mais complexo do sistema. Confirmado nas screenshots.**

**Header do perfil:**
- Banner de cor sólida (azul/cor variável) com 2/3 da altura do header
- Avatar circular grande sobre o banner (posição lower-left, sobrepõe a borda do banner)
- Nome completo do aluno em destaque
- Badge **"App instalado"** (quando aplicável)
- Linha de stats rápidos: **Peso atual** | **Altura** (cm) | **Idade** | **IMC**
- Botões de ação rápida (ícones com tooltip):
  - ✓ check — marcar consultoria como entregue
  - 👁 ver — visualizar formulário público do aluno
  - ✉ email — abrir cliente de e-mail
  - 📅 calendar — agendar no calendário
  - 💬 WhatsApp — abrir conversa

**11 Abas (confirmadas na screenshot):**
`Progresso | Agendamentos | Anamnese | Avaliações | Dietas | Treinos | Cardio | Exames | Feedbacks | Fotos | Notas`

---

**Aba "Progresso" (mais complexa):**

*Seção 1 — Evolução de Peso:*
- Gráfico de linha (AreaChart Recharts) — peso ao longo do tempo
- Eixo X: datas dos registros; eixo Y: kg
- Ponto mais recente destacado
- Tabela abaixo: data | peso | variação (+/-)

*Seção 2 — Hidratação:*
- Última medição de consumo hídrico diário (litros)
- Evolução em linha do tempo
- Input para registrar novo dado

*Seção 3 — Percentual de Gordura:*
- Valor atual em % + evolução em mini-gráfico de linha
- Histórico de medições com data

*Seção 4 — Progressão de Exercícios por Grupo Muscular:*
- Tabs ou accordion por grupo muscular (Peitoral, Costas, Ombro, Bíceps, Tríceps, Pernas, etc.)
- Para cada exercício: ranking "Top N levantamentos" com data e carga (kg × reps)
- Botão para adicionar log manual

*Seção 5 — Avaliações (estrelas):*
- Card de avaliação geral com estrelas (1–5)
- Separado por categorias: Dieta ⭐ | Treino ⭐ | Geral ⭐
- Última avaliação do aluno (vinda do feedback mais recente)

---

**Aba "Agendamentos":**
- Lista de agendamentos futuros e passados (consultas, retornos, feedbacks programados)
- Botão "Novo agendamento" → abre modal com seleção de data/hora/tipo

**Aba "Anamnese":**
- Formulário de anamnese preenchido pelo aluno (read-only para o coach)
- Campos: objetivos, histórico de lesões, disponibilidade de treino, restrições alimentares, medicamentos, histórico cardiovascular, etc.
- Botão "Enviar link de anamnese" (gera link público para o aluno preencher)
- Status: "Respondida em [data]" ou "Aguardando resposta"

**Aba "Avaliações":**
- Registro de avaliações físicas: peso, medidas (braço, cintura, quadril, coxa, panturrilha), % gordura, bioimpedância
- Histórico de avaliações com data (timeline)
- Botão "Nova avaliação" → formulário de medidas
- Gráfico comparativo entre avaliações

**Aba "Dietas":**
- Protocolo alimentar atual atribuído ao aluno
- Visualização completa: refeições, alimentos, quantidades, macros
- Macros totais calculados: Proteína / Carboidratos / Gordura / Calorias
- Botão "Atribuir outra dieta" (dropdown da biblioteca de dietas)
- Histórico de dietas anteriores

**Aba "Treinos":**
- Plano de treino atual atribuído
- Visualização: dias da semana → sessões → exercícios com séries/reps/carga
- Histórico de treinos realizados (logs: data, exercício, séries, carga)
- Botão "Atribuir outro treino" (dropdown da biblioteca)
- Progresso visual: % dos treinos realizados no mês

**Aba "Cardio":**
- Protocolo de cardio atribuído (tipo, duração, frequência)
- Logs de cardio realizados (data, tipo, duração, distância se aplicável)
- "Sem cardio" se não houver protocolo ativo
- Botão "Adicionar protocolo de cardio"

**Aba "Exames":**
- Upload de exames laboratoriais (PDF ou imagem → Supabase Storage)
- Lista de exames com data, nome e link para download
- Botão "Enviar exame"

**Aba "Feedbacks":**
- Timeline de todos os feedbacks solicitados ao aluno
- Cada feedback: data, status (Pendente/Parcial/Respondido/Expirado), respostas às perguntas
- Fotos enviadas no feedback
- Botão "Solicitar feedback agora" (gera novo token e envia WhatsApp)
- Botão "Enviar para IA" — análise automática da resposta

**Aba "Fotos":**
- Grid de fotos organizadas por data (grupos: Frente / Costas / Lateral)
- Upload manual de novas fotos (Supabase Storage)
- Botão "Comparar fotos" → seleção de 2 datas para side-by-side
- Lightbox ao clicar na foto

**Aba "Notas":**
- Notas internas do coach (não visíveis para o aluno)
- Cada nota: data, texto, opção de **"Fixar nota"** (nota fixada = aparece em destaque na lista de Ativos com badge "N notas novas")
- Editor rich-text simples
- Filtro: Todas | Fixadas

---

**Componentes:**
- `src/pages/customers/CustomerProfilePage.tsx`
- `src/components/customers/profile/ProfileHeader.tsx` — banner + avatar + stats + botões
- `src/components/customers/profile/ProgressTab.tsx` — aba progresso completa
- `src/components/customers/profile/SchedulingTab.tsx`
- `src/components/customers/profile/AnamnesisTab.tsx`
- `src/components/customers/profile/EvaluationsTab.tsx`
- `src/components/customers/profile/DietsTab.tsx`
- `src/components/customers/profile/WorkoutsTab.tsx`
- `src/components/customers/profile/CardioTab.tsx`
- `src/components/customers/profile/ExamsTab.tsx`
- `src/components/customers/profile/FeedbacksTab.tsx`
- `src/components/customers/profile/PhotosTab.tsx`
- `src/components/customers/profile/NotesTab.tsx`
- `src/components/customers/PhotoCompare.tsx` — comparação side by side
- `src/components/customers/RenewPlanModal.tsx`
- `src/components/customers/WeightChart.tsx` — gráfico de peso (AreaChart)
- `src/components/customers/ExerciseProgressRanking.tsx` — ranking por grupo muscular

**Novas tabelas de banco necessárias:**
```sql
-- Logs de peso
weight_logs (id, coach_id, customer_id, weight_kg, recorded_at)

-- Logs de gordura corporal
body_fat_logs (id, coach_id, customer_id, body_fat_pct, recorded_at)

-- Logs de hidratação
hydration_logs (id, coach_id, customer_id, water_ml, recorded_at)

-- Logs de exercícios (progressão de carga)
exercise_logs (id, coach_id, customer_id, exercise_name, muscle_group, sets, reps, weight_kg, logged_at)

-- Logs de cardio
cardio_logs (id, coach_id, customer_id, cardio_type, duration_min, distance_km, logged_at)

-- Exames
exams (id, coach_id, customer_id, name, file_url, exam_date, uploaded_at)

-- Avaliações físicas (medidas)
customer_evaluations (id, coach_id, customer_id, weight_kg, body_fat_pct, arm_cm, waist_cm, hip_cm, thigh_cm, calf_cm, evaluated_at, notes)

-- Notas internas do coach
customer_notes (id, coach_id, customer_id, content, is_pinned, created_at, updated_at)

-- Campos extras em customers:
ALTER TABLE customers ADD COLUMN height_cm numeric;
ALTER TABLE customers ADD COLUMN app_installed boolean DEFAULT false;

-- Campo extras em consultorias:
ALTER TABLE consultorias ADD COLUMN prontidao text; -- "Pronto" | "Em progresso" | "Aguardando"
```

---

## FASE 3 — Agenda (`/schedule`) — NOVA página

**Referência visual:** screenshot confirmada do PrimeCoaching.

### Header da página:
- Título: "Minha Agenda"
- Subtítulo: "Gerencie suas consultas, retornos, feedbacks e compromissos"
- Botão topo direito: **"Seleção em massa"** (ícone de relógio/círculo) — selecionar múltiplos eventos e agir em lote

### Navegação do calendário:
- Botões ‹ › para navegar meses/semanas/dias
- Botão "Hoje" (pill arredondado) — volta para data atual
- Título centralizado: "Abril De 2026" (mês + ano)
- Switch de visão topo direito: **"Mês | Semana | Dia"** (3 botões, ativo = fundo primário)

### Visão Mês (padrão — confirmada na screenshot):
- Grade 7 colunas: DOM. SEG. TER. QUA. QUI. SEX. SÁB.
- Cada célula = um dia do mês com número no canto superior direito
- Dias do mês anterior/posterior exibidos em cinza mais suave

**Eventos dentro de cada célula:**
- Pills/chips coloridos com texto truncado: `"Feedback - Nome do Aluno..."`
- Formato: `"{Tipo} - {Nome}"` — ex: `"Feedback - Alexandre Santos..."`
- **Cor padrão: laranja/salmão** — todos os feedbacks são essa cor (confirmado)
- **Ponto verde no evento** = feedback respondido / concluído
- Sem ponto = pendente
- Máximo de 3 eventos visíveis por célula
- Quando há mais: botão **"+N Ver mais"** em azul (ex: "+81 Ver mais") — clique abre modal/painel com lista completa do dia

**Evento clicado:**
- Abre painel ou modal com detalhes
- Nome completo do aluno, tipo, status, link para perfil

### Visão Semana:
- Grade de horas × dias da semana
- Eventos posicionados no horário correto
- Eventos sem horário definido ficam no topo (all-day)

### Visão Dia:
- Timeline de horas do dia
- Todos os eventos do dia selecionado em ordem cronológica

### Seleção em Massa:
- Botão no header ativa modo de seleção
- Checkboxes aparecem nos eventos
- Barra de ações flutuante: "Marcar como respondido" | "Reagendar" | "Cancelar" | "Enviar mensagem (WhatsApp)"
- Útil para marcar dezenas de feedbacks de uma vez

### Cores de eventos (confirmadas + planejadas):
- `feedback` — **laranja/salmão** `#F97316` (confirmado na screenshot)
- `checkin` — verde `#22C55E`
- `consultation` — roxo/primário
- `birthday` — amarelo `#EAB308`
- `renewal` — azul `#3B82F6`

### Indicador de status no evento:
- **Ponto verde** no canto = respondido/concluído (confirmado na screenshot)
- Sem ponto = pendente
- Ponto vermelho = atrasado (não respondido após a data)

### Geração automática de feedbacks:
- Ao criar consultoria com `feedback_frequency_days`, gerar `appointments` em lote:
  - Data inicial = `start_date + feedback_frequency_days`
  - Repetir até `end_date`
  - Ex: consultoria de 90 dias com freq. 15 dias → 6 appointments de feedback gerados automaticamente
- Ao renovar consultoria → gerar novos appointments para o período novo

### Modal "+N Ver mais" (overflow de eventos no dia):
- Abre modal ou sheet lateral com título: "Quinta, 2 de Abril"
- Lista completa de todos os eventos do dia
- Cada item: nome, tipo, status badge (Respondido/Pendente), botão de ação

### Componentes a criar:
- `src/pages/SchedulePage.tsx` — página principal
- `src/components/schedule/CalendarMonthView.tsx` — grade mensal customizada
- `src/components/schedule/CalendarWeekView.tsx` — visão semanal
- `src/components/schedule/CalendarDayView.tsx` — visão diária
- `src/components/schedule/CalendarEventPill.tsx` — pill colorido com ponto de status
- `src/components/schedule/DayOverflowModal.tsx` — modal "+N ver mais"
- `src/components/schedule/BulkSelectBar.tsx` — barra de ações em massa
- `src/components/schedule/NewAppointmentModal.tsx` — criar evento manualmente

**Nota sobre biblioteca:** `react-big-calendar` suporta visões mês/semana/dia nativamente mas é difícil de customizar o visual. Alternativa: implementar a visão mensal **do zero** (grid CSS simples) para ter controle total dos pills e overflow — a screenshot mostra visual muito customizado que o rbc não entrega nativamente.

**Queries:**
```typescript
// Busca eventos do mês visível (inclui dias do mês anterior/posterior visíveis)
supabase.from('appointments')
  .select('id, type, status, scheduled_at, customers(id, name)')
  .eq('coach_id', user.id)
  .gte('scheduled_at', startOfCalendarGrid)   // primeiro DOM visível
  .lte('scheduled_at', endOfCalendarGrid)     // último SÁB visível
  .order('scheduled_at')

// Ao criar consultoria — gerar appointments em lote
const appointments = []
let date = addDays(startDate, freqDays)
while (date <= endDate) {
  appointments.push({ coach_id, customer_id, consultoria_id, type: 'feedback', scheduled_at: date, status: 'pending' })
  date = addDays(date, freqDays)
}
supabase.from('appointments').insert(appointments)
```

---

## FASE 4 — Bibliotecas (`/library`) — NOVA seção

### 4.1 — Treinos (`/library/workout`)

**Layout:**
- Lista de fichas de treino (cards)
- Cada card: nome, categoria, nº de exercícios, nº de alunos usando
- Botão "Nova ficha de treino"
- Busca + filtro por categoria

**Modal/página de edição de treino:**
- Nome e descrição da ficha
- Adicionar sessões de treino (Treino A, Treino B, etc.)
- Por sessão: adicionar exercícios
  - Nome do exercício
  - Séries × Repetições × Carga × Descanso
  - URL do vídeo demonstrativo (YouTube embed)
  - Notas/observações
- Reordenar exercícios via drag & drop
- Duplicar ficha existente

**Componentes:**
- `src/pages/library/LibraryWorkoutPage.tsx`
- `src/components/library/WorkoutPlanCard.tsx`
- `src/components/library/WorkoutPlanEditor.tsx` — editor completo
- `src/components/library/ExerciseRow.tsx` — linha de exercício com drag handle

### 4.2 — Dietas (`/library/diet`)

**Layout similar ao de treinos:**
- Lista de protocolos alimentares
- Cada card: nome, objetivo, calorias totais, nº de alunos usando

**Modal/página de edição de dieta:**
- Nome, objetivo (emagrecimento / hipertrofia / manutenção), calorias alvo
- Adicionar refeições (Café da manhã, Almoço, etc.)
- Por refeição: adicionar alimentos
  - Nome, quantidade, unidade (g, ml, unidade)
  - Calorias, proteína, carboidrato, gordura
  - Totais por refeição e totais do dia calculados automaticamente
- Reordenar refeições

**Componentes:**
- `src/pages/library/LibraryDietPage.tsx`
- `src/components/library/DietPlanCard.tsx`
- `src/components/library/DietPlanEditor.tsx`
- `src/components/library/MealSection.tsx`
- `src/components/library/MacroSummary.tsx` — totais de macros com gráfico pizza

---

## FASE 5 — Produtos e Planos (`/products`) — NOVA seção

**Referência visual:** screenshots confirmadas. Esta seção é muito mais complexa do que planejado inicialmente.

### 5.1 — Meus Produtos (`/products/list`)

**Header da página:**
- Título "Produtos" + subtítulo "Gerencie os seus produtos"
- Botão **"URL Prime - Todos os planos online"** → URL pública com listagem de todos os planos ativos (para o aluno escolher e comprar)
- Campo de URL copiável + botão "Copiar URL"
- Botão **"Simular Venda"** → simula o fluxo de compra de um produto
- Botão **"Novo produto"** (azul) → abre editor de produto

**Filtros (painel colapsável ▲/▼):**

Seção PRODUTO E STATUS:
- Buscar por nome (campo de texto)
- Tipo de produto: Todos os tipos / Plano / Evento / Link Avulso
- Selecionar status: Todos / Ativo / Inativo
- Selecionar atendimento: Todos os serviços / Online / Personal / Consulta
- Selecionar período: Todos / Mensal / Bimestral / Trimestral / Semestral / Anual
- Inclui: Todos / Dieta / Treino / Dieta e Treino

Seção PAGAMENTO E CONFIGURAÇÕES:
- Formas de pagamento: Todos / PIX / Cartão / PIX e Cartão
- Recorrência: Todas as cobranças / Com recorrência / Sem recorrência
- Absorve juros: Todos / Sim / Não
- Upsell: Todos / Ativo / Inativo

Seção VISIBILIDADE:
- Listagem geral: Todos / Exibindo / Não exibindo
- Listagem renovação: Todos / Exibindo / Não exibindo

Seção ORDENAÇÃO:
- Ordenar por: Nome A-Z / Nome Z-A / Preço crescente / Preço decrescente

Botões: "Filtrar" (azul) + "Limpar filtros"

**Lista de produtos (cards):**

Cada card contém:
- Checkbox para seleção em massa
- Nome do produto (bold)
- Tags coloridas: `Online` | `Ativo`/`Inativo` | `Treino` (laranja) | `Dieta` (laranja) | `PIX` | `Cartão` | `12x` | `Recorrência` (com ícone ↺)
- Links: "≡ Listagem geral" | "≡ Listagem renovação" (indicam visibilidade)
- Período + dias: "Bimestral (60 dias)", "Anual (365 dias)", etc.
- Preço: R$ XXX,XX
- URL individual copiável + botão "Copiar"
- Botão "..." (menu de ações: editar, duplicar, excluir, desativar)

---

### 5.1-B — Editor de Produto (`/products/new` e `/products/:id/edit`)

Formulário em **8 etapas numeradas** (página completa, não modal):

**Etapa 1 — Tipo de Produto** (seleção por card visual):
- 📄 **Plano** — Período e prazo definidos
- 📅 **Evento** — Data, hora e local
- 🔗 **Link Avulso** — Cobrança avulsa

**Etapa 2 — Configurações Iniciais** (4 toggles):
- **Habilitar produto** — Produto ficará disponível para venda
- **Exibir em listagem geral** — Aparecerá na listagem pública de produtos
- **Exibir produto em link de renovação** — Disponível quando aluno for renovar
- **Não exibir outros produtos no link de renovação** — Exclusividade no link de renovação (requer "Exibir em link de renovação" ativo)

**Etapa 3 — Modalidade do Produto** (seleção por card visual):
- 🌐 **Online** — Apenas consultoria online
- 🏋️ **Personal** — Personal trainer
- 👤 **Consulta** — Consulta nutricional

**Etapa 4 — O que está incluso** (multi-select por card visual):
- 🍴 **Dieta** — Plano alimentar personalizado
- 🏋️ **Treino** — Plano de treino personalizado
- (ambos podem ser selecionados ao mesmo tempo)

**Etapa 5 — Informações Básicas:**
- Nome do produto (max 100 chars, contador visível)
- Descrição (max 250 chars, contador visível)
- Prazo de entrega (número, max 50) — dias para entregar o plano após a compra

**Etapa 6 — Precificação e Pagamento:**
- Preço (campo monetário R$)
- Período: dropdown — Mensal (30 dias) / Bimestral (60 dias) / Trimestral (90 dias) / Semestral (180 dias) / Anual (365 dias) / Personalizado (X dias)
- Formas de pagamento: PIX / Cartão de crédito / PIX e cartão de crédito
- Parcelamento máximo: 1x / 2x / ... / 12x
- Toggle: **Cobrança em formato de assinatura recorrente (cartão)** — desativar para cobrança única
- Toggle: **Absorver juros do parcelamento** — coach paga as taxas de juros do cliente

**Etapa 7 — Configurações Avançadas:**
- Toggle: **Solicitar documentos na primeira compra** — ao vender este produto pela 1ª vez, solicitar automaticamente anamnese, exames e fotos de progresso
- Toggle: **Habilitar agendamento automático de feedbacks** — criar appointments de feedback automaticamente para alunos deste produto

> ⚠️ **IMPACTO ARQUITETURAL:** o agendamento automático de feedbacks é **por produto**, não global. Isso muda a lógica da Fase 3 (Agenda): ao criar consultoria com produto que tem `auto_schedule_feedbacks = true`, o sistema gera os appointments automaticamente. A frequência dos feedbacks também deve ser configurável por produto (não apenas em configurações globais).

**Etapa 8 — Oferta de Upsell:**
- Informativo: "Disponível apenas para produtos Online e sem recorrência ativa"
- Toggle: **Ativar oferta de upsell** — exibir upgrade no checkout deste produto
- Quando ativo: selecionar produto de destino do upsell (dropdown dos produtos ativos)

**Aviso ao salvar (banner amarelo):**
> "As alterações realizadas neste produto não afetarão os clientes já adicionados. Modificações entram em vigor apenas para novas vendas."
> "Para produtos com assinaturas recorrentes, alterações nos termos não são aplicadas automaticamente."

Botão: **"Salvar alterações"** (azul, fixo no rodapé)

**Componentes:**
- `src/pages/products/ProductsListPage.tsx` — lista com filtros
- `src/pages/products/ProductEditorPage.tsx` — editor em etapas (rota `/products/new` e `/products/:id/edit`)
- `src/components/products/ProductCard.tsx` — card da lista com tags + ações
- `src/components/products/ProductFilterPanel.tsx` — painel de filtros colapsável
- `src/components/products/editor/StepTypeSelector.tsx` — etapa 1 (cards de tipo)
- `src/components/products/editor/StepInitialConfig.tsx` — etapa 2 (toggles)
- `src/components/products/editor/StepModality.tsx` — etapa 3
- `src/components/products/editor/StepIncludes.tsx` — etapa 4
- `src/components/products/editor/StepBasicInfo.tsx` — etapa 5
- `src/components/products/editor/StepPricing.tsx` — etapa 6
- `src/components/products/editor/StepAdvanced.tsx` — etapa 7
- `src/components/products/editor/StepUpsell.tsx` — etapa 8
- `src/components/products/editor/ProductEditorNav.tsx` — numeração + navegação entre etapas

**Schema atualizado da tabela `plans`:**
```sql
CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  -- Etapa 1
  product_type text DEFAULT 'plan', -- 'plan' | 'event' | 'link_avulso'
  -- Etapa 2
  active boolean DEFAULT true,
  show_in_general_listing boolean DEFAULT false,
  show_in_renewal_listing boolean DEFAULT true,
  exclusive_renewal_listing boolean DEFAULT false,
  -- Etapa 3
  modality text DEFAULT 'online', -- 'online' | 'personal' | 'consulta'
  -- Etapa 4
  includes_diet boolean DEFAULT false,
  includes_workout boolean DEFAULT false,
  -- Etapa 5
  name text NOT NULL,
  description text,
  delivery_days integer DEFAULT 5,
  -- Etapa 6
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  period_label text, -- 'Mensal' | 'Bimestral' | 'Trimestral' | etc.
  payment_methods text DEFAULT 'pix_cartao', -- 'pix' | 'cartao' | 'pix_cartao'
  max_installments integer DEFAULT 12,
  is_recurring boolean DEFAULT false,
  absorb_interest boolean DEFAULT false,
  -- Etapa 7
  request_documents_on_first_purchase boolean DEFAULT false,
  auto_schedule_feedbacks boolean DEFAULT false,
  feedback_frequency_days integer DEFAULT 15, -- frequência por produto
  -- Etapa 8
  upsell_enabled boolean DEFAULT false,
  upsell_product_id uuid REFERENCES plans(id),
  -- Metadados
  url_slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON plans USING (coach_id = auth.uid());
```

---

### 5.2 — Carrinho Abandonado (`/products/cart-recovery`)

**Layout:**
- Tabela: Nome, Email, Telefone, Plano de interesse, Data, Ação
- Botão "Contatar" → abre WhatsApp com o número
- Botão "Adicionar como aluno" → cria consultoria direto
- Filtro: todos | contactado | não contactado

**Componentes:**
- `src/pages/products/CartRecoveryPage.tsx`

---

### 5.3 — Afiliados (`/products/affiliates`)

**Layout:**
- Tabela: Nome, Email, Link de afiliado, Comissão %, Vendas, Valor a pagar
- Botão "Novo afiliado"
- Cada afiliado tem um `link_code` único que gera URL de venda

**Componentes:**
- `src/pages/products/AffiliatesPage.tsx`
- `src/components/products/AffiliateModal.tsx`

---

## FASE 6 — Financeiro (`/finance`) — NOVA página

### Layout:
- Header com 3 cards: Receita do mês | A receber | Em atraso
- Barra de progresso da meta mensal
- Tabs: "Transações" | "Cobranças futuras" | "Inadimplentes"

**Tab "Transações":**
- Tabela: Data, Aluno, Plano, Valor, Método, Status
- Filtro por período (este mês / mês passado / personalizado)
- Status: Pago (verde) | Pendente (amarelo) | Em atraso (vermelho) | Reembolsado (cinza)
- Botão "Registrar pagamento manual"
- Exportar CSV

**Tab "Cobranças futuras":**
- Lista de alunos com vencimento nos próximos 30 dias
- Valor da renovação esperada
- Botão "Cobrar agora" → registra cobrança manualmente

**Tab "Inadimplentes":**
- Alunos com pagamento em atraso
- Dias em atraso, valor
- Botão "Contatar" (WhatsApp) | "Registrar pagamento" | "Marcar como perdido"

**Modal de pagamento manual:**
- Aluno (busca), valor, método (PIX/dinheiro/cartão/boleto/outro), data, observações

**Componentes:**
- `src/pages/FinancePage.tsx`
- `src/components/finance/TransactionTable.tsx`
- `src/components/finance/UpcomingChargesTab.tsx`
- `src/components/finance/OverdueTab.tsx`
- `src/components/finance/PaymentModal.tsx`
- `src/components/finance/RevenueProgressBar.tsx`

---

## FASE 7 — Notificações (tempo real) — NOVA feature transversal

**Não é uma página — é um sistema global.**

### Tipos de notificação criadas automaticamente:
- `workout_completed` — aluno marcou treino como feito (via app do aluno no futuro)
- `feedback_answered` — aluno respondeu feedback
- `photos_uploaded` — aluno enviou fotos
- `plan_renewed` — pagamento de renovação registrado
- `customer_birthday` — aniversário do aluno (cron diário via Supabase Edge Function)
- `feedback_pending` — lembrete: feedback de X dias sem resposta
- `upcoming_charge` — cobrança vencendo em 3 dias

### Implementação:
- Supabase Realtime: `supabase.channel('notifications').on('postgres_changes', ...)`
- Estado global em Zustand: `notificationStore.ts`
- Badge no header com contagem de não lidas
- Dropdown: últimas 20, scroll infinito
- Clique → navega para o contexto (perfil do aluno, feedback, etc.)
- Marcar todas como lidas

**Componentes:**
- `src/store/notificationStore.ts` — Zustand com Realtime
- `src/components/layout/NotificationsDropdown.tsx`
- `src/components/layout/NotificationBell.tsx` — ícone + badge

---

## FASE 8 — Ferramentas (`/tools`) — NOVA seção

### 8.1 — Importar Clientes (`/tools/import/customers`)

**Fluxo:**
1. Download do template CSV com as colunas esperadas
2. Upload do arquivo CSV preenchido
3. Preview da tabela com dados parsed (primeiras 5 linhas)
4. Mapeamento de colunas (se header diferente)
5. Validação: erros de formato, emails duplicados
6. Confirmação e importação em batch
7. Relatório final: X importados, Y erros (com detalhes)

**Componentes:**
- `src/pages/tools/ImportCustomersPage.tsx`
- `src/components/tools/CSVUploader.tsx`
- `src/components/tools/ImportPreviewTable.tsx`
- `src/components/tools/ImportReport.tsx`

### 8.2 — Importar Treinos/Dietas (`/tools/import/protocols`)

- Upload de planilha com estrutura de treino ou dieta
- Preview e confirmação antes de salvar na biblioteca

### 8.3 — Grupos (`/tools/groups`)

**Layout:**
- Lista de grupos criados: nome, descrição, nº de alunos
- Botão "Novo grupo"

**Dentro de um grupo:**
- Lista de alunos do grupo
- Adicionar/remover alunos
- Ações em lote:
  - "Atribuir treino para todos" → dropdown da biblioteca
  - "Atribuir dieta para todos" → dropdown da biblioteca
  - "Enviar mensagem para todos" → WhatsApp em massa (loop com delay)

**Componentes:**
- `src/pages/tools/ToolsGroupsPage.tsx`
- `src/components/tools/GroupCard.tsx`
- `src/components/tools/GroupMemberList.tsx`
- `src/components/tools/BulkMessageModal.tsx`

---

## FASE 9 — Minha Conta (`/account`) — NOVA seção + EXPANDIR settings existente

**Rota base confirmada no HTML do PrimeCoaching:** `/account/settings` e `/account/subscription`

**Separação de responsabilidades:**
- `/account/settings` — configurações do coach (coaching, perfil, automações, integrações, financeiro)
- `/account/subscription` — plano/assinatura da plataforma (SaaS — futuro)
- `/settings` — configurações do CRM existente (pipelines, tokens, Evolution, RAG) — **manter como está**

### `/account/settings` — Sub-seções (abas laterais):

**Aba "Perfil do Coach":**
- Nome, foto de perfil (upload Supabase Storage)
- Bio/descrição
- Email (somente leitura — é o auth)
- Telefone de contato

**Aba "Coaching":**
- Frequência padrão de feedback (slider: 7, 14, 15, 21, 30 dias) — usada quando produto não tem frequência própria
- Perguntas do formulário de feedback (lista editável):
  - Adicionar / remover / reordenar perguntas
  - Tipos: texto livre, escala 1-10, múltipla escolha
- Lembretes automáticos: ligar/desligar, horário de envio

**Aba "Automações":**
- WhatsApp automático: toggle global + config de mensagens padrão (boas-vindas, lembrete de feedback, vencimento de plano)
- Horário de envio dos lembretes

**Aba "Financeiro":**
- Meta mensal de receita (input com máscara monetária)
- Métodos de pagamento aceitos (checkboxes: PIX, Dinheiro, Cartão, Boleto, Outro)
- Config de gateway (Digital Manager Guru — webhook URL, mapeamento produto→plano)

**Aba "Integrações":**
- Digital Manager Guru: webhook URL gerado + mapeamento produto→plano + log de webhooks
- Hotmart / Eduzz (futuro): placeholder

### `/account/subscription`:
- Plano atual da plataforma (placeholder para SaaS futuro)
- Informações de cobrança (não implementar agora — tela de "em breve")

**Arquivos a criar/modificar:**
- `src/pages/account/AccountSettingsPage.tsx` — nova página multi-aba
- `src/pages/account/AccountSubscriptionPage.tsx` — placeholder
- Componentes em `src/components/account/`: `CoachProfileSection.tsx`, `CoachingSection.tsx`, `AutomationsSection.tsx`, `FinancialSection.tsx`, `IntegrationsSection.tsx`
- `src/pages/SettingsPage.tsx` — **não alterar** (CRM settings separado)

---

## FASE 10 — Apps (`/apps`) — NOVA página

### Layout:
- Grid de cards de integrações disponíveis

**Integrações planejadas:**
- **Hotmart** — webhook de venda automática → cria consultoria automaticamente
- **Eduzz** — idem
- **Monetizze** — idem
- **Portal do Aluno** — link único que o aluno acessa para preencher feedbacks/ver treinos
- **App Android/iOS** — informativo (futuro)

**Para Hotmart/Eduzz/Monetizze:**
- Campo de webhook URL gerado automaticamente
- Mapeamento: produto → plano do sistema
- Log de webhooks recebidos (últimos 50)

**Componentes:**
- `src/pages/AppsPage.tsx`
- `src/components/apps/IntegrationCard.tsx`
- `src/components/apps/WebhookConfig.tsx`
- `src/components/apps/WebhookLogTable.tsx`

---

## FASE 11 — Sidebar + Roteamento — ADAPTAR

### AppSidebar atual → SUBSTITUIR por sidebar com submenus colapsáveis

**Nova navegação (baseada exatamente no PrimeCoaching — screenshots confirmadas):**
```
📊 Resumo              /dashboard          ← sem submenu
📅 Agenda              /schedule           ← sem submenu
📦 Produtos            (submenu ›)
   ├ Meus Planos       /products/list
   ├ Abandonados       /products/cart-recovery
   └ Afiliados         /products/affiliates
👥 Clientes            (submenu ›)
   ├ Ativos            /customers/actives
   ├ Feedbacks         /customers/feedbacks  ← badge de pendentes
   ├ Todos             /customers/list
   ├ Engajamento       /customers/engagement
   └ Desistências      /customers/dropouts
📚 Bibliotecas         (submenu ›)          ← PLURAL conforme screenshot
   ├ Treinos           /library/workout
   └ Dietas            /library/diet
🔧 Ferramentas         (submenu ›)
   ├ Importar Clientes /tools/import/customers
   ├ Importar Treinos  /tools/import/protocols
   └ Grupos            /tools/groups
💰 Financeiro          /finance            ← sem submenu
📱 Apps                /apps               ← sem submenu
👤 Minha Conta         (submenu ›)          ← rota base /account (confirmado no HTML)
   ├ Configurações     /account/settings   ← sub-seções: Perfil, Coaching, Automações, Integrações
   └ Assinatura        /account/subscription
❓ Suporte             /support            ← sem submenu, página placeholder ou redirect externo

── SEPARADOR ── (módulo CRM existente, abaixo do coaching)
💬 WhatsApp            /whatsapp
🤖 IA / RAG            /ai-rag
🏆 Negócios (CRM)      /deals
👤 Contatos (CRM)      /contacts
⚙️ Configurações CRM   /settings
```

**Comportamento dos submenus:**
- Seta `›` vira `˅` quando aberto
- Animação suave de expansão (Framer Motion `AnimatePresence`)
- Estado salvo em localStorage por item
- Badge numérico vermelho em "Feedbacks" com contagem de pendentes (Supabase Realtime)
- Item ativo com fundo primário (igual ao PrimeCoaching — azul/roxo no nosso tema)

**Comportamento:**
- Submenus expandem/colapsam com animação (Framer Motion)
- Estado de expansão salvo no localStorage
- Badge numérico em "Feedbacks" com contagem de pendentes (Supabase Realtime)
- Sidebar colapsável para 68px (ícones apenas) — já existe no design system

**Arquivos a modificar:**
- `src/components/layout/AppSidebar.tsx` — reescrever navegação
- `src/app/App.tsx` — adicionar todas as novas rotas

**Novas rotas a registrar:**
```typescript
// Clientes
/customers/actives
/customers/feedbacks
/customers/list
/customers/engagement
/customers/dropouts
/customers/:id  ← perfil completo

// Produtos
/products/list
/products/cart-recovery
/products/affiliates

// Biblioteca
/library/workout
/library/workout/:id
/library/diet
/library/diet/:id

// Financeiro
/finance

// Ferramentas
/tools/import/customers
/tools/import/protocols
/tools/groups

// Apps
/apps

// Agenda
/schedule
```

---

## Schema SQL Completo (todas as tabelas com RLS)

```sql
-- PLANS (versão completa — ver schema detalhado na FASE 5.1-B)
CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  product_type text DEFAULT 'plan', -- 'plan' | 'event' | 'link_avulso'
  active boolean DEFAULT true,
  show_in_general_listing boolean DEFAULT false,
  show_in_renewal_listing boolean DEFAULT true,
  exclusive_renewal_listing boolean DEFAULT false,
  modality text DEFAULT 'online', -- 'online' | 'personal' | 'consulta'
  includes_diet boolean DEFAULT false,
  includes_workout boolean DEFAULT false,
  name text NOT NULL,
  description text,
  delivery_days integer DEFAULT 5,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  period_label text,
  payment_methods text DEFAULT 'pix_cartao',
  max_installments integer DEFAULT 12,
  is_recurring boolean DEFAULT false,
  absorb_interest boolean DEFAULT false,
  request_documents_on_first_purchase boolean DEFAULT false,
  auto_schedule_feedbacks boolean DEFAULT false,
  feedback_frequency_days integer DEFAULT 15,
  upsell_enabled boolean DEFAULT false,
  upsell_product_id uuid REFERENCES plans(id),
  url_slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON plans USING (coach_id = auth.uid());

-- CUSTOMERS
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  gender text, -- 'masculino' | 'feminino' | 'outro'
  birthdate date,
  height_cm numeric,
  photo_url text,
  app_installed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON customers USING (coach_id = auth.uid());

-- CONSULTORIAS
CREATE TABLE consultorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  plan_id uuid REFERENCES plans(id),
  status text DEFAULT 'active', -- 'active' | 'inactive' | 'pending'
  prontidao text, -- 'pronto' | 'em_progresso' | 'aguardando'
  start_date date NOT NULL,
  end_date date NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'pending', -- 'paid' | 'pending' | 'overdue'
  payment_method text, -- 'pix' | 'dinheiro' | 'cartao' | 'boleto' | 'outro'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE consultorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON consultorias USING (coach_id = auth.uid());

-- ANAMNESIS
CREATE TABLE anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  answers jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE anamnesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON anamnesis USING (coach_id = auth.uid());

-- FEEDBACK_FORMS (perguntas configuráveis por coach)
CREATE TABLE feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  question text NOT NULL,
  type text DEFAULT 'text', -- 'text' | 'scale' | 'choice'
  options jsonb, -- para tipo 'choice'
  order_index integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON feedback_forms USING (coach_id = auth.uid());

-- FEEDBACKS (respostas dos alunos)
CREATE TABLE feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  answers jsonb DEFAULT '{}',
  status text DEFAULT 'pending', -- 'pending' | 'partial' | 'answered' | 'seen' | 'expired'
  scheduled_for date,
  answered_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON feedbacks USING (coach_id = auth.uid());

-- PROGRESS_PHOTOS
CREATE TABLE progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  photo_url text NOT NULL,
  type text DEFAULT 'front', -- 'front' | 'back' | 'side_left' | 'side_right'
  taken_at date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON progress_photos USING (coach_id = auth.uid());

-- APPOINTMENTS
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id),
  consultoria_id uuid REFERENCES consultorias(id),
  type text NOT NULL, -- 'feedback' | 'checkin' | 'consultation' | 'birthday' | 'renewal'
  title text,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled'
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON appointments USING (coach_id = auth.uid());

-- WORKOUT_PLANS
CREATE TABLE workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  category text, -- 'musculacao' | 'funcional' | 'cardio' | 'outro'
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON workout_plans USING (coach_id = auth.uid());

-- WORKOUT_SESSIONS
CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- 'Treino A', 'Treino B', etc.
  day_label text, -- 'Segunda e Quinta', etc.
  order_index integer DEFAULT 0
);
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_plan" ON workout_sessions USING (
  EXISTS (SELECT 1 FROM workout_plans WHERE id = plan_id AND coach_id = auth.uid())
);

-- EXERCISES
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sets integer,
  reps text, -- '12-15' ou '8' ou 'até a falha'
  load text, -- '20kg' ou 'peso corporal'
  rest_seconds integer,
  video_url text,
  notes text,
  order_index integer DEFAULT 0
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_session" ON exercises USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    JOIN workout_plans wp ON wp.id = ws.plan_id
    WHERE ws.id = session_id AND wp.coach_id = auth.uid()
  )
);

-- DIET_PLANS
CREATE TABLE diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  objective text, -- 'emagrecimento' | 'hipertrofia' | 'manutencao'
  total_calories integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON diet_plans USING (coach_id = auth.uid());

-- MEALS
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id uuid REFERENCES diet_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- 'Café da manhã', 'Almoço', etc.
  time text, -- '07:00'
  order_index integer DEFAULT 0
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_plan" ON meals USING (
  EXISTS (SELECT 1 FROM diet_plans WHERE id = diet_plan_id AND coach_id = auth.uid())
);

-- MEAL_FOODS
CREATE TABLE meal_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity numeric,
  unit text DEFAULT 'g', -- 'g' | 'ml' | 'unidade' | 'colher'
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  order_index integer DEFAULT 0
);
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_meal" ON meal_foods USING (
  EXISTS (
    SELECT 1 FROM meals m
    JOIN diet_plans dp ON dp.id = m.diet_plan_id
    WHERE m.id = meal_id AND dp.coach_id = auth.uid()
  )
);

-- CUSTOMER_WORKOUT_PLANS
CREATE TABLE customer_workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  workout_plan_id uuid REFERENCES workout_plans(id) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);
ALTER TABLE customer_workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON customer_workout_plans USING (coach_id = auth.uid());

-- CUSTOMER_DIET_PLANS
CREATE TABLE customer_diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  diet_plan_id uuid REFERENCES diet_plans(id) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);
ALTER TABLE customer_diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON customer_diet_plans USING (coach_id = auth.uid());

-- WORKOUT_LOGS (treinos realizados)
CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  workout_plan_id uuid REFERENCES workout_plans(id),
  session_id uuid REFERENCES workout_sessions(id),
  completed_at timestamptz DEFAULT now(),
  notes text
);
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON workout_logs USING (coach_id = auth.uid());

-- TRANSACTIONS
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  type text DEFAULT 'payment', -- 'payment' | 'refund' | 'charge'
  amount numeric NOT NULL,
  status text DEFAULT 'pending', -- 'paid' | 'pending' | 'overdue' | 'refunded'
  payment_method text,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON transactions USING (coach_id = auth.uid());

-- REVENUE_GOALS
CREATE TABLE revenue_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  month integer NOT NULL, -- 1-12
  year integer NOT NULL,
  goal_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, month, year)
);
ALTER TABLE revenue_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON revenue_goals USING (coach_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id),
  customer_id uuid REFERENCES customers(id),
  type text NOT NULL,
  message text NOT NULL,
  link text, -- rota para navegar ao clicar
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON notifications USING (coach_id = auth.uid());

-- GROUPS
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON groups USING (coach_id = auth.uid());

-- GROUP_MEMBERS
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  added_at timestamptz DEFAULT now()
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON group_members USING (coach_id = auth.uid());

-- CART_RECOVERIES
CREATE TABLE cart_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  plan_id uuid REFERENCES plans(id),
  lead_name text NOT NULL,
  lead_email text,
  lead_phone text,
  contacted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cart_recoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON cart_recoveries USING (coach_id = auth.uid());

-- AFFILIATES
CREATE TABLE affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  email text,
  commission_percent numeric DEFAULT 10,
  link_code text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON affiliates USING (coach_id = auth.uid());

-- WEIGHT_LOGS (progressão de peso — aba Progresso do perfil)
CREATE TABLE weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  weight_kg numeric NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON weight_logs USING (coach_id = auth.uid());

-- BODY_FAT_LOGS (% gordura)
CREATE TABLE body_fat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  body_fat_pct numeric NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE body_fat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON body_fat_logs USING (coach_id = auth.uid());

-- HYDRATION_LOGS (hidratação diária)
CREATE TABLE hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  water_ml integer NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON hydration_logs USING (coach_id = auth.uid());

-- EXERCISE_LOGS (progressão de carga por exercício)
CREATE TABLE exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  muscle_group text, -- 'peitoral' | 'costas' | 'ombro' | 'biceps' | 'triceps' | 'pernas' | 'outro'
  sets integer,
  reps integer,
  weight_kg numeric,
  logged_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON exercise_logs USING (coach_id = auth.uid());

-- CARDIO_LOGS
CREATE TABLE cardio_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  cardio_type text, -- 'esteira' | 'bike' | 'eliptico' | 'corrida' | 'outro'
  duration_min integer,
  distance_km numeric,
  logged_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cardio_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON cardio_logs USING (coach_id = auth.uid());

-- EXAMS (exames laboratoriais — upload PDF/imagem)
CREATE TABLE exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  exam_date date,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON exams USING (coach_id = auth.uid());

-- CUSTOMER_EVALUATIONS (avaliações físicas completas com medidas)
CREATE TABLE customer_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  weight_kg numeric,
  body_fat_pct numeric,
  arm_cm numeric,
  waist_cm numeric,
  hip_cm numeric,
  thigh_cm numeric,
  calf_cm numeric,
  notes text,
  evaluated_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON customer_evaluations USING (coach_id = auth.uid());

-- CUSTOMER_NOTES (notas internas do coach — não visíveis ao aluno)
CREATE TABLE customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON customer_notes USING (coach_id = auth.uid());
```

---

## Ordem de Implementação

```
SPRINT 1 — Fundação (sem isso nada funciona)
  FASE 0    — Auth Supabase real + schema completo no banco (todas as 27 tabelas)
  FASE 11   — Sidebar nova com submenus + todas as novas rotas em App.tsx

SPRINT 2 — Core do negócio
  FASE 2.1  — /customers/actives (lista de ativos)
  FASE 2.6  — /customers/:id (perfil completo — 11 abas)
  FASE 2.2  — /customers/feedbacks
  FASE 12   — Formulário público /f/:token (aluno responde sem login)

SPRINT 3 — Operação diária
  FASE 1    — Dashboard expandido (métricas reais, gráfico, renovações)
  FASE 3    — Agenda (/schedule com react-big-calendar)
  FASE 7    — Notificações em tempo real (Supabase Realtime)

SPRINT 4 — Biblioteca e produtos
  FASE 4    — Biblioteca (treinos + dietas com editor drag & drop)
  FASE 5    — Produtos/planos + carrinho + afiliados
  FASE 6    — Financeiro (transações, metas, inadimplência)

SPRINT 5 — Automações e integrações
  FASE 13   — Automações WhatsApp (configurável, não ativo por padrão)
  FASE 14   — Digital Manager Guru (webhook → consultoria automática)
  FASE 9    — Settings expandido (coaching + financeiro + automações + integrações)

SPRINT 6 — Expansão de clientes
  FASE 2.3  — /customers/list (tabela completa)
  FASE 2.4  — /customers/engagement (score de engajamento)
  FASE 2.5  — /customers/dropouts (desistências + reativação)
  FASE 8    — Ferramentas (importação CSV + grupos + mensagem em massa)

SPRINT 7 — Avançado e futuro
  FASE 10   — Apps (Hotmart, Eduzz, Pagar.me configs)
  FASE 15   — Portal do aluno (placeholder + infraestrutura)
```

---

## FASE 11-B — IA no Módulo de Coaching (extensão do que já existe)

O sistema de IA já existe e funciona no CRM (deals/pipeline). O módulo de coaching pode aproveitar a mesma infraestrutura (`agent_configs`, `rag_bases`, `ai_logs`, `api_tokens`) para novos casos de uso.

### Casos de uso de IA no coaching:

**A) Análise de feedback do aluno (nova feature)**
- Quando aluno responde o formulário de feedback, a IA analisa as respostas
- Gera um resumo automático para o coach: "Aluno relatou dor no joelho, evolução positiva no peso, humor estável"
- Destaca pontos de atenção em vermelho
- Sugestão automática de ajuste no treino (baseada no RAG de treinos da biblioteca)

**B) RAG da biblioteca de treinos/dietas**
- Criar base RAG com os treinos e dietas da biblioteca do coach
- IA pode responder perguntas do coach: "Qual protocolo é melhor para hipertrofia com joelho lesionado?"
- Integra com `AIRagPage.tsx` já existente (conectar ao Supabase em vez de mock)

**C) Sugestão de renovação**
- IA analisa engajamento do aluno (treinos realizados, feedbacks, progresso)
- Gera score de probabilidade de renovação
- Sugere abordagem personalizada para a conversa de renovação

### Onde aparece na UI:
- Perfil do aluno (`/customers/:id`) → aba "Feedbacks" → botão "Analisar com IA"
- Dashboard → card de renovações → coluna "Score de Renovação (IA)"
- AIRagPage → conectar ao Supabase (remover mock)

### Tabelas já existentes que serão usadas:
- `rag_bases` — para base de treinos/dietas
- `api_tokens` — para OpenAI/Anthropic (coach já configura em Settings → Tokens)
- `ai_logs` — registrar análises feitas pela IA nos feedbacks

### Componentes a criar:
- `src/components/customers/profile/AIFeedbackAnalysis.tsx` — análise de feedback por IA
- `src/components/dashboard/RenewalScoreColumn.tsx` — score de renovação com IA

---

## FASE 12 — Formulário Público de Feedback (`/f/:token`) — NOVA rota pública

**O que é:** página acessível sem login. O coach gera um link único por aluno → manda via WhatsApp → aluno preenche no celular.

### Fluxo completo:
1. Coach clica "Solicitar feedback" no perfil do aluno
2. Sistema cria registro em `feedback_tokens` com UUID único + expiração (ex: 7 dias)
3. Sistema monta URL: `https://seusite.com/f/abc123xyz`
4. Se automação WhatsApp ativa → envia mensagem automática com o link
5. Se não ativa → copia link para área de transferência (coach envia manualmente)
6. Aluno abre o link no celular → vê formulário com perguntas configuradas pelo coach
7. Aluno preenche e envia → cria registro em `feedbacks` + marca token como usado
8. Coach recebe notificação em tempo real (Supabase Realtime)

### Layout da página pública:
- Sem sidebar, sem header do CRM
- Logo do coach + nome do aluno no topo
- Perguntas em sequência (uma por vez, estilo typeform simples)
- Botão "Enviar" → confirmação visual
- Responsivo (mobile-first — aluno acessa pelo celular)

### Tabela adicional:
```sql
CREATE TABLE feedback_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  consultoria_id uuid REFERENCES consultorias(id) NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  feedback_id uuid REFERENCES feedbacks(id),
  created_at timestamptz DEFAULT now()
);
-- SEM RLS nessa tabela — acesso público por token
-- Policy: SELECT liberado para todos (anon), INSERT/UPDATE bloqueado exceto service role
ALTER TABLE feedback_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_by_token" ON feedback_tokens FOR SELECT USING (true);
```

**Componentes:**
- `src/pages/public/FeedbackFormPage.tsx` — página pública (fora do AppLayout)
- `src/components/public/FeedbackQuestion.tsx` — pergunta individual
- `src/components/public/FeedbackProgress.tsx` — barra de progresso (pergunta X de Y)
- `src/components/public/FeedbackSuccess.tsx` — tela de confirmação

**Rota (pública, sem autenticação):**
```typescript
// Em App.tsx — fora do ProtectedRoutes
<Route path="/f/:token" element={<FeedbackFormPage />} />
```

---

## FASE 13 — Automações WhatsApp — CONFIGURÁVEL nas Settings

**Premissa:** nada é automático por padrão. O coach ativa cada automação individualmente e testa antes.

### Automações disponíveis:

| Automação | Trigger | Mensagem padrão (editável) |
|-----------|---------|---------------------------|
| Lembrete de feedback | X dias antes da data do feedback | "Olá {nome}! Seu feedback está disponível: {link}" |
| Vencimento de plano | X dias antes do `end_date` | "Olá {nome}! Seu plano vence em {dias} dias. Renove aqui: {link}" |
| Boas-vindas | Ao criar consultoria | "Bem-vindo(a) {nome}! Estou feliz em ter você aqui..." |
| Aniversário | No dia do aniversário | "Feliz aniversário, {nome}! 🎉" |
| Plano renovado | Ao registrar pagamento | "Parabéns {nome}! Seu plano foi renovado até {data}." |

### Interface nas Settings (aba "Automações"):
- Toggle liga/desliga por automação
- Configurar quantos dias antes (ex: lembrete de vencimento: 3, 5, 7 dias)
- Editor de template de mensagem com variáveis `{nome}`, `{link}`, `{data}`, `{dias}`
- Botão "Testar" → envia mensagem de teste para o próprio número do coach
- Selecionar instância WhatsApp ativa (dropdown das instâncias Evolution configuradas)
- Log de envios: últimos 50 envios com status (enviado/falhou)

### Tabelas adicionais:
```sql
CREATE TABLE whatsapp_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL, -- 'feedback_reminder' | 'plan_expiry' | 'welcome' | 'birthday' | 'renewal'
  active boolean DEFAULT false,
  days_before integer DEFAULT 3, -- para tipos com antecedência
  template text NOT NULL,
  evolution_instance text, -- nome da instância Evolution
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, type)
);
ALTER TABLE whatsapp_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON whatsapp_automations USING (coach_id = auth.uid());

CREATE TABLE whatsapp_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  automation_type text NOT NULL,
  customer_id uuid REFERENCES customers(id),
  phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'sent', -- 'sent' | 'failed'
  error_message text,
  sent_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON whatsapp_automation_logs USING (coach_id = auth.uid());
```

**Componentes:**
- `src/components/settings/AutomationsSection.tsx` — nova aba nas Settings
- `src/components/settings/AutomationCard.tsx` — toggle + template editor por automação
- `src/components/settings/AutomationLogTable.tsx` — log de envios

---

## FASE 14 — Digital Manager Guru — Webhook de vendas automáticas

**O que faz:** quando aluno compra pelo DMG, o sistema cria a consultoria automaticamente.

### Fluxo:
1. Aluno compra no DMG → DMG dispara POST para `https://seusite.com/api/webhooks/dmg`
2. Sistema valida o payload (token secreto no header)
3. Busca `customer` pelo email → se não existe, cria
4. Identifica o plano pelo `product_id` do DMG (mapeado nas Settings)
5. Cria `consultoria` com `start_date = hoje`, `end_date = hoje + plan.duration_days`
6. Cria `transaction` com status `paid`
7. Se automação "boas-vindas" ativa → envia mensagem WhatsApp
8. Cria notificação para o coach: "Nova venda: {nome}"

### Configuração nas Settings (aba "Integrações" → "Digital Manager Guru"):
- Campo: URL do webhook (gerado automaticamente, copiar com 1 clique)
- Campo: Token secreto (gerado, usado para validar requests)
- Mapeamento: Produto DMG (ID) → Plano do sistema (dropdown)
- Log: últimos 50 webhooks recebidos com payload e status
- Botão "Testar conexão" → simula um webhook de compra

### Implementação:
- Supabase Edge Function `supabase/functions/webhook-dmg/index.ts`
- Valida header `x-dmg-token`
- Cria registros via `supabase.from(...).insert()` com `service_role` key

```sql
CREATE TABLE webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id) NOT NULL,
  provider text NOT NULL, -- 'dmg' | 'pagarme' | 'hotmart' | 'eduzz'
  secret_token text NOT NULL DEFAULT gen_random_uuid()::text,
  active boolean DEFAULT false,
  product_mappings jsonb DEFAULT '[]', -- [{provider_product_id, plan_id}]
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, provider)
);
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON webhook_configs USING (coach_id = auth.uid());

CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES profiles(id),
  provider text NOT NULL,
  event_type text,
  payload jsonb,
  status text DEFAULT 'processed', -- 'processed' | 'failed' | 'ignored'
  error_message text,
  received_at timestamptz DEFAULT now()
);
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own" ON webhook_logs USING (coach_id = auth.uid());
```

**Componentes:**
- `src/components/settings/IntegrationsSection.tsx` — aba nova nas Settings
- `src/components/settings/DMGWebhookConfig.tsx`
- `src/components/settings/WebhookLogTable.tsx`
- `supabase/functions/webhook-dmg/index.ts` — Edge Function

---

## FASE 15 — Portal do Aluno (placeholder + futuro)

**Agora:** criar apenas a infraestrutura e a rota, sem funcionalidade completa.

**Rota pública:** `/portal` → página informativa "Em breve: acesse seus treinos e dietas aqui"

**O que já preparar no banco:**
```sql
-- Token de acesso do aluno ao portal (futuro login)
ALTER TABLE customers ADD COLUMN portal_token text UNIQUE;
ALTER TABLE customers ADD COLUMN portal_enabled boolean DEFAULT false;
```

**Futuro (fora do escopo atual):**
- `/portal/login` — aluno entra com email ou link mágico
- `/portal/feedback` — responde feedback (substituindo o link único)
- `/portal/treino` — vê e marca treinos
- `/portal/dieta` — vê protocolo alimentar
- `/portal/fotos` — envia fotos de progresso
- `/portal/financeiro` — vê status do plano e pagamentos

---

## Stack de Dependências a Instalar

```bash
# Gráficos
npm install recharts

# Agenda
npm install react-big-calendar date-fns
npm install @types/react-big-calendar

# Drag & drop (editor de exercícios e refeições)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Upload de arquivos (fotos e CSV)
npm install react-dropzone

# Parsing de CSV e planilhas
npm install papaparse @types/papaparse
npm install xlsx

# Máscaras de input (valores monetários, telefone)
npm install react-imask

# Geração de tokens únicos (feedback tokens)
# Nativo via crypto.randomUUID() — sem dependência extra

# Editor de texto rico (templates de mensagem WhatsApp)
# Usar textarea com placeholder de variáveis — sem dependência extra
```

---

## Observações Críticas

1. **`contacts` table existente:** DashboardPage e ContactsPage já usam `contacts` do Supabase. A nova tabela será `customers`. Coexistem: `contacts` = CRM de leads/negócios, `customers` = alunos do coaching.

2. **Auth JÁ é Supabase Auth:** `authStore.ts` já usa `supabase.auth.signInWithPassword()` — **não precisa migrar**. FASE 0.2 já está concluída. A primeira tarefa real é criar as novas tabelas no banco.

3. **Supabase Storage:** criar buckets separados:
   - `profile-photos` — fotos de perfil de alunos e coach
   - `progress-photos` — fotos de progresso (privadas por coach)
   - Policies: leitura autenticada (coach vê só os próprios), escrita autenticada

4. **Rota pública `/f/:token`:** deve ser registrada FORA do `ProtectedRoutes` em `App.tsx`. O aluno não tem conta — acessa só pelo token.

5. **Automações WhatsApp — não ativas por padrão:** toda lógica de envio automático fica travada por `automation.active = false`. O coach precisa entrar em Settings → Automações, configurar template, testar e ativar manualmente.

6. **Digital Manager Guru — Supabase Edge Function:** o webhook precisa de um endpoint público. Usar Edge Function do Supabase (não uma rota React) — React é client-side e não pode receber webhooks.

7. **Seção "prime" nas Settings:** manter por ora. Quando as features do coaching estiverem todas implementadas no próprio sistema, a seção será removida — o sistema SE TORNA o Prime para o coach.

8. **Arquitetura SaaS-ready sem UI multi-tenant:** `coach_id` em todas as 27 tabelas garante isolamento. Futuramente: criar tela de registro de novos coaches + planos de assinatura, sem mudar o modelo de dados.

9. **AIRagPage:** manter sem alterar por ora. Conectar ao Supabase em sprint futuro separado (fora do escopo das 15 fases).

10. **DealsPage e ContactsPage (CRM pipeline):** manter intactos — são o funil de vendas/leads. O módulo de coaching (`/customers`) é separado e complementar.

11. **`Marco.csv`:** ignorar na implementação. Futuro: usar a feature de importação CSV (Fase 8) para trazer os dados quando estiver pronto.

12. **Todos os botões funcionais:** regra do projeto — nenhum elemento interativo pode existir sem ação real. Mínimo aceitável: `toast("Em desenvolvimento")` se feature vier em sprint futuro.
