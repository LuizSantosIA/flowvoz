import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signSession } from '@/lib/auth'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

interface UserRow { id: number; nome: string; email: string; password_hash: string; role: string; ativo: boolean }

function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set('flowvoz_session', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await checkRateLimit(`login:${ip}`, { max: 10, windowSec: 300, cleanup: true })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 })
  }

  const { email, password } = await req.json().catch(() => ({ email: '', password: '' }))
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ ok: false, error: 'Informe a senha.' }, { status: 400 })
  }

  // 1) Modo multi-usuário: email + senha
  if (typeof email === 'string' && email.trim()) {
    try {
      const r = await db.query<UserRow>(
        `SELECT id, nome, email, password_hash, role, ativo FROM users WHERE email = $1`,
        [email.trim().toLowerCase()]
      )
      const u = r.rows[0]
      if (!u)        return NextResponse.json({ ok: false, error: 'Usuário ou senha inválidos.' }, { status: 401 })
      if (!u.ativo)  return NextResponse.json({ ok: false, error: 'Usuário desativado.' }, { status: 403 })
      const ok = await verifyPassword(password, u.password_hash)
      if (!ok)       return NextResponse.json({ ok: false, error: 'Usuário ou senha inválidos.' }, { status: 401 })
      db.query(`UPDATE users SET ultimo_login = NOW() WHERE id = $1`, [u.id]).catch(() => {})
      const token = await signSession(u.id)
      const res = NextResponse.json({ ok: true, user: { id: u.id, nome: u.nome, email: u.email, role: u.role } })
      setSessionCookie(res, token)
      return res
    } catch (err) {
      console.error('[/api/login] erro:', err)
    }
  }

  // 2) Fallback: só senha → PANEL_PASSWORD (admin legacy)
  const expected = process.env.PANEL_PASSWORD
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Configuração incompleta.' }, { status: 500 })
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta.' }, { status: 401 })
  }
  const token = await signSession(null)
  const res = NextResponse.json({ ok: true, user: { id: null, nome: 'Admin', email: '', role: 'admin' } })
  setSessionCookie(res, token)
  return res
}
