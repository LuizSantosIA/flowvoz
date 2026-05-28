-- FlowVoz — Migration 5: Status de entrega das mensagens
-- Valores: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | NULL (mensagens antigas)

ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id VARCHAR(200);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id);
