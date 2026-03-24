# RebucciAI CRM — CLAUDE.md

## Visão Geral

CRM com IA para gestão de leads, contatos, negócios e atendimento via WhatsApp.
Stack: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand.
Projeto frontend puro (sem backend). Dados mockados em `src/data/mockData.ts`.

---

## Estrutura de Pastas

```
src/
├── components/
│   ├── layout/          # AppLayout.tsx, AppSidebar.tsx
│   ├── deals/           # AIAgentModal.tsx, DealDetailPanel.tsx
│   ├── shared/          # Componentes reutilizáveis (NavLink.tsx)
│   └── ui/              # Componentes shadcn/ui (não editar diretamente)
├── pages/               # Uma página por rota
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── WhatsAppPage.tsx
│   ├── ContactsPage.tsx
│   ├── DealsPage.tsx
│   ├── SettingsPage.tsx
│   └── AIRagPage.tsx
├── store/               # Estado global com Zustand
│   ├── authStore.ts     # Autenticação
│   ├── chatStore.ts     # WhatsApp (instâncias, conversas, mensagens)
│   └── dealStore.ts     # Negócios e estágios kanban
├── data/
│   └── mockData.ts      # Todos os dados mock + interfaces TypeScript
├── hooks/
│   ├── use-mobile.tsx   # Detecta viewport mobile (breakpoint 768px)
│   └── use-toast.ts     # Notificações toast
├── lib/
│   └── utils.ts         # cn(), stripPhone(), formatPhone()
└── test/
    ├── setup.ts
    └── example.test.ts
```

---

## Roteamento (src/App.tsx)

```
/              → redireciona para /dashboard ou /login
/login         → LoginPage (pública)
/dashboard     → DashboardPage (protegida)
/whatsapp      → WhatsAppPage (protegida)
/contacts      → ContactsPage (protegida)
/deals         → DealsPage (protegida)
/settings      → SettingsPage (protegida)
```

Rotas protegidas verificam `authStore.isAuthenticated`. Se não autenticado → redireciona para `/login`.

---

## Layout

`AppLayout` → `h-screen overflow-hidden` com sidebar + main.
Todas as páginas devem usar `flex flex-col h-full overflow-hidden` para respeitar o layout fixo.
Seções que não rolam usam `shrink-0`. Seções que rolam usam `flex-1 overflow-auto`.

---

## Design System

- **Tema:** dark mode fixo (class-based)
- **Fonte:** Inter (300–800)
- **Cores:** variáveis CSS HSL em `src/index.css` (primary = roxo #9d66ff, accent = teal)
- **Utilitário `.surface-elevated`:** card com sombra (definido em index.css)
- **Animações:** Framer Motion — fade-in, slide-in, motion.tr nas tabelas
- **Ícones:** Lucide React

### Classes utilitárias customizadas (index.css)
- `.glass` — card com opacidade 80% + backdrop-blur
- `.surface-elevated` — card com shadow-md
- `.text-gradient` — texto com gradiente primary
- `.glow` — sombra roxa

---

## Estado Global (Zustand)

### authStore
- `user` — `{ id, email, name, role, avatar }`
- `isAuthenticated` — boolean
- `login(email, password)` — mock, valida contra hash
- `logout()`
- Credencial de teste: `marcos.schuldz@gmail.com` / `Violeiro12`

### chatStore
- `instances`, `conversations`, `messages`
- `selectedInstanceId`, `selectedConversationId`
- `sendMessage(content)` — auto-responde após 1.5s

### dealStore
- `deals`, `stages` (7 estágios kanban)
- `selectedDealId`
- `moveDeal(dealId, newStage)`, `addDeal()`, `updateDeal()`

---

## Interfaces TypeScript (src/data/mockData.ts)

- `Instance` — conexão WhatsApp
- `ChatMessage` — mensagem de chat (text/audio/image, sent/received)
- `Conversation` — conversa com status (pending/unanswered/answered)
- `Contact` — contato CRM com datas (ativação, término, feedbacks)
- `Deal` — negócio com valor, estágio, prioridade
- `RAGBase` — base de conhecimento IA
- `AgentConfig` — configuração do agente IA

---

## Utilitários (src/lib/utils.ts)

```typescript
cn(...inputs)          // merge de classes tailwind
stripPhone(phone)      // remove não-dígitos
formatPhone(phone)     // formata: +55 11 98765-4321
```

---

## Scripts

```bash
npm run dev      # servidor de desenvolvimento (porta 8080)
npm run build    # build de produção
npm run lint     # ESLint
npm run test     # Vitest (unitário)
```

---

## Convenções

- Português para todo texto de UI
- Sem backend — dados em `src/data/mockData.ts`
- shadcn/ui em `src/components/ui/` — não editar diretamente, usar via CLI shadcn
- Alias `@/` aponta para `src/`
- Páginas novas devem ser adicionadas em `src/pages/` e registradas em `App.tsx`
