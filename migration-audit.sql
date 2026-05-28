-- FlowVoz — Migration 6: Auditoria + rastreio de áudios enviados

-- 1) Log de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  action     VARCHAR(60) NOT NULL,
  details    JSONB,
  ip         VARCHAR(60),
  ok         BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_log(action, created_at DESC);

-- 2) Rastrear qual áudio foi enviado (pro dashboard de top áudios)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_id INTEGER REFERENCES audio_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_audio_id ON messages(audio_id) WHERE audio_id IS NOT NULL;
