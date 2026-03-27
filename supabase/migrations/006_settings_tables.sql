-- ============================================================
-- Migration 006 — Tabelas de configurações do sistema
-- ============================================================

-- Configurações da empresa
create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz default now()
);

-- Seed: garante uma linha padrão
insert into company_settings (company_name, contact_email, phone, timezone)
select '', '', '', 'America/Sao_Paulo'
where not exists (select 1 from company_settings);

-- Pipelines
create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Fases dos pipelines
create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  color text not null default '#9d66ff',
  created_at timestamptz default now()
);

-- Coluna pipeline_id em deals
alter table deals add column if not exists pipeline_id uuid references pipelines(id) on delete set null;

-- Endpoints Prime
create table if not exists prime_endpoints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  method text not null default 'POST',
  description text,
  auth_token text,
  created_at timestamptz default now()
);

-- Tokens de API (OpenAI, Anthropic, etc.)
create table if not exists api_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  label text not null default '',
  token text not null,
  created_at timestamptz default now()
);

-- Propriedades customizadas (negócios e contatos)
create table if not exists crm_properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Texto',
  object_type text not null default 'Negócio',
  required boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table company_settings enable row level security;
alter table pipelines enable row level security;
alter table pipeline_stages enable row level security;
alter table prime_endpoints enable row level security;
alter table api_tokens enable row level security;
alter table crm_properties enable row level security;

create policy "Acesso autenticado — company_settings" on company_settings for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — pipelines" on pipelines for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — pipeline_stages" on pipeline_stages for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — prime_endpoints" on prime_endpoints for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — api_tokens" on api_tokens for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — crm_properties" on crm_properties for all using (auth.role() = 'authenticated');

-- ============================================================
-- Índices
-- ============================================================

create index if not exists idx_pipeline_stages_pipeline_id on pipeline_stages(pipeline_id);
create index if not exists idx_pipeline_stages_order on pipeline_stages(pipeline_id, order_index);
create index if not exists idx_deals_pipeline_id on deals(pipeline_id);
create index if not exists idx_api_tokens_provider on api_tokens(provider);
create index if not exists idx_crm_properties_object_type on crm_properties(object_type);

-- ============================================================
-- Seed: pipeline padrão
-- ============================================================

do $$
declare
  v_pipeline_id uuid;
begin
  if not exists (select 1 from pipelines) then
    insert into pipelines (name) values ('Atendimento IA') returning id into v_pipeline_id;

    insert into pipeline_stages (pipeline_id, name, order_index, color) values
      (v_pipeline_id, 'Novo Lead',        0, '#6b7280'),
      (v_pipeline_id, 'Contato Feito',    1, '#3b82f6'),
      (v_pipeline_id, 'Proposta Enviada', 2, '#8b5cf6'),
      (v_pipeline_id, 'Negociação',       3, '#f59e0b'),
      (v_pipeline_id, 'Ganho',            4, '#10b981'),
      (v_pipeline_id, 'Perdido',          5, '#ef4444'),
      (v_pipeline_id, 'Inativo',          6, '#6b7280');
  end if;
end $$;
