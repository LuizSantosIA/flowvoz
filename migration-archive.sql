-- FlowVoz — Migration 10: Arquivar conversas (esconder da lista principal)
ALTER TABLE conversas_status ADD COLUMN IF NOT EXISTS arquivada BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_conversas_status_arquivada ON conversas_status(arquivada);
