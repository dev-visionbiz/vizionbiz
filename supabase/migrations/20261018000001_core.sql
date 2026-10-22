-- ============================================================
-- VisionBiz — Core: tabelas e RLS
-- Migration: 20261018000001_core
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims.
-- ============================================================


-- ------------------------------------------------------------
-- tenants
-- ------------------------------------------------------------
create table if not exists public.tenants (
  id                          text        primary key,
  nome                        text,
  razao_social                text,
  cnpj                        text        unique,
  cor_primaria                text,
  logo_url                    text,
  dominio                     text,
  email                       text,
  telefone                    text,
  crc                         text,
  responsavel                 text,
  endereco_logradouro         text,
  endereco_numero             text,
  endereco_complemento        text,
  endereco_bairro             text,
  endereco_cidade             text,
  endereco_estado             text,
  endereco_cep                text,
  contador_nome               text,
  contador_crc                text,
  contador_cpf                text,
  contador_email              text,
  contador_telefone           text,
  modulos                     jsonb       default '[]',
  submodulos_tarefas          jsonb       default '[]',
  vocabulario                 jsonb,
  template_whatsapp_guia      text,
  template_whatsapp_documento text,
  chave_pix                   text,
  instrucoes_pagamento        text,
  status                      text        check (status in ('ativo','inativo','suspenso','trial')),
  plano                       text        check (plano in ('starter','pro','enterprise')),
  data_cadastro               text,
  data_expiracao              text,
  criado_em                   timestamptz not null default now()
);

alter table public.tenants enable row level security;

create policy "tenants_select_dev"
  on public.tenants for select
  using (true);

create policy "tenants_all_dev"
  on public.tenants for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
create table if not exists public.users (
  id              text        primary key,
  tenant_id       text        references public.tenants(id),
  nome            text        not null,
  email           text        not null,
  papel           text        check (papel in ('escritorio_admin','escritorio_colaborador','cliente','visionbiz_admin')),
  client_id       text,
  clientes        jsonb       default '[]',
  ativo           boolean     not null default true,
  senha_hash      text,
  modulos         jsonb       default '[]',
  papel_portal    text,
  secoes_portal   jsonb       default '[]'
);

create index if not exists users_tenant on public.users(tenant_id);

alter table public.users enable row level security;

create policy "users_select_dev"
  on public.users for select
  using (true);

create policy "users_all_dev"
  on public.users for all
  using (true)
  with check (true);
