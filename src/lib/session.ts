import { NextRequest, NextResponse } from 'next/server'
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

/** Guarda admin reutilizável em rotas API.
 *  Retorna { error: NextResponse } se não for admin; senão { me } com o usuário atual. */
export async function requireAdmin(req: NextRequest): Promise<{ me: CurrentUser } | { error: NextResponse }> {
  const me = await getCurrentUser(req)
  if (!me) return { error: NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 }) }
  if (me.role !== 'admin') return { error: NextResponse.json({ ok: false, error: 'Apenas admin.' }, { status: 403 }) }
  return { me }
}

/** Guarda "qualquer usuário autenticado" — defesa em profundidade nas rotas de API,
 *  pra não depender só do middleware. Retorna { error } com 401 se não logado. */
export async function requireUser(req: NextRequest): Promise<{ me: CurrentUser } | { error: NextResponse }> {
  const me = await getCurrentUser(req)
  if (!me) return { error: NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 }) }
  return { me }
}
