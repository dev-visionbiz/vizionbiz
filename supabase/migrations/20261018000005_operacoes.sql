-- ============================================================
-- VisionBiz — Operações: tabelas e RLS
-- Migration: 20261018000005_operacoes.sql
-- ============================================================
-- NOTA DE SEGURANÇA:
--   As políticas abaixo permitem acesso irrestrito via anon key (modo desenvolvimento).
--   Após integrar Supabase Auth, substituir por políticas baseadas em JWT claims.
-- ============================================================

-- ------------------------------------------------------------
-- ficha_blocos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ficha_blocos (
  id         text PRIMARY KEY,
  tenant_id  text NOT NULL,
  client_id  text NOT NULL,
  titulo     text NOT NULL,
  ordem      integer DEFAULT 0
);

ALTER TABLE ficha_blocos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ficha_blocos_dev_select ON ficha_blocos FOR SELECT USING (true);
CREATE POLICY ficha_blocos_dev_insert ON ficha_blocos FOR INSERT WITH CHECK (true);
CREATE POLICY ficha_blocos_dev_update ON ficha_blocos FOR UPDATE USING (true);
CREATE POLICY ficha_blocos_dev_delete ON ficha_blocos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- ficha_campos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ficha_campos (
  id         text PRIMARY KEY,
  tenant_id  text NOT NULL,
  bloco_id   text NOT NULL,
  rotulo     text NOT NULL,
  valor      text,
  tipo       text CHECK (tipo IN ('texto','cnpj','cpf','telefone','email','cep','pis','titulo_eleitor','senha','url')),
  sensivel   boolean DEFAULT false,
  ordem      integer DEFAULT 0
);

ALTER TABLE ficha_campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ficha_campos_dev_select ON ficha_campos FOR SELECT USING (true);
CREATE POLICY ficha_campos_dev_insert ON ficha_campos FOR INSERT WITH CHECK (true);
CREATE POLICY ficha_campos_dev_update ON ficha_campos FOR UPDATE USING (true);
CREATE POLICY ficha_campos_dev_delete ON ficha_campos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- fluxos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fluxos (
  id                  text PRIMARY KEY,
  tenant_id           text NOT NULL,
  nome                text NOT NULL,
  descricao           text,
  instrucoes          text,
  categoria           text CHECK (categoria IN ('societario','fiscal','dp','contabil','outros')),
  prazo_dias_padrao   integer,
  valor_sugerido      numeric(12,2),
  ativo               boolean DEFAULT true
);

ALTER TABLE fluxos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fluxos_dev_select ON fluxos FOR SELECT USING (true);
CREATE POLICY fluxos_dev_insert ON fluxos FOR INSERT WITH CHECK (true);
CREATE POLICY fluxos_dev_update ON fluxos FOR UPDATE USING (true);
CREATE POLICY fluxos_dev_delete ON fluxos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- fluxo_tarefas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fluxo_tarefas (
  id                      text PRIMARY KEY,
  tenant_id               text NOT NULL,
  fluxo_id                text NOT NULL,
  ordem                   integer,
  nome                    text NOT NULL,
  descricao               text,
  prazo_relativo_dias     integer,
  responsavel_padrao      text,
  checklist               jsonb DEFAULT '[]',
  documentos_config       jsonb DEFAULT '[]',
  formulario_template_id  text
);

ALTER TABLE fluxo_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fluxo_tarefas_dev_select ON fluxo_tarefas FOR SELECT USING (true);
CREATE POLICY fluxo_tarefas_dev_insert ON fluxo_tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY fluxo_tarefas_dev_update ON fluxo_tarefas FOR UPDATE USING (true);
CREATE POLICY fluxo_tarefas_dev_delete ON fluxo_tarefas FOR DELETE USING (true);

-- ------------------------------------------------------------
-- rotinas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rotinas (
  id               text PRIMARY KEY,
  tenant_id        text NOT NULL,
  nome             text NOT NULL,
  fluxo_id         text,
  periodicidade    text CHECK (periodicidade IN ('mensal','trimestral','anual')),
  regra_vencimento text,
  regime           text,
  ativo            boolean DEFAULT true,
  criado_em        timestamptz DEFAULT now()
);

ALTER TABLE rotinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY rotinas_dev_select ON rotinas FOR SELECT USING (true);
CREATE POLICY rotinas_dev_insert ON rotinas FOR INSERT WITH CHECK (true);
CREATE POLICY rotinas_dev_update ON rotinas FOR UPDATE USING (true);
CREATE POLICY rotinas_dev_delete ON rotinas FOR DELETE USING (true);

-- ------------------------------------------------------------
-- rotina_clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rotina_clientes (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL,
  rotina_id   text NOT NULL,
  cliente_id  text NOT NULL,
  ativo       boolean DEFAULT true,
  data_inicio text,
  data_fim    text
);

ALTER TABLE rotina_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rotina_clientes_dev_select ON rotina_clientes FOR SELECT USING (true);
CREATE POLICY rotina_clientes_dev_insert ON rotina_clientes FOR INSERT WITH CHECK (true);
CREATE POLICY rotina_clientes_dev_update ON rotina_clientes FOR UPDATE USING (true);
CREATE POLICY rotina_clientes_dev_delete ON rotina_clientes FOR DELETE USING (true);

-- ------------------------------------------------------------
-- ciclos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciclos (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL,
  rotina_id       text NOT NULL,
  periodo         text NOT NULL,
  data_vencimento text,
  status          text CHECK (status IN ('aberta','encerrada'))
);

CREATE INDEX IF NOT EXISTS ciclos_rotina ON ciclos (tenant_id, rotina_id);

ALTER TABLE ciclos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ciclos_dev_select ON ciclos FOR SELECT USING (true);
CREATE POLICY ciclos_dev_insert ON ciclos FOR INSERT WITH CHECK (true);
CREATE POLICY ciclos_dev_update ON ciclos FOR UPDATE USING (true);
CREATE POLICY ciclos_dev_delete ON ciclos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- ocorrencias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ocorrencias (
  id               text PRIMARY KEY,
  tenant_id        text NOT NULL,
  titulo           text NOT NULL,
  descricao        text,
  cliente_id       text,
  origem           text CHECK (origem IN ('manual','fluxo','rotina','cliente')),
  fluxo_id         text,
  rotina_id        text,
  ciclo_id         text,
  lote_id          text,
  categoria        text CHECK (categoria IN ('societario','fiscal','dp','contabil','outros')),
  valor            numeric(12,2),
  data_solicitacao text,
  data_prevista    text,
  data_conclusao   text,
  status           text CHECK (status IN ('pendente','em_andamento','concluida','cancelada')),
  responsavel_id   text,
  criado_por       text,
  criado_em        timestamptz DEFAULT now(),
  invoice_id       text
);

CREATE INDEX IF NOT EXISTS ocorrencias_tenant  ON ocorrencias (tenant_id);
CREATE INDEX IF NOT EXISTS ocorrencias_cliente ON ocorrencias (tenant_id, cliente_id);

ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY ocorrencias_dev_select ON ocorrencias FOR SELECT USING (true);
CREATE POLICY ocorrencias_dev_insert ON ocorrencias FOR INSERT WITH CHECK (true);
CREATE POLICY ocorrencias_dev_update ON ocorrencias FOR UPDATE USING (true);
CREATE POLICY ocorrencias_dev_delete ON ocorrencias FOR DELETE USING (true);

-- ------------------------------------------------------------
-- tarefas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarefas (
  id                       text PRIMARY KEY,
  tenant_id                text NOT NULL,
  ocorrencia_id            text NOT NULL,
  fluxo_tarefa_id          text,
  ordem                    integer,
  nome                     text NOT NULL,
  descricao                text,
  data_prevista            text,
  data_conclusao           text,
  status                   text CHECK (status IN ('pendente','em_andamento','concluida','atrasada','nao_se_aplica','impedido')),
  responsavel_id           text,
  observacoes              text,
  impedimento_descricao    text,
  impedimento_responsavel  text,
  impedimento_data         text,
  checklist_progresso      jsonb DEFAULT '[]',
  documentos_config        jsonb DEFAULT '[]',
  formulario_template_id   text,
  formulario_token         text,
  formulario_status        text CHECK (formulario_status IN ('nao_enviado','enviado','preenchido','expirado'))
);

CREATE INDEX IF NOT EXISTS tarefas_ocorrencia ON tarefas (tenant_id, ocorrencia_id);

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tarefas_dev_select ON tarefas FOR SELECT USING (true);
CREATE POLICY tarefas_dev_insert ON tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY tarefas_dev_update ON tarefas FOR UPDATE USING (true);
CREATE POLICY tarefas_dev_delete ON tarefas FOR DELETE USING (true);

-- ------------------------------------------------------------
-- ocorrencia_documentos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ocorrencia_documentos (
  id            text PRIMARY KEY,
  tenant_id     text NOT NULL,
  ocorrencia_id text NOT NULL,
  client_id     text,
  tarefa_id     text,
  config_id     text,
  document_id   text,
  storage_key   text,
  nome          text NOT NULL,
  tipo          text CHECK (tipo IN ('entrada','saida','referencia')),
  criado_em     timestamptz DEFAULT now(),
  criado_por    text
);

ALTER TABLE ocorrencia_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ocorrencia_documentos_dev_select ON ocorrencia_documentos FOR SELECT USING (true);
CREATE POLICY ocorrencia_documentos_dev_insert ON ocorrencia_documentos FOR INSERT WITH CHECK (true);
CREATE POLICY ocorrencia_documentos_dev_update ON ocorrencia_documentos FOR UPDATE USING (true);
CREATE POLICY ocorrencia_documentos_dev_delete ON ocorrencia_documentos FOR DELETE USING (true);

-- ------------------------------------------------------------
-- historico_tarefas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_tarefas (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL,
  tarefa_tipo text DEFAULT 'tarefa',
  tarefa_id   text NOT NULL,
  tipo        text NOT NULL,
  autor_id    text,
  autor_nome  text,
  conteudo    text,
  meta        jsonb,
  criado_em   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS historico_tarefas_tarefa ON historico_tarefas (tenant_id, tarefa_id);

ALTER TABLE historico_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY historico_tarefas_dev_select ON historico_tarefas FOR SELECT USING (true);
CREATE POLICY historico_tarefas_dev_insert ON historico_tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY historico_tarefas_dev_update ON historico_tarefas FOR UPDATE USING (true);
CREATE POLICY historico_tarefas_dev_delete ON historico_tarefas FOR DELETE USING (true);
