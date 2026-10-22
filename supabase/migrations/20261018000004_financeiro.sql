-- ============================================================
-- VisionBiz — Financeiro: tabelas e RLS
-- Migration: 20261018000004_financeiro.sql
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims.
-- ============================================================

-- ------------------------------------------------------------
-- servicos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos (
  id                        text PRIMARY KEY,
  tenant_id                 text NOT NULL,
  nome                      text NOT NULL,
  descricao                 text,
  valor_padrao              numeric(12,2),
  tipo_cobranca_padrao      text CHECK (tipo_cobranca_padrao IN ('mensal','avulso')),
  ativo                     boolean DEFAULT true,
  fluxo_id                  text,
  requer_aceite_padrao      boolean,
  formulario_template_id    text
);

ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY servicos_dev_select ON servicos FOR SELECT USING (true);
CREATE POLICY servicos_dev_insert ON servicos FOR INSERT WITH CHECK (true);
CREATE POLICY servicos_dev_update ON servicos FOR UPDATE USING (true);
CREATE POLICY servicos_dev_delete ON servicos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- planos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planos (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL,
  nome        text NOT NULL,
  descricao   text,
  valor       numeric(12,2),
  ativo       boolean DEFAULT true,
  itens       jsonb DEFAULT '[]'
);

ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY planos_dev_select ON planos FOR SELECT USING (true);
CREATE POLICY planos_dev_insert ON planos FOR INSERT WITH CHECK (true);
CREATE POLICY planos_dev_update ON planos FOR UPDATE USING (true);
CREATE POLICY planos_dev_delete ON planos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- contrato_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contrato_items (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL,
  contrato_id     text NOT NULL,
  origem          text CHECK (origem IN ('plano','servico','manual')),
  origem_id       text,
  nome            text NOT NULL,
  valor_unitario  numeric(12,2),
  quantidade      integer DEFAULT 1
);

ALTER TABLE contrato_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY contrato_items_dev_select ON contrato_items FOR SELECT USING (true);
CREATE POLICY contrato_items_dev_insert ON contrato_items FOR INSERT WITH CHECK (true);
CREATE POLICY contrato_items_dev_update ON contrato_items FOR UPDATE USING (true);
CREATE POLICY contrato_items_dev_delete ON contrato_items FOR DELETE USING (true);

-- ------------------------------------------------------------
-- contracts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id                          text PRIMARY KEY,
  tenant_id                   text NOT NULL,
  client_id                   text NOT NULL,
  natureza                    text CHECK (natureza IN ('principal','avulso','gestao_provisoria','emissao')),
  valor_mensal                numeric(12,2),
  dia_vencimento              integer,
  inicio                      text NOT NULL,
  fim                         text,
  indice_reajuste             text,
  status                      text CHECK (status IN ('rascunho','ativo','suspenso','encerrado')),
  apenas_reajuste_positivo    boolean,
  desconto_valor              numeric(12,2),
  data_encerramento           text,
  motivo_encerramento         text,
  observacao_encerramento     text,
  ultima_competencia_cobrada  text,
  criado_em                   timestamptz DEFAULT now(),
  atualizado_em               timestamptz
);

CREATE INDEX IF NOT EXISTS contracts_tenant  ON contracts (tenant_id);
CREATE INDEX IF NOT EXISTS contracts_client  ON contracts (tenant_id, client_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contracts_dev_select ON contracts FOR SELECT USING (true);
CREATE POLICY contracts_dev_insert ON contracts FOR INSERT WITH CHECK (true);
CREATE POLICY contracts_dev_update ON contracts FOR UPDATE USING (true);
CREATE POLICY contracts_dev_delete ON contracts FOR DELETE USING (true);

-- ------------------------------------------------------------
-- invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                    text PRIMARY KEY,
  tenant_id             text NOT NULL,
  client_id             text NOT NULL,
  contract_id           text,
  competencia           text NOT NULL,
  vencimento            text NOT NULL,
  valor_original        numeric(12,2),
  status                text CHECK (status IN ('aberta','vencida','paga','cancelada','renegociada')),
  origem                text CHECK (origem IN ('contrato','avulsa','renegociacao')),
  renegotiation_id      text,
  permite_renegociacao  boolean,
  descricao_cobranca    text
);

CREATE INDEX IF NOT EXISTS invoices_tenant  ON invoices (tenant_id);
CREATE INDEX IF NOT EXISTS invoices_client  ON invoices (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS invoices_status  ON invoices (tenant_id, status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_dev_select ON invoices FOR SELECT USING (true);
CREATE POLICY invoices_dev_insert ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY invoices_dev_update ON invoices FOR UPDATE USING (true);
CREATE POLICY invoices_dev_delete ON invoices FOR DELETE USING (true);

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id           text PRIMARY KEY,
  invoice_id   text NOT NULL,
  valor        numeric(12,2),
  metodo       text CHECK (metodo IN ('pix','boleto','cartao')),
  pago_em      text,
  gateway_ref  text
);

CREATE INDEX IF NOT EXISTS payments_invoice ON payments (invoice_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_dev_select ON payments FOR SELECT USING (true);
CREATE POLICY payments_dev_insert ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY payments_dev_update ON payments FOR UPDATE USING (true);
CREATE POLICY payments_dev_delete ON payments FOR DELETE USING (true);

-- ------------------------------------------------------------
-- billing_policies
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_policies (
  id                              text PRIMARY KEY,
  tenant_id                       text NOT NULL UNIQUE,
  multa_pct                       numeric(6,4),
  juros_mes_pct                   numeric(6,4),
  indice_correcao                 text CHECK (indice_correcao IN ('ipca','nenhum')),
  carencia_dias                   integer,
  encargo_renegociacao_tipo       text CHECK (encargo_renegociacao_tipo IN ('fixo','pct','nenhum')),
  encargo_renegociacao_valor      numeric(12,4),
  encargo_teto                    numeric(12,4),
  parcelas_max                    integer,
  desconto_avista_encargos_pct    numeric(6,4),
  modo_acesso                     text CHECK (modo_acesso IN ('informativo','parcial','total')),
  multa_acima_2_aceite            jsonb,
  descricao_cobranca_padrao       text
);

ALTER TABLE billing_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_policies_dev_select ON billing_policies FOR SELECT USING (true);
CREATE POLICY billing_policies_dev_insert ON billing_policies FOR INSERT WITH CHECK (true);
CREATE POLICY billing_policies_dev_update ON billing_policies FOR UPDATE USING (true);
CREATE POLICY billing_policies_dev_delete ON billing_policies FOR DELETE USING (true);

-- ------------------------------------------------------------
-- renegotiations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS renegotiations (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL,
  client_id       text NOT NULL,
  invoice_ids     jsonb DEFAULT '[]',
  saldo_principal numeric(12,2),
  multa           numeric(12,2),
  juros           numeric(12,2),
  correcao        numeric(12,2),
  encargo         numeric(12,2),
  total           numeric(12,2),
  parcelas        integer,
  termo_hash      text,
  aceite          jsonb,
  status          text CHECK (status IN ('pendente','aceita','cancelada'))
);

ALTER TABLE renegotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY renegotiations_dev_select ON renegotiations FOR SELECT USING (true);
CREATE POLICY renegotiations_dev_insert ON renegotiations FOR INSERT WITH CHECK (true);
CREATE POLICY renegotiations_dev_update ON renegotiations FOR UPDATE USING (true);
CREATE POLICY renegotiations_dev_delete ON renegotiations FOR DELETE USING (true);

-- ------------------------------------------------------------
-- servicos_realizados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos_realizados (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL,
  cliente_id      text NOT NULL,
  servico_id      text,
  nome            text NOT NULL,
  descricao       text,
  valor           numeric(12,2),
  competencia     text NOT NULL,
  data_execucao   text,
  status          text CHECK (status IN ('pendente_cobranca','incluido_fatura','cancelado')),
  invoice_id      text,
  criado_por      text,
  criado_em       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS servicos_realizados_tenant ON servicos_realizados (tenant_id);

ALTER TABLE servicos_realizados ENABLE ROW LEVEL SECURITY;
CREATE POLICY servicos_realizados_dev_select ON servicos_realizados FOR SELECT USING (true);
CREATE POLICY servicos_realizados_dev_insert ON servicos_realizados FOR INSERT WITH CHECK (true);
CREATE POLICY servicos_realizados_dev_update ON servicos_realizados FOR UPDATE USING (true);
CREATE POLICY servicos_realizados_dev_delete ON servicos_realizados FOR DELETE USING (true);
