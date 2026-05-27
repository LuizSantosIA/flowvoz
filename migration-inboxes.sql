-- FlowVoz — Migration 2: suporte a múltiplas caixas de entrada (multi-número)
-- Executar no Neon (SQL Editor) ou via psql.

-- 1) Marcar de qual número/caixa é cada mensagem
ALTER TABLE messages ADD COLUMN IF NOT EXISTS inbox VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(inbox, created_at DESC);

-- 2) Tabela de caixas (cada número conectado = uma caixa)
--    key = identificador técnico: instância (Evolution) ou phone_number_id (Meta)
CREATE TABLE IF NOT EXISTS inboxes (
  key       VARCHAR(100) PRIMARY KEY,
  nome      VARCHAR(120) NOT NULL,
  provider  VARCHAR(20)  NOT NULL DEFAULT 'evolution', -- 'evolution' | 'meta'
  cor       VARCHAR(20)  DEFAULT 'violet',
  ativo     BOOLEAN      NOT NULL DEFAULT true,
  ordem     INTEGER      DEFAULT 0,
  criado_em TIMESTAMPTZ  DEFAULT NOW()
);

-- 3) Cadastrar a caixa atual (instância Evolution 'teste')
INSERT INTO inboxes (key, nome, provider, cor, ordem)
VALUES ('teste', 'Número 1', 'evolution', 'violet', 1)
ON CONFLICT (key) DO NOTHING;

-- 4) Marcar mensagens já existentes como pertencentes à caixa atual
UPDATE messages SET inbox = 'teste' WHERE inbox IS NULL;
