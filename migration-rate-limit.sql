-- FlowVoz — Migration 8: Rate limiting via banco
-- Tabela simples (key + timestamp). Sliding window por contagem.
CREATE TABLE IF NOT EXISTS rate_limit (
  key TEXT NOT NULL,
  ts  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_ts ON rate_limit(key, ts DESC);
