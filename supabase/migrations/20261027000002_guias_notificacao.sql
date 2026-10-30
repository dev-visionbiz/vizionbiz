-- Rastreamento de notificação ao cliente na guia
ALTER TABLE guias_recolhimento
  ADD COLUMN IF NOT EXISTS notificado_em         timestamptz,
  ADD COLUMN IF NOT EXISTS notificado_via        text CHECK (notificado_via IN ('whatsapp','email','manual')),
  ADD COLUMN IF NOT EXISTS cliente_visualizou_em timestamptz;

-- Referência à entidade relacionada no log de atividades
ALTER TABLE log_atividades_clientes
  ADD COLUMN IF NOT EXISTS referencia_id uuid;

CREATE INDEX IF NOT EXISTS idx_log_atividades_referencia
  ON log_atividades_clientes (tenant_id, referencia_id);
