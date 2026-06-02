-- Controle de mensagens não lidas por conversa
ALTER TABLE conversas_status ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;
