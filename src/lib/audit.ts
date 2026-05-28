import { NextRequest } from 'next/server'
import { db } from './db'
import { verifySession } from './auth'

/**
 * Registra um evento de auditoria no banco.
 * Captura automaticamente o user_id da sessão (se houver) e o IP.
 * Nunca lança — falhas no log não devem quebrar a ação principal.
 */
export async function logAudit(
  action: string,
  details: Record<string, unknown>,
  req?: NextRequest,
  ok: boolean = true,
) {
  try {
    const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req?.headers.get('x-real-ip')
            ?? null
    let userId: number | null = null
    if (req) {
      const cookie = req.cookies.get('flowvoz_session')?.value
      const sess = await verifySession(cookie)
      userId = sess?.userId ?? null
    }
    await db.query(
      `INSERT INTO audit_log (action, details, ip, ok, user_id) VALUES ($1, $2::jsonb, $3, $4, $5)`,
      [action, JSON.stringify(details ?? {}), ip, ok, userId]
    )
  } catch {
    // silencioso
  }
}
