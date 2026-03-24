-- ============================================================
-- Migration 002 — Tabelas Evolution API, Webhooks e RAG
-- ============================================================

-- Configuração da Evolution API (uma linha por organização)
create table if not exists evolution_config (
  id uuid primary key default gen_random_uuid(),
  api_url text not null,
  api_token text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Webhook URL imutável por instância (nunca muda após criação)
create table if not exists instance_webhooks (
  id uuid primary key default gen_random_uuid(),
  instance_name text not null unique,
  webhook_token uuid not null default gen_random_uuid(),
  created_at timestamptz default now()
);

-- Jobs de geração de RAG
create table if not exists rag_jobs (
  id uuid primary key default gen_random_uuid(),
  instance_name text not null,
  message_limit integer not null,
  status text not null check (status in ('pending', 'processing', 'done', 'error')) default 'pending',
  total_messages integer,
  total_chunks integer,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chunks de RAG gerados
create table if not exists rag_chunks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references rag_jobs(id) on delete cascade,
  instance_name text not null,
  chat_id text not null,
  contact_name text,
  content text not null,
  message_count integer not null default 0,
  chunk_index integer not null default 0,
  created_at timestamptz default now()
);

-- RLS
alter table evolution_config enable row level security;
alter table instance_webhooks enable row level security;
alter table rag_jobs enable row level security;
alter table rag_chunks enable row level security;

create policy "Acesso autenticado — evolution_config" on evolution_config for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — instance_webhooks" on instance_webhooks for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — rag_jobs" on rag_jobs for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — rag_chunks" on rag_chunks for all using (auth.role() = 'authenticated');

-- Índices
create index if not exists idx_rag_chunks_job_id on rag_chunks(job_id);
create index if not exists idx_rag_chunks_instance on rag_chunks(instance_name);
create index if not exists idx_rag_jobs_instance on rag_jobs(instance_name);
