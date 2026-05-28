import { NextRequest } from 'next/server'
import { db } from './db'

/**
 * Registra um evento de auditoria no banco.
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
    await db.query(
      `INSERT INTO audit_log (action, details, ip, ok) VALUES ($1, $2::jsonb, $3, $4)`,
      [action, JSON.stringify(details ?? {}), ip, ok]
    )
  } catch {
    // silencioso — log não pode quebrar a aplicação
  }
}
