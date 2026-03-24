-- ============================================================
-- RebucciAI CRM — Schema inicial
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Instâncias WhatsApp
create table if not exists instances (
  id text primary key,
  name text not null,
  phone text not null,
  status text not null check (status in ('online', 'offline')),
  created_at timestamptz default now()
);

-- Contatos CRM
create table if not exists contacts (
  id text primary key default 'ct-' || gen_random_uuid()::text,
  name text not null,
  email text not null unique,
  phone text not null unique,
  company text not null default '',
  status text not null check (status in ('active', 'inactive', 'lead')) default 'lead',
  created_at date not null default current_date,
  activation_date date,
  end_date date,
  last_feedback date,
  next_feedback date
);

-- Conversas WhatsApp
create table if not exists conversations (
  id text primary key,
  instance_id text not null references instances(id) on delete cascade,
  contact_name text not null,
  contact_phone text not null,
  last_message text not null default '',
  last_message_time text not null default '',
  unread_count integer not null default 0,
  status text not null check (status in ('pending', 'unanswered', 'answered')) default 'pending',
  created_at timestamptz default now()
);

-- Mensagens de chat
create table if not exists chat_messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  content text not null,
  type text not null check (type in ('text', 'audio', 'image')) default 'text',
  direction text not null check (direction in ('sent', 'received')),
  timestamp timestamptz not null default now(),
  image_url text
);

-- Negócios (Kanban)
create table if not exists deals (
  id text primary key default 'deal-' || gen_random_uuid()::text,
  title text not null,
  contact_name text not null,
  value numeric(12, 2) not null default 0,
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  stage text not null default 'Novo Lead',
  contact_id text references contacts(id) on delete set null,
  phone text,
  responsible_user text,
  "group" text,
  created_at timestamptz default now()
);

-- Bases de conhecimento RAG
create table if not exists rag_bases (
  id text primary key,
  name text not null,
  origin text not null,
  document_count integer not null default 0,
  created_at date not null default current_date
);

-- Configurações do agente IA (uma por instância)
create table if not exists agent_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default 'openai',
  instance_name text not null,
  active boolean not null default true,
  system_prompt text not null default '',
  prompt_complement text not null default '',
  welcome_message_enabled boolean not null default true,
  welcome_message_type text not null check (welcome_message_type in ('text', 'audio', 'image')) default 'text',
  welcome_message_content text not null default '',
  conversation_start text not null check (conversation_start in ('on_create', 'wait_first_message')) default 'on_create',
  grouping_delay integer not null default 3,
  response_delay integer not null default 1,
  questions jsonb not null default '[]',
  auto_evaluation boolean not null default false,
  rag_base_id text references rag_bases(id) on delete set null,
  rag_enabled boolean not null default false,
  rag_max_turns integer not null default 10,
  follow_ups jsonb not null default '[]',
  transitions jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Políticas de segurança (RLS)
-- ============================================================

alter table instances enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table chat_messages enable row level security;
alter table deals enable row level security;
alter table rag_bases enable row level security;
alter table agent_configs enable row level security;

-- Acesso autenticado completo (ajuste conforme regras de negócio)
create policy "Acesso autenticado — instances" on instances for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — contacts" on contacts for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — conversations" on conversations for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — chat_messages" on chat_messages for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — deals" on deals for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — rag_bases" on rag_bases for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — agent_configs" on agent_configs for all using (auth.role() = 'authenticated');

-- ============================================================
-- Índices
-- ============================================================

create index if not exists idx_conversations_instance_id on conversations(instance_id);
create index if not exists idx_chat_messages_conversation_id on chat_messages(conversation_id);
create index if not exists idx_deals_stage on deals(stage);
create index if not exists idx_deals_contact_id on deals(contact_id);
create index if not exists idx_contacts_status on contacts(status);
