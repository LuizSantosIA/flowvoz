import { db } from './db'

export interface Inbox {
  key: string
  nome: string
  provider: 'evolution' | 'meta'
  cor: string
  ordem: number
}

/** Lista as caixas ativas (para o seletor do painel). */
export async function listInboxes(): Promise<Inbox[]> {
  const r = await db.query<Inbox>(
    `SELECT key, nome, provider, cor, ordem
       FROM inboxes
      WHERE ativo = true
      ORDER BY ordem ASC, nome ASC`
  )
  return r.rows
}

/** Busca a config de uma caixa específica. */
export async function getInbox(key: string): Promise<Inbox | null> {
  const r = await db.query<Inbox>(
    `SELECT key, nome, provider, cor, ordem FROM inboxes WHERE key = $1`,
    [key]
  )
  return r.rows[0] ?? null
}

/**
 * Resolve qual caixa usar para enviar a uma conversa.
 * Ordem: inbox explícito → última mensagem da conversa → fallback do env.
 */
export async function resolveInbox(sessionId: string, explicitKey?: string): Promise<InboxResolved> {
  let key = explicitKey
  if (!key) {
    try {
      const r = await db.query<{ inbox: string }>(
        `SELECT inbox FROM messages
          WHERE session_id = $1 AND inbox IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`,
        [sessionId]
      )
      key = r.rows[0]?.inbox
    } catch { /* DB indisponível */ }
  }

  if (key) {
    const cfg = await getInbox(key).catch(() => null)
    if (cfg) return { key: cfg.key, provider: cfg.provider }
    // inbox não cadastrado: assume o provider padrão do env
    return { key, provider: (process.env.WA_PROVIDER === 'meta' ? 'meta' : 'evolution') }
  }

  // Fallback total: env
  const provider = process.env.WA_PROVIDER === 'meta' ? 'meta' : 'evolution'
  const fallbackKey = provider === 'meta'
    ? (process.env.META_PHONE_NUMBER_ID ?? '')
    : (process.env.EVO_INSTANCE ?? '')
  return { key: fallbackKey, provider }
}

export interface InboxResolved {
  key: string
  provider: 'evolution' | 'meta'
}
