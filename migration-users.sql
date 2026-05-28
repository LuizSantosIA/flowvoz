-- FlowVoz — Migration 7: Multi-usuário
-- Cada atendente tem seu próprio login. Auditoria e mensagens registram quem fez o quê.
-- A PANEL_PASSWORD continua válida como fallback (modo legado) caso nenhum usuário esteja cadastrado.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- formato: pbkdf2$iter$saltHex$hashHex
  role          VARCHAR(20) NOT NULL DEFAULT 'atendente',  -- 'admin' | 'atendente'
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  ultimo_login  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Quem fez cada ação
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE messages  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
