-- ============================================================
-- VisionBiz — App Store: tabelas e RLS
-- Migration: 20261018000000_app_store
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims:
--     escritorio_id = (auth.jwt() -> 'app_metadata' ->> 'escritorio_id')
-- ============================================================

-- ------------------------------------------------------------
-- apps
-- ------------------------------------------------------------
create table if not exists public.apps (
  id                  text        primary key,
  slug                text        not null unique,
  nome                text        not null,
  descricao           text        not null,
  descricao_longa     text,
  tipo                text        not null check (tipo in ('embarcado','conectado','embed')),
  icone               text,
  banner_url          text,
  screenshots         jsonb       default '[]',
  video_url           text,
  recursos            jsonb       default '[]',
  tags                jsonb       default '[]',
  categoria           text,
  desenvolvedor       text,
  site_desenvolvedor  text,
  avaliacao           numeric(3,1),
  instalacoes_count   integer     default 0,
  destaque            boolean     default false,
  owner_id            text,
  status              text        not null check (status in ('rascunho','em_revisao','publicado','suspenso')),
  criado_em           timestamptz not null default now()
);

alter table public.apps enable row level security;

drop policy if exists "apps_read_published" on public.apps;
create policy "apps_read_published"
  on public.apps for select
  using (status = 'publicado');

-- Escrita apenas por visionbiz_admin (via service_role em Edge Function)
-- TODO: substituir por: owner_id = auth.uid() OR auth.role() = 'service_role'
drop policy if exists "apps_write_dev" on public.apps;
create policy "apps_write_dev"
  on public.apps for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- app_versions
-- ------------------------------------------------------------
create table if not exists public.app_versions (
  id            text        primary key,
  app_id        text        not null references public.apps(id) on delete cascade,
  versao        text        not null,
  manifesto     jsonb       not null,
  publicado_em  timestamptz not null default now()
);

create unique index if not exists app_versions_app_id_versao on public.app_versions(app_id, versao);

alter table public.app_versions enable row level security;

drop policy if exists "app_versions_read" on public.app_versions;
create policy "app_versions_read"
  on public.app_versions for select
  using (true);

drop policy if exists "app_versions_insert_dev" on public.app_versions;
create policy "app_versions_insert_dev"
  on public.app_versions for insert
  with check (true);

drop policy if exists "app_versions_update_dev" on public.app_versions;
create policy "app_versions_update_dev"
  on public.app_versions for update
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- app_plans
-- ------------------------------------------------------------
create table if not exists public.app_plans (
  id              text    primary key,
  app_id          text    not null references public.apps(id) on delete cascade,
  nome            text    not null,
  tipo_cobranca   text    not null check (tipo_cobranca in ('gratuito','mensal','anual','por_uso','por_lead')),
  valor           numeric(10,2),
  periodicidade   text
);

alter table public.app_plans enable row level security;

drop policy if exists "app_plans_read" on public.app_plans;
create policy "app_plans_read"
  on public.app_plans for select
  using (true);

drop policy if exists "app_plans_write_dev" on public.app_plans;
create policy "app_plans_write_dev"
  on public.app_plans for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- app_installations
-- ------------------------------------------------------------
create table if not exists public.app_installations (
  id              text        primary key,
  app_id          text        not null references public.apps(id),
  app_version_id  text        not null references public.app_versions(id),
  escritorio_id   text        not null,
  cliente_id      text,           -- null = instalação no nível do escritório
  instalado_por   text        not null,
  status          text        not null check (status in ('ativa','revogada','suspensa')),
  instalado_em    timestamptz not null default now(),
  revogado_em     timestamptz
);

create index if not exists app_installations_escritorio on public.app_installations(escritorio_id);
create index if not exists app_installations_cliente on public.app_installations(escritorio_id, cliente_id);

alter table public.app_installations enable row level security;

-- DEV: acesso irrestrito. PROD: filtrar por escritorio_id = JWT claim
drop policy if exists "app_installations_all_dev" on public.app_installations;
create policy "app_installations_all_dev"
  on public.app_installations for all
  using (true)
  with check (true);

-- PROD (descomentar após integrar Supabase Auth):
-- create policy "app_installations_escritorio"
--   on public.app_installations for all
--   using (escritorio_id = (auth.jwt() -> 'app_metadata' ->> 'escritorio_id'))
--   with check (escritorio_id = (auth.jwt() -> 'app_metadata' ->> 'escritorio_id'));


-- ------------------------------------------------------------
-- app_grants
-- ------------------------------------------------------------
create table if not exists public.app_grants (
  id              text        primary key,
  installation_id text        not null references public.app_installations(id) on delete cascade,
  escopo          text        not null,
  concedido_em    timestamptz not null default now(),
  revogado_em     timestamptz
);

create index if not exists app_grants_installation on public.app_grants(installation_id);

alter table public.app_grants enable row level security;

drop policy if exists "app_grants_all_dev" on public.app_grants;
create policy "app_grants_all_dev"
  on public.app_grants for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- app_visibility
-- ------------------------------------------------------------
create table if not exists public.app_visibility (
  id              text    primary key,
  escritorio_id   text    not null,
  app_id          text    not null references public.apps(id) on delete cascade,
  visivel         boolean not null default true,
  destaque        boolean not null default false,
  unique (escritorio_id, app_id)
);

create index if not exists app_visibility_escritorio on public.app_visibility(escritorio_id);

alter table public.app_visibility enable row level security;

drop policy if exists "app_visibility_all_dev" on public.app_visibility;
create policy "app_visibility_all_dev"
  on public.app_visibility for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- subscriptions
-- ------------------------------------------------------------
create table if not exists public.subscriptions (
  id              text        primary key,
  installation_id text        not null references public.app_installations(id),
  plan_id         text        not null references public.app_plans(id),
  escritorio_id   text        not null,
  app_id          text        not null references public.apps(id),
  status          text        not null check (status in ('ativa','cancelada','vencida')),
  inicio          date        not null,
  fim             date,
  criado_em       timestamptz not null default now()
);

create index if not exists subscriptions_escritorio on public.subscriptions(escritorio_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_all_dev" on public.subscriptions;
create policy "subscriptions_all_dev"
  on public.subscriptions for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- commission_rules
-- ------------------------------------------------------------
create table if not exists public.commission_rules (
  id            text        primary key,
  app_id        text        not null references public.apps(id),
  escritorio_id text,           -- null = regra padrão do app
  tipo          text        not null check (tipo in ('percentual','fixo','nenhum')),
  valor         numeric(10,4)
);

alter table public.commission_rules enable row level security;

drop policy if exists "commission_rules_read_dev" on public.commission_rules;
create policy "commission_rules_read_dev"
  on public.commission_rules for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- ledger  (append-only: sem UPDATE/DELETE para ninguém)
-- ------------------------------------------------------------
create table if not exists public.ledger (
  id              text        primary key,
  tipo            text        not null check (tipo in ('receita','comissao_escritorio','comissao_plataforma','estorno_receita','estorno_comissao')),
  subscription_id text        references public.subscriptions(id),
  escritorio_id   text        not null,
  app_id          text        not null references public.apps(id),
  valor           numeric(12,2) not null check (valor >= 0),
  referencia      text,
  criado_em       timestamptz not null default now()
);

create index if not exists ledger_escritorio on public.ledger(escritorio_id);

alter table public.ledger enable row level security;

-- Apenas INSERT — nunca UPDATE/DELETE
drop policy if exists "ledger_insert_dev" on public.ledger;
create policy "ledger_insert_dev"
  on public.ledger for insert
  with check (true);

drop policy if exists "ledger_select_dev" on public.ledger;
create policy "ledger_select_dev"
  on public.ledger for select
  using (true);

-- Nenhuma política para UPDATE/DELETE → bloqueado por RLS


-- ------------------------------------------------------------
-- app_events
-- ------------------------------------------------------------
create table if not exists public.app_events (
  id            text        primary key,
  tipo          text        not null,
  escritorio_id text        not null,
  cliente_id    text,
  payload       jsonb       default '{}',
  criado_em     timestamptz not null default now()
);

create index if not exists app_events_escritorio on public.app_events(escritorio_id);

alter table public.app_events enable row level security;

drop policy if exists "app_events_all_dev" on public.app_events;
create policy "app_events_all_dev"
  on public.app_events for all
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- webhook_deliveries
-- ------------------------------------------------------------
create table if not exists public.webhook_deliveries (
  id              text        primary key,
  installation_id text        not null references public.app_installations(id),
  evento_id       text        not null references public.app_events(id),
  status          text        not null check (status in ('pendente','entregue','falhou')),
  tentativas      integer     not null default 0,
  proximo_retry   timestamptz,
  ultimo_erro     text,
  criado_em       timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

drop policy if exists "webhook_deliveries_all_dev" on public.webhook_deliveries;
create policy "webhook_deliveries_all_dev"
  on public.webhook_deliveries for all
  using (true)
  with check (true);
