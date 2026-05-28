-- FlowVoz — Migration 9: Etiquetas customizadas por lead

CREATE TABLE IF NOT EXISTS tags (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(80) NOT NULL,
  cor       VARCHAR(20) NOT NULL DEFAULT 'violet',
  ordem     INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_tags (
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  inbox      VARCHAR(100) NOT NULL DEFAULT '',
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tag_id, session_id, inbox)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(session_id, inbox);
CREATE INDEX IF NOT EXISTS idx_tags_ordem ON tags(ordem ASC, id ASC);
