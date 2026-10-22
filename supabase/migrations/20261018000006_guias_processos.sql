-- ============================================================
-- VisionBiz — Guias e Processos: tabelas e RLS
-- Migration: 20261018000006_guias_processos.sql
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims.
-- ============================================================

-- ------------------------------------------------------------
-- guias_recolhimento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guias_recolhimento (
  id                         text PRIMARY KEY,
  tenant_id                  text NOT NULL,
  cliente_id                 text NOT NULL,
  tipo                       text CHECK (tipo IN ('darf','das','dae','darf_simples','fgts','gnre','iss','iptu','boleto_prefeitura','bombeiros','vigilancia_sanitaria','outro')),
  descricao                  text NOT NULL,
  competencia                text,
  vencimento                 text NOT NULL,
  valor                      numeric(12,2),
  valor_multa                numeric(12,2),
  valor_juros                numeric(12,2),
  status                     text CHECK (status IN ('aguardando_emissao','emitida','paga','vencida','cancelada','em_retificacao')),
  origem                     text CHECK (origem IN ('manual','rotina','api')),
  codigo_barras              text,
  linha_digitavel            text,
  pix_copia_cola             text,
  numero_documento           text,
  codigo_receita             text,
  periodo_apuracao           text,
  numero_referencia          text,
  pago_em                    text,
  pago_por                   text,
  pago_valor                 numeric(12,2),
  comprovante_storage_key    text,
  segunda_via_status         text CHECK (segunda_via_status IN ('nao_solicitada','solicitada','disponivel','enviada')) DEFAULT 'nao_solicitada',
  segunda_via_solicitada_em  text,
  segunda_via_arquivo_key    text,
  api_provider               text,
  api_external_id            text,
  api_dados                  jsonb,
  arquivo_key                text,
  lote_id                    text,
  lote_arquivo_sha256        text,
  lote_arquivo_original      text,
  observacoes                text,
  criado_em                  timestamptz DEFAULT now(),
  criado_por                 text,
  atualizado_em              timestamptz,
  deleted_at                 timestamptz
);

CREATE INDEX IF NOT EXISTS guias_tenant   ON guias_recolhimento (tenant_id);
CREATE INDEX IF NOT EXISTS guias_cliente  ON guias_recolhimento (tenant_id, cliente_id);

ALTER TABLE guias_recolhimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY guias_recolhimento_dev_select ON guias_recolhimento FOR SELECT USING (true);
CREATE POLICY guias_recolhimento_dev_insert ON guias_recolhimento FOR INSERT WITH CHECK (true);
CREATE POLICY guias_recolhimento_dev_update ON guias_recolhimento FOR UPDATE USING (true);
CREATE POLICY guias_recolhimento_dev_delete ON guias_recolhimento FOR DELETE USING (true);

-- ------------------------------------------------------------
-- lotes_importacao
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lotes_importacao (
  id                    text PRIMARY KEY,
  tenant_id             text NOT NULL,
  enviado_por           text,
  total_arquivos        integer DEFAULT 0,
  organizados           integer DEFAULT 0,
  para_revisar          integer DEFAULT 0,
  com_erro              integer DEFAULT 0,
  duplicatas_ignoradas  integer DEFAULT 0,
  status                text CHECK (status IN ('processando','revisar','concluido','cancelado')),
  created_at            timestamptz DEFAULT now(),
  concluido_em          timestamptz,
  deleted_at            timestamptz
);

ALTER TABLE lotes_importacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY lotes_importacao_dev_select ON lotes_importacao FOR SELECT USING (true);
CREATE POLICY lotes_importacao_dev_insert ON lotes_importacao FOR INSERT WITH CHECK (true);
CREATE POLICY lotes_importacao_dev_update ON lotes_importacao FOR UPDATE USING (true);
CREATE POLICY lotes_importacao_dev_delete ON lotes_importacao FOR DELETE USING (true);

-- ------------------------------------------------------------
-- processos_abertura
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processos_abertura (
  id                       text PRIMARY KEY,
  tenant_id                text NOT NULL,
  client_id                text NOT NULL,
  status                   text CHECK (status IN ('coleta_dados','documentos','submetido','aguardando_cnpj','concluido','cancelado')),
  responsavel_id           text,
  tipo_empresa             text,
  capital_social           numeric(12,2),
  data_abertura_desejada   text,
  cnpj_obtido              text,
  checklist                jsonb DEFAULT '[]',
  formulario_token         text,
  formulario_status        text CHECK (formulario_status IN ('nao_enviado','enviado','preenchido','expirado')),
  formulario_campos        jsonb DEFAULT '[]',
  formulario_expira_em     text,
  formulario_preenchido_em text,
  observacoes              text,
  criado_por               text,
  criado_em                timestamptz DEFAULT now(),
  atualizado_em            timestamptz,
  concluido_em             timestamptz
);

ALTER TABLE processos_abertura ENABLE ROW LEVEL SECURITY;
CREATE POLICY processos_abertura_dev_select ON processos_abertura FOR SELECT USING (true);
CREATE POLICY processos_abertura_dev_insert ON processos_abertura FOR INSERT WITH CHECK (true);
CREATE POLICY processos_abertura_dev_update ON processos_abertura FOR UPDATE USING (true);
CREATE POLICY processos_abertura_dev_delete ON processos_abertura FOR DELETE USING (true);

-- ------------------------------------------------------------
-- processos_alteracao
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processos_alteracao (
  id                       text PRIMARY KEY,
  tenant_id                text NOT NULL,
  client_id                text NOT NULL,
  tipo                     text CHECK (tipo IN ('endereco','socio','dados_empresa','multiplos')),
  descricao                text,
  status                   text CHECK (status IN ('aguardando_envio','formulario_enviado','preenchido','concluido','cancelado')),
  solicitado_por           text CHECK (solicitado_por IN ('escritorio','cliente')),
  responsavel_id           text,
  formulario_token         text,
  formulario_status        text CHECK (formulario_status IN ('nao_enviado','enviado','preenchido','expirado')),
  formulario_campos        jsonb DEFAULT '[]',
  formulario_preenchido_em text,
  observacoes              text,
  criado_por               text,
  criado_em                timestamptz DEFAULT now(),
  atualizado_em            timestamptz,
  concluido_em             timestamptz
);

ALTER TABLE processos_alteracao ENABLE ROW LEVEL SECURITY;
CREATE POLICY processos_alteracao_dev_select ON processos_alteracao FOR SELECT USING (true);
CREATE POLICY processos_alteracao_dev_insert ON processos_alteracao FOR INSERT WITH CHECK (true);
CREATE POLICY processos_alteracao_dev_update ON processos_alteracao FOR UPDATE USING (true);
CREATE POLICY processos_alteracao_dev_delete ON processos_alteracao FOR DELETE USING (true);

-- ------------------------------------------------------------
-- formulario_templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formulario_templates (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL,
  nome        text NOT NULL,
  descricao   text,
  destino     text CHECK (destino IN ('cliente_pj','cliente_pf','socio_novo','socio_saida','processo_alteracao','generico')),
  campos      jsonb DEFAULT '[]',
  ativo       boolean DEFAULT true,
  publicado   boolean DEFAULT false,
  acesso      text CHECK (acesso IN ('publico','clientes')),
  criado_em   timestamptz DEFAULT now()
);

ALTER TABLE formulario_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY formulario_templates_dev_select ON formulario_templates FOR SELECT USING (true);
CREATE POLICY formulario_templates_dev_insert ON formulario_templates FOR INSERT WITH CHECK (true);
CREATE POLICY formulario_templates_dev_update ON formulario_templates FOR UPDATE USING (true);
CREATE POLICY formulario_templates_dev_delete ON formulario_templates FOR DELETE USING (true);

-- ------------------------------------------------------------
-- formulario_respostas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formulario_respostas (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL,
  template_id     text NOT NULL,
  ocorrencia_id   text,
  tarefa_id       text,
  cliente_id      text,
  respostas       jsonb DEFAULT '{}',
  processado      boolean DEFAULT false,
  processado_em   timestamptz,
  criado_em       timestamptz DEFAULT now()
);

ALTER TABLE formulario_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY formulario_respostas_dev_select ON formulario_respostas FOR SELECT USING (true);
CREATE POLICY formulario_respostas_dev_insert ON formulario_respostas FOR INSERT WITH CHECK (true);
CREATE POLICY formulario_respostas_dev_update ON formulario_respostas FOR UPDATE USING (true);
CREATE POLICY formulario_respostas_dev_delete ON formulario_respostas FOR DELETE USING (true);

-- ------------------------------------------------------------
-- certificados_digitais
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificados_digitais (
  id                   text PRIMARY KEY,
  tenant_id            text NOT NULL,
  cliente_id           text NOT NULL,
  tipo                 text CHECK (tipo IN ('ecnpj_a1','ecnpj_a3','ecpf_a1','ecpf_a3','nfe','outro')),
  titular              text NOT NULL,
  cnpj_cpf             text NOT NULL,
  validade             text NOT NULL,
  status               text CHECK (status IN ('valido','vencendo','vencido','renovacao_solicitada')),
  arquivo_key          text,
  observacoes          text,
  ocorrencia_alerta_id text,
  criado_por           text,
  criado_em            timestamptz DEFAULT now(),
  atualizado_em        timestamptz
);

CREATE INDEX IF NOT EXISTS certificados_tenant   ON certificados_digitais (tenant_id);
CREATE INDEX IF NOT EXISTS certificados_cliente  ON certificados_digitais (tenant_id, cliente_id);

ALTER TABLE certificados_digitais ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificados_digitais_dev_select ON certificados_digitais FOR SELECT USING (true);
CREATE POLICY certificados_digitais_dev_insert ON certificados_digitais FOR INSERT WITH CHECK (true);
CREATE POLICY certificados_digitais_dev_update ON certificados_digitais FOR UPDATE USING (true);
CREATE POLICY certificados_digitais_dev_delete ON certificados_digitais FOR DELETE USING (true);
