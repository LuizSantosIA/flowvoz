import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signSession } from '@/lib/auth'

interface UserRow {
  id: number
  nome: string
  email: string
  password_hash: string
  role: string
  ativo: boolean
}

function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set('flowvoz_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({ email: '', password: '' }))

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ ok: false, error: 'Informe a senha.' }, { status: 400 })
  }

  // 1) Modo multi-usuário: email + senha → checa tabela users
  if (typeof email === 'string' && email.trim()) {
    try {
      const r = await db.query<UserRow>(
        `SELECT id, nome, email, password_hash, role, ativo FROM users WHERE email = $1`,
        [email.trim().toLowerCase()]
      )
      const u = r.rows[0]
      if (!u) {
        return NextResponse.json({ ok: false, error: 'Usuário ou senha inválidos.' }, { status: 401 })
      }
      if (!u.ativo) {
        return NextResponse.json({ ok: false, error: 'Usuário desativado.' }, { status: 403 })
      }
      const ok = await verifyPassword(password, u.password_hash)
      if (!ok) {
        return NextResponse.json({ ok: false, error: 'Usuário ou senha inválidos.' }, { status: 401 })
      }
      // Atualiza último login (sem bloquear o response)
      db.query(`UPDATE users SET ultimo_login = NOW() WHERE id = $1`, [u.id]).catch(() => {})

      const token = await signSession(u.id)
      const res = NextResponse.json({ ok: true, user: { id: u.id, nome: u.nome, email: u.email, role: u.role } })
      setSessionCookie(res, token)
      return res
    } catch (err) {
      console.error('[/api/login] erro buscando usuário:', err)
      // se DB falhar, cai pro modo legado abaixo
    }
  }

  // 2) Modo legado: só senha → checa PANEL_PASSWORD
  const expected = process.env.PANEL_PASSWORD
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Login multi-usuário ainda não configurado.' }, { status: 500 })
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta.' }, { status: 401 })
  }
  const token = await signSession(null)
  const res = NextResponse.json({ ok: true, user: { id: null, nome: 'Admin', email: '', role: 'admin' } })
  setSessionCookie(res, token)
  return res
}
