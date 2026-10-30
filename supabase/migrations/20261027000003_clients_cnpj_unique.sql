-- Garante unicidade de CNPJ por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_cnpj
  ON clients (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;
