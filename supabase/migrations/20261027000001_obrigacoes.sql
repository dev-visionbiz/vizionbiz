-- Adiciona 'simples_nacional' ao CHECK de origem em guias_recolhimento
ALTER TABLE guias_recolhimento DROP CONSTRAINT IF EXISTS guias_recolhimento_origem_check;
ALTER TABLE guias_recolhimento
  ADD CONSTRAINT guias_recolhimento_origem_check
  CHECK (origem IN ('manual', 'rotina', 'api', 'simples_nacional'));

-- Tabela de configurações de obrigações por cliente
CREATE TABLE IF NOT EXISTS obrigacao_configs (
  id           text PRIMARY KEY,
  tenant_id    text NOT NULL,
  client_id    text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('simples_nacional', 'dctfweb', 'defis')),
  data_inicio  text NOT NULL,
  data_fim     text,
  parametros   jsonb,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz DEFAULT now(),
  criado_por   text
);

CREATE INDEX IF NOT EXISTS obrigacao_configs_tenant  ON obrigacao_configs (tenant_id);
CREATE INDEX IF NOT EXISTS obrigacao_configs_cliente ON obrigacao_configs (tenant_id, client_id);

ALTER TABLE obrigacao_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY obrigacao_configs_select ON obrigacao_configs FOR SELECT USING (true);
CREATE POLICY obrigacao_configs_insert ON obrigacao_configs FOR INSERT WITH CHECK (true);
CREATE POLICY obrigacao_configs_update ON obrigacao_configs FOR UPDATE USING (true);
CREATE POLICY obrigacao_configs_delete ON obrigacao_configs FOR DELETE USING (true);

-- Tabela de lançamentos de obrigações (faturamento + DAS por competência)
CREATE TABLE IF NOT EXISTS obrigacao_lancamentos (
  id               text PRIMARY KEY,
  tenant_id        text NOT NULL,
  client_id        text NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('simples_nacional', 'dctfweb', 'defis')),
  competencia      text NOT NULL,
  status           text NOT NULL CHECK (status IN ('pendente', 'gerar', 'aberto', 'recalcular', 'transmitido')),
  faturamento      numeric(14,2),
  das_valor        numeric(12,2),
  das_vencimento   text,
  data_declaracao  timestamptz,
  codigo_barras    text,
  protocolo        text,
  guia_id          text REFERENCES guias_recolhimento(id),
  pdf_storage_key  text,
  observacoes      text,
  criado_em        timestamptz DEFAULT now(),
  criado_por       text,
  atualizado_em    timestamptz
);

CREATE INDEX IF NOT EXISTS obrigacao_lanc_tenant      ON obrigacao_lancamentos (tenant_id);
CREATE INDEX IF NOT EXISTS obrigacao_lanc_competencia ON obrigacao_lancamentos (tenant_id, competencia);
CREATE INDEX IF NOT EXISTS obrigacao_lanc_cliente     ON obrigacao_lancamentos (tenant_id, client_id);

ALTER TABLE obrigacao_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY obrigacao_lancamentos_select ON obrigacao_lancamentos FOR SELECT USING (true);
CREATE POLICY obrigacao_lancamentos_insert ON obrigacao_lancamentos FOR INSERT WITH CHECK (true);
CREATE POLICY obrigacao_lancamentos_update ON obrigacao_lancamentos FOR UPDATE USING (true);
CREATE POLICY obrigacao_lancamentos_delete ON obrigacao_lancamentos FOR DELETE USING (true);
