-- FlowVoz — Migration 3: status por (caixa, contato)
-- O status passa a ser independente por número, então o mesmo contato em
-- 2 caixas tem fluxos separados (encerrado num número, novo no outro).

-- 0) Limpar órfãos (referências a session_id sem mensagens)
DELETE FROM conversas_status cs
 WHERE NOT EXISTS (
   SELECT 1 FROM messages m WHERE m.session_id = cs.session_id
 );

-- 1) Coluna inbox
ALTER TABLE conversas_status ADD COLUMN IF NOT EXISTS inbox VARCHAR(100);

-- 2) Backfill (qualquer linha remanescente herda o inbox da mensagem mais recente)
UPDATE conversas_status cs
   SET inbox = sub.inbox
  FROM (
    SELECT DISTINCT ON (session_id) session_id, inbox
      FROM messages
      WHERE inbox IS NOT NULL
      ORDER BY session_id, created_at DESC
  ) sub
 WHERE cs.session_id = sub.session_id
   AND cs.inbox IS NULL;

-- 3) Garantir não-nulo (linhas sem messages correspondentes recebem string vazia)
UPDATE conversas_status SET inbox = '' WHERE inbox IS NULL;
ALTER TABLE conversas_status ALTER COLUMN inbox SET NOT NULL;

-- 4) Trocar a PK pra (session_id, inbox)
ALTER TABLE conversas_status DROP CONSTRAINT IF EXISTS conversas_status_pkey;
ALTER TABLE conversas_status ADD PRIMARY KEY (session_id, inbox);
