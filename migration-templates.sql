-- FlowVoz — Migration 4: Templates de texto (mensagens prontas)
CREATE TABLE IF NOT EXISTS text_templates (
  id         SERIAL PRIMARY KEY,
  nome       VARCHAR(120) NOT NULL,
  content    TEXT NOT NULL,
  ordem      INTEGER DEFAULT 0,
  criados_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_templates_ordem ON text_templates(ordem ASC, id ASC);
