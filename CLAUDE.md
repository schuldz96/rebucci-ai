# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RebucciAI CRM

CRM com IA para gestão de leads, contatos, negócios e atendimento via WhatsApp.
Stack: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand.
**Projeto frontend puro — sem backend. Todos os dados estão em `src/data/mockData.ts`.**

---

## Comandos

```bash
npm run dev      # dev server na porta 8080
npm run build    # build de produção
npm run lint     # ESLint
npm run test     # Vitest
```

Adicionar componente shadcn: `npx shadcn@latest add <componente>` (nunca editar `src/components/ui/` manualmente).

---

## Estrutura

```
src/
├── main.tsx              # Entry point Vite (referenciado em index.html)
├── vite-env.d.ts
├── app/
│   └── App.tsx           # Roteamento + providers (QueryClient, Toaster, BrowserRouter)
├── styles/
│   └── index.css         # Tokens CSS HSL, utilitários (.glass, .surface-elevated, .glow, .text-gradient)
├── components/
│   ├── layout/           # AppLayout (h-screen flex), AppSidebar (colapsável 68px/240px)
│   ├── deals/            # AIAgentModal (7 abas), DealDetailPanel
│   ├── shared/           # NavLink
│   └── ui/               # shadcn/ui — não editar
├── pages/                # Uma página por rota
├── store/                # Zustand: authStore, chatStore, dealStore
├── data/
│   └── mockData.ts       # Dados mock + todas as interfaces TypeScript
├── hooks/                # use-mobile (breakpoint 768px), use-toast
├── lib/
│   └── utils.ts          # cn(), stripPhone(), formatPhone()
└── test/
```

---

## Roteamento (`src/app/App.tsx`)

```
/           → redireciona para /dashboard ou /login
/login      → LoginPage (pública)
/dashboard  → DashboardPage  ┐
/whatsapp   → WhatsAppPage   │ protegidas — verificam authStore.isAuthenticated
/contacts   → ContactsPage   │ se não autenticado → /login
/deals      → DealsPage      │
/settings   → SettingsPage   ┘
```

Para adicionar página: criar em `src/pages/`, registrar em `src/app/App.tsx`.

---

## Layout (regra crítica)

`AppLayout` usa `h-screen overflow-hidden`. **Toda página deve seguir este padrão:**

```tsx
<div className="flex flex-col h-full overflow-hidden">
  <div className="shrink-0">...</div>        {/* header/filtros — não rola */}
  <div className="flex-1 overflow-auto">...</div>  {/* conteúdo — rola */}
</div>
```

Quebrar esse padrão causa scroll na página inteira em vez de scroll interno.

---

## Estado Global (Zustand)

- **authStore** — `user`, `isAuthenticated`, `login()`, `logout()`
  Credencial mock: `marcos.schuldz@gmail.com` / `Violeiro12`
- **chatStore** — instâncias WhatsApp, conversas, mensagens. `sendMessage()` auto-responde em 1.5s
- **dealStore** — deals, 7 estágios kanban, `moveDeal()`, `addDeal()`, `updateDeal()`

---

## Design System

- **Tema:** dark mode fixo (class-based via Tailwind)
- **Fonte:** Inter (300–800)
- **Cores:** variáveis HSL em `src/styles/index.css` — primary = roxo `#9d66ff`, accent = teal
- **Animações:** Framer Motion (`motion.tr` em tabelas, fade-in, slide-in)
- **Ícones:** Lucide React
- Alias `@/` → `src/`

---

## Interfaces TypeScript

Todas definidas em `src/data/mockData.ts`:
`Instance`, `ChatMessage`, `Conversation`, `Contact`, `Deal`, `RAGBase`, `AgentConfig`

---

## Convenções

- Todo texto de UI em **português**
- Novos dados mock em `src/data/mockData.ts`
- Componentes shadcn adicionados via CLI, nunca editados manualmente
