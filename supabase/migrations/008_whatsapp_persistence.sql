-- ============================================================
-- Migration 008 — Persistência de mensagens WhatsApp
-- Conversas e mensagens armazenadas localmente para leitura rápida
-- ============================================================

-- Conversas: uma por (instância + remote_jid)
create table if not exists conversas_whatsapp (
  id               uuid primary key default gen_random_uuid(),
  instance_name    text not null,
  remote_jid       text not null,
  remote_jid_alt   text,                                       -- JID real (@s.whatsapp.net) quando remote_jid é @lid
  contato_nome     text default '',
  contato_telefone text default '',
  ultima_mensagem  text default '',
  ultima_mensagem_em timestamptz,
  nao_lidas        integer default 0,
  status           text check (status in ('pending','unanswered','answered')) default 'pending',
  criado_em        timestamptz default now(),
  atualizado_em    timestamptz default now(),
  unique(instance_name, remote_jid)
);

-- Mensagens: cada mensagem individual (entrada ou saída)
create table if not exists mensagens_whatsapp (
  id                   uuid primary key default gen_random_uuid(),
  instance_name        text not null,
  remote_jid           text not null,
  push_name            text,
  corpo                text default '',
  tipo                 text default 'text',                    -- text, audio, image, video, document, sticker
  direcao              text check (direcao in ('entrada','saida')) not null,
  external_message_id  text,
  message_timestamp    bigint,                                 -- unix timestamp original da Evolution API
  enviada_em           timestamptz,
  criado_em            timestamptz default now(),
  unique(instance_name, external_message_id)
);

-- ============================================================
-- Índices
-- ============================================================

create index if not exists idx_conversas_wpp_instance
  on conversas_whatsapp(instance_name);

create index if not exists idx_conversas_wpp_telefone
  on conversas_whatsapp(contato_telefone);

create index if not exists idx_mensagens_wpp_conversa
  on mensagens_whatsapp(instance_name, remote_jid, enviada_em);

create index if not exists idx_mensagens_wpp_timestamp
  on mensagens_whatsapp(instance_name, remote_jid, message_timestamp);

-- ============================================================
-- RLS
-- ============================================================

alter table conversas_whatsapp enable row level security;
alter table mensagens_whatsapp enable row level security;

create policy "Acesso autenticado — conversas_whatsapp"
  on conversas_whatsapp for all using (auth.role() = 'authenticated');

create policy "Acesso autenticado — mensagens_whatsapp"
  on mensagens_whatsapp for all using (auth.role() = 'authenticated');
