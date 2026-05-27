-- Painel Bia — Migration
-- Executar: psql -U usuario -d banco -f migration.sql

-- ── Mensagens recebidas/enviadas ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  contact_name VARCHAR(200),
  content TEXT,
  message_type VARCHAR(50) DEFAULT 'text',
  direction VARCHAR(5) NOT NULL, -- 'in' ou 'out'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ── Templates de áudio ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audio_templates (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  filename VARCHAR(300) NOT NULL,
  audio_url VARCHAR(500),
  ordem INTEGER DEFAULT 0,
  enviados_total INTEGER DEFAULT 0,
  criados_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Status das conversas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversas_status (
  session_id VARCHAR(100) PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'novo',
  atendente VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversas_status_status ON conversas_status(status);
