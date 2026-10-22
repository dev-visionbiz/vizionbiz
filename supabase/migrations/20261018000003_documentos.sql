-- ============================================================
-- VisionBiz — Documentos: tabelas e RLS
-- Migration: 20261018000003_documentos
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims.
-- ============================================================


-- ------------------------------------------------------------
-- folders
-- ------------------------------------------------------------
create table if not exists public.folders (
  id           text    primary key,
  tenant_id    text    not null,
  client_id    text    not null,
  parent_id    text,
  nome         text    not null,
  tipo_padrao  text    check (tipo_padrao in ('fiscal','dp','contabil','societario','outros')),
  sistema      boolean not null default false
);

create index if not exists folders_tenant on public.folders(tenant_id);
create index if not exists folders_client on public.folders(tenant_id, client_id);

alter table public.folders enable row level security;

create policy "folders_select_dev"
  on public.folders for select
  using (true);

create policy "folders_all_dev"
  on public.folders for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- document_types
-- ------------------------------------------------------------
create table if not exists public.document_types (
  id          text    primary key,
  tenant_id   text    not null,
  nome        text    not null,
  essencial   boolean not null default false,
  tem_validade boolean not null default false
);

create index if not exists document_types_tenant on public.document_types(tenant_id);

alter table public.document_types enable row level security;

create policy "document_types_select_dev"
  on public.document_types for select
  using (true);

create policy "document_types_all_dev"
  on public.document_types for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- documents
-- NOTE: storage_key stores only the relative path — never a URL.
--       URLs are generated on demand via storageService.gerarUrlDownload.
-- ------------------------------------------------------------
create table if not exists public.documents (
  id                       text        primary key,
  tenant_id                text        not null,
  client_id                text        not null,
  folder_id                text,
  type_id                  text,
  nome                     text        not null,
  competencia              text,
  versao                   integer     not null default 1,
  storage_key              text        not null,
  tamanho                  integer,
  mime                     text,
  criado_por               text,
  criado_em                timestamptz not null default now(),
  invoice_id               text,
  download_apos_pagamento  boolean,
  data_validade            text,
  provider                 text,
  provider_file_id         text,
  storage_status           text        check (storage_status in ('ok','arquivo_ausente'))
);

create index if not exists documents_tenant on public.documents(tenant_id);
create index if not exists documents_client on public.documents(tenant_id, client_id);
create index if not exists documents_folder on public.documents(folder_id);

alter table public.documents enable row level security;

create policy "documents_select_dev"
  on public.documents for select
  using (true);

create policy "documents_all_dev"
  on public.documents for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- document_event_records
-- ------------------------------------------------------------
create table if not exists public.document_event_records (
  id          text        primary key,
  document_id text        not null,
  user_id     text,
  evento      text        check (evento in ('upload','download','view','share')),
  ip          text,
  em          timestamptz not null default now()
);

create index if not exists document_event_records_document on public.document_event_records(document_id);

alter table public.document_event_records enable row level security;

create policy "document_event_records_select_dev"
  on public.document_event_records for select
  using (true);

create policy "document_event_records_all_dev"
  on public.document_event_records for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- share_links
-- ------------------------------------------------------------
create table if not exists public.share_links (
  id          text    primary key,
  document_id text    not null,
  token       text    not null unique,
  expira_em   text    not null,
  senha       text
);

create index if not exists share_links_document on public.share_links(document_id);
create index if not exists share_links_token on public.share_links(token);

alter table public.share_links enable row level security;

create policy "share_links_select_dev"
  on public.share_links for select
  using (true);

create policy "share_links_all_dev"
  on public.share_links for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- storage_connections
-- NOTE: tokens are stored encrypted and accessed only via Edge Functions
--       (service_role bypasses RLS). Frontend never reads this table directly.
-- ------------------------------------------------------------
create table if not exists public.storage_connections (
  id              text    primary key,
  escritorio_id   text    not null,
  provider        text    check (provider in ('local','supabase','google_drive','onedrive','dropbox')),
  status          text    check (status in ('conectado','reconectar','desconectado')),
  conta_email     text,
  root_folder_id  text,
  conectado_por   text,
  conectado_em    text,
  updated_at      text
);

create index if not exists storage_connections_escritorio on public.storage_connections(escritorio_id);

alter table public.storage_connections enable row level security;

-- Sem políticas de leitura/escrita para o frontend.
-- Edge Functions usam service_role e ignoram RLS.
-- Políticas dev adicionadas somente para evitar erros em chamadas acidentais.
create policy "storage_connections_select_dev"
  on public.storage_connections for select
  using (true);

create policy "storage_connections_all_dev"
  on public.storage_connections for all
  using (true)
  with check (true);
