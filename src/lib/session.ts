import { NextRequest } from 'next/server'
import { verifySession } from './auth'
import { db } from './db'

export interface CurrentUser {
  id: number | null
  nome: string
  email: string
  role: 'admin' | 'atendente' | string
}

/** Lê o cookie e devolve o usuário atual (ou null se não autenticado / sessão legacy). */
export async function getCurrentUser(req: NextRequest): Promise<CurrentUser | null> {
  const cookie = req.cookies.get('flowvoz_session')?.value
  const sess = await verifySession(cookie)
  if (!sess) return null

  // Sessão legacy (PANEL_PASSWORD): retorna admin sintético
  if (sess.userId === null) {
    return { id: null, nome: 'Admin', email: '', role: 'admin' }
  }

  try {
    const r = await db.query<{ id: number; nome: string; email: string; role: string; ativo: boolean }>(
      `SELECT id, nome, email, role, ativo FROM users WHERE id = $1`,
      [sess.userId]
    )
    const u = r.rows[0]
    if (!u || !u.ativo) return null
    return { id: u.id, nome: u.nome, email: u.email, role: u.role }
  } catch {
    return null
  }
}
