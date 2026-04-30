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

## Deploy

**Este projeto é hospedado no Lovable.** Todo deploy deve ser feito via Lovable — nunca via `npm run build` diretamente para produção.

Para publicar alterações:
1. Faça as edições normalmente neste repositório
2. Acesse o painel do Lovable e faça o deploy a partir do repositório conectado

**Nunca sugerir Vercel, Netlify ou outros hosts** — o destino é sempre Lovable.

---

## Convenções

- Todo texto de UI em **português**
- Novos dados mock em `src/data/mockData.ts`
- Componentes shadcn adicionados via CLI, nunca editados manualmente

---

## Regras Obrigatórias de Qualidade

### Uso de Agentes AIOX — TODOS SEM EXCEÇÃO

Todos os agentes do framework Synkra AIOX devem ser utilizados em seus respectivos domínios. Nenhum agente pode ser pulado ou ignorado:

| Agente | Quando usar |
|--------|------------|
| `@sm` | Criação de todas as stories |
| `@po` | Validação de toda story antes de implementar |
| `@dev` | Toda implementação de código |
| `@qa` | Gate de qualidade após cada implementação |
| `@architect` | Decisões de arquitetura e design técnico |
| `@data-engineer` | Schema, RLS, policies, migrações |
| `@ux-design-expert` | Design de interfaces e UX |
| `@pm` | Epics, requirements, spec pipeline |
| `@analyst` | Pesquisa, análise, brownfield discovery |
| `@devops` | Git push, PRs, CI/CD (EXCLUSIVO) |
| `@aiox-master` | Governança, escalações, override |

**Nunca pular etapas do ciclo:** `@sm draft → @po validate → @dev implement → @qa gate → @devops push`

---

### Agente Planejador — Pensamento Completo

O agente responsável por planejamento (`@architect`, `@pm`, `@po`) **deve pensar por completo**, não apenas o mínimo necessário:

- Mapear **todos** os impactos da mudança (componentes, stores, rotas, tipos)
- Listar **todos** os arquivos que serão criados ou modificados
- Identificar **todos** os edge cases e riscos antes de implementar
- Nunca iniciar implementação com planejamento parcial

---

### UI — Todos os Botões e Elementos Devem Ser Funcionais

**REGRA INVIOLÁVEL:** Nenhum botão, link, aba, menu ou elemento interativo pode existir sem funcionalidade real implementada.

- Proibido usar `onClick={() => {}}` vazio ou `href="#"` sem ação
- Proibido renderizar botões que não executam nenhuma ação
- Todo elemento clicável deve: executar uma ação, navegar para uma rota, abrir um modal, ou exibir um toast informativo
- Se a funcionalidade ainda não existe, exibir toast: `"Funcionalidade em desenvolvimento"`
- Antes de entregar qualquer feature, verificar **todos** os elementos interativos da tela

---

### Segurança — RLS e Policies em Todas as Tabelas

O agente `@data-engineer` (e `@qa` na revisão) deve garantir:

- **Toda tabela** no banco de dados deve ter RLS (Row Level Security) habilitado
- **Toda tabela** deve ter ao menos uma policy definida (SELECT, INSERT, UPDATE, DELETE conforme necessário)
- Nenhuma migração pode ser aprovada sem RLS configurado na tabela correspondente
- Revisar RLS existente a cada nova tabela adicionada
- Documentar policies no arquivo de migration com comentários explicando o escopo de acesso
