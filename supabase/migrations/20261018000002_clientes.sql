-- ============================================================
-- VisionBiz — Clientes: tabelas e RLS
-- Migration: 20261018000002_clientes
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims.
-- ============================================================


-- ------------------------------------------------------------
-- clients
-- ------------------------------------------------------------
create table if not exists public.clients (
  id                          text    primary key,
  tenant_id                   text    not null,
  tipo                        text    check (tipo in ('fisica','juridica')),
  razao_social                text    not null,
  cnpj                        text,
  cpf                         text,
  fantasia                    text,
  regime                      text,
  status                      text    check (status in ('ativo','inativo','em_abertura')),
  email                       text,
  telefone                    text,
  carteira_id                 text,
  inscricao_estadual          text,
  inscricao_municipal         text,
  rg                          text,
  rg_orgao_expedidor          text,
  data_nascimento             text,
  titulo_eleitor              text,
  doc_profissional_tipo       text,
  doc_profissional_numero     text,
  descricao_cobranca_padrao   text
);

create index if not exists clients_tenant on public.clients(tenant_id);

alter table public.clients enable row level security;

create policy "clients_select_dev"
  on public.clients for select
  using (true);

create policy "clients_all_dev"
  on public.clients for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- pessoas
-- ------------------------------------------------------------
create table if not exists public.pessoas (
  id              text    primary key,
  tenant_id       text    not null,
  tipo            text    check (tipo in ('fisica','juridica')),
  nome            text    not null,
  fantasia        text,
  cpf             text,
  cnpj            text,
  rg              text,
  data_nascimento text,
  email           text,
  telefone        text
);

create index if not exists pessoas_tenant on public.pessoas(tenant_id);

alter table public.pessoas enable row level security;

create policy "pessoas_select_dev"
  on public.pessoas for select
  using (true);

create policy "pessoas_all_dev"
  on public.pessoas for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- empresa_pessoas
-- ------------------------------------------------------------
create table if not exists public.empresa_pessoas (
  id          text    primary key,
  tenant_id   text    not null,
  empresa_id  text    not null,
  pessoa_id   text    not null,
  papel       text    check (papel in ('socio','administrador','procurador','contato_financeiro','contato_principal')),
  principal   boolean not null default false
);

create index if not exists empresa_pessoas_tenant on public.empresa_pessoas(tenant_id);
create index if not exists empresa_pessoas_empresa on public.empresa_pessoas(empresa_id);

alter table public.empresa_pessoas enable row level security;

create policy "empresa_pessoas_select_dev"
  on public.empresa_pessoas for select
  using (true);

create policy "empresa_pessoas_all_dev"
  on public.empresa_pessoas for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- grupos
-- ------------------------------------------------------------
create table if not exists public.grupos (
  id          text    primary key,
  tenant_id   text    not null,
  nome        text    not null,
  tipo        text    check (tipo in ('grupo_economico','carteira','segmento','tag')),
  cor         text,
  observacao  text
);

create index if not exists grupos_tenant on public.grupos(tenant_id);

alter table public.grupos enable row level security;

create policy "grupos_select_dev"
  on public.grupos for select
  using (true);

create policy "grupos_all_dev"
  on public.grupos for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- grupo_empresas
-- ------------------------------------------------------------
create table if not exists public.grupo_empresas (
  id          text    primary key,
  tenant_id   text    not null,
  grupo_id    text    not null,
  empresa_id  text    not null
);

create index if not exists grupo_empresas_tenant on public.grupo_empresas(tenant_id);
create index if not exists grupo_empresas_grupo on public.grupo_empresas(grupo_id);

alter table public.grupo_empresas enable row level security;

create policy "grupo_empresas_select_dev"
  on public.grupo_empresas for select
  using (true);

create policy "grupo_empresas_all_dev"
  on public.grupo_empresas for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- client_vinculos
-- ------------------------------------------------------------
create table if not exists public.client_vinculos (
  id            text    primary key,
  tenant_id     text    not null,
  client_pj_id  text    not null,
  client_pf_id  text    not null,
  papel         text    check (papel in ('socio','administrador','procurador','contato_financeiro','contato_principal')),
  principal     boolean not null default false
);

create index if not exists client_vinculos_tenant on public.client_vinculos(tenant_id);
create index if not exists client_vinculos_pj on public.client_vinculos(client_pj_id);

alter table public.client_vinculos enable row level security;

create policy "client_vinculos_select_dev"
  on public.client_vinculos for select
  using (true);

create policy "client_vinculos_all_dev"
  on public.client_vinculos for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- carteiras
-- ------------------------------------------------------------
create table if not exists public.carteiras (
  id          text    primary key,
  tenant_id   text    not null,
  nome        text    not null,
  descricao   text,
  cor         text
);

create index if not exists carteiras_tenant on public.carteiras(tenant_id);

alter table public.carteiras enable row level security;

create policy "carteiras_select_dev"
  on public.carteiras for select
  using (true);

create policy "carteiras_all_dev"
  on public.carteiras for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- historico_status_clientes
-- ------------------------------------------------------------
create table if not exists public.historico_status_clientes (
  id           text    primary key,
  tenant_id    text    not null,
  client_id    text    not null,
  status       text    check (status in ('ativo','inativo','em_abertura')),
  motivo       text,
  alterado_por text,
  data         text
);

create index if not exists historico_status_clientes_tenant on public.historico_status_clientes(tenant_id);
create index if not exists historico_status_clientes_client on public.historico_status_clientes(client_id);

alter table public.historico_status_clientes enable row level security;

create policy "historico_status_clientes_select_dev"
  on public.historico_status_clientes for select
  using (true);

create policy "historico_status_clientes_all_dev"
  on public.historico_status_clientes for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- cliente_enderecos
-- ------------------------------------------------------------
create table if not exists public.cliente_enderecos (
  id          text    primary key,
  tenant_id   text    not null,
  cliente_id  text    not null,
  tipo        text    check (tipo in ('fiscal','correspondencia','entrega','cobranca','outro')),
  descricao   text,
  cep         text,
  logradouro  text,
  numero      text,
  complemento text,
  bairro      text,
  cidade      text,
  estado      text,
  principal   boolean not null default false
);

create index if not exists cliente_enderecos_tenant on public.cliente_enderecos(tenant_id);
create index if not exists cliente_enderecos_cliente on public.cliente_enderecos(cliente_id);

alter table public.cliente_enderecos enable row level security;

create policy "cliente_enderecos_select_dev"
  on public.cliente_enderecos for select
  using (true);

create policy "cliente_enderecos_all_dev"
  on public.cliente_enderecos for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- cliente_contatos
-- ------------------------------------------------------------
create table if not exists public.cliente_contatos (
  id          text    primary key,
  tenant_id   text    not null,
  cliente_id  text    not null,
  nome        text    not null,
  setor       text,
  cargo       text,
  telefone    text,
  email       text,
  principal   boolean not null default false,
  obs         text
);

create index if not exists cliente_contatos_tenant on public.cliente_contatos(tenant_id);
create index if not exists cliente_contatos_cliente on public.cliente_contatos(cliente_id);

alter table public.cliente_contatos enable row level security;

create policy "cliente_contatos_select_dev"
  on public.cliente_contatos for select
  using (true);

create policy "cliente_contatos_all_dev"
  on public.cliente_contatos for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- cliente_cnaes
-- ------------------------------------------------------------
create table if not exists public.cliente_cnaes (
  id          text    primary key,
  tenant_id   text    not null,
  cliente_id  text    not null,
  codigo      text    not null,
  descricao   text,
  principal   boolean not null default false
);

create index if not exists cliente_cnaes_tenant on public.cliente_cnaes(tenant_id);
create index if not exists cliente_cnaes_cliente on public.cliente_cnaes(cliente_id);

alter table public.cliente_cnaes enable row level security;

create policy "cliente_cnaes_select_dev"
  on public.cliente_cnaes for select
  using (true);

create policy "cliente_cnaes_all_dev"
  on public.cliente_cnaes for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- log_atividades_clientes
-- ------------------------------------------------------------
create table if not exists public.log_atividades_clientes (
  id           text        primary key,
  tenant_id    text        not null,
  client_id    text        not null,
  acao         text        not null,
  descricao    text,
  usuario_id   text,
  usuario_nome text,
  em           timestamptz not null default now()
);

create index if not exists log_atividades_clientes_tenant on public.log_atividades_clientes(tenant_id);
create index if not exists log_atividades_clientes_client on public.log_atividades_clientes(client_id);

alter table public.log_atividades_clientes enable row level security;

create policy "log_atividades_clientes_select_dev"
  on public.log_atividades_clientes for select
  using (true);

create policy "log_atividades_clientes_all_dev"
  on public.log_atividades_clientes for all
  using (true)
  with check (true);
