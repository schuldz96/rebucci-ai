-- ============================================================
-- Migration 003 — Usuários CRM, Equipes, Permissões e Pré-definições
-- ============================================================

-- Equipes
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Conjuntos de permissão
create table if not exists permission_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Usuários CRM (perfis gerenciados pelo admin, separados do auth.users)
create table if not exists crm_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'Agente',
  team_id uuid references teams(id) on delete set null,
  permission_set_id uuid references permission_sets(id) on delete set null,
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamptz default now()
);

-- Pré-definições (respostas rápidas, tags, etc.)
create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Resposta rápida',
  content text,
  created_at timestamptz default now()
);

-- RLS
alter table teams enable row level security;
alter table permission_sets enable row level security;
alter table crm_users enable row level security;
alter table presets enable row level security;

create policy "Acesso autenticado — teams" on teams for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — permission_sets" on permission_sets for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — crm_users" on crm_users for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado — presets" on presets for all using (auth.role() = 'authenticated');

-- Índices
create index if not exists idx_crm_users_team on crm_users(team_id);
create index if not exists idx_crm_users_status on crm_users(status);

-- Seed: usuário admin inicial (ajuste o email se necessário)
insert into crm_users (name, email, role, status)
values ('Marcos Schuldz', 'marcos.schuldz@gmail.com', 'Admin', 'active')
on conflict (email) do nothing;
