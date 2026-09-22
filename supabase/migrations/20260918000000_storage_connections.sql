-- Tabela de conexões de storage por escritório.
-- Tokens criptografados — nunca expostos ao frontend.
-- Acesso somente via Edge Functions (service_role bypassa RLS).

create table if not exists public.storage_connections (
  id              uuid        primary key default gen_random_uuid(),
  escritorio_id   text        not null unique,
  provider        text        not null check (provider in ('local','supabase','google_drive','onedrive','dropbox')),
  status          text        not null default 'conectado' check (status in ('conectado','reconectar','desconectado')),
  conta_email     text,
  root_folder_id  text,
  conectado_por   text        not null,
  conectado_em    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- tokens (somente acessíveis via Edge Function com service_role)
  access_token_enc  text,
  refresh_token_enc text,
  token_expires_at  timestamptz
);

alter table public.storage_connections enable row level security;

-- Sem políticas: frontend nunca deve acessar esta tabela diretamente.
-- Edge Functions usam service_role e ignoram RLS.
