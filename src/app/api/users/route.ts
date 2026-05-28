import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { getCurrentUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'

interface UserPublic {
  id: number
  nome: string
  email: string
  role: string
  ativo: boolean
  criado_em: string
  ultimo_login: string | null
}

async function requireAdmin(req: NextRequest) {
  const me = await getCurrentUser(req)
  if (!me) return { error: NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 }) }
  if (me.role !== 'admin') return { error: NextResponse.json({ ok: false, error: 'Apenas admin pode gerenciar usuários.' }, { status: 403 }) }
  return { me }
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error
  try {
    const r = await db.query<UserPublic>(
      `SELECT id, nome, email, role, ativo,
              TO_CHAR(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS criado_em,
              TO_CHAR(ultimo_login AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS ultimo_login
         FROM users ORDER BY criado_em DESC`
    )
    return NextResponse.json(r.rows)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error

  const { nome, email, password, role } = await req.json()
  if (!nome?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ ok: false, error: 'Nome, email e senha são obrigatórios.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'Senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
  }

  try {
    const hash = await hashPassword(password)
    const r = await db.query(
      `INSERT INTO users (nome, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role, ativo`,
      [nome.trim(), email.trim().toLowerCase(), hash, role === 'admin' ? 'admin' : 'atendente']
    )
    await logAudit('user_create', { user_id: r.rows[0].id, email: r.rows[0].email, role: r.rows[0].role }, req)
    return NextResponse.json({ ok: true, user: r.rows[0] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ ok: false, error: 'Email já cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error

  const { id, nome, role, ativo, password } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })

  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1
  if (typeof nome === 'string')      { sets.push(`nome = $${i++}`);          vals.push(nome.trim()) }
  if (typeof role === 'string')      { sets.push(`role = $${i++}`);          vals.push(role === 'admin' ? 'admin' : 'atendente') }
  if (typeof ativo === 'boolean')    { sets.push(`ativo = $${i++}`);         vals.push(ativo) }
  if (typeof password === 'string' && password) {
    if (password.length < 6) return NextResponse.json({ ok: false, error: 'Senha mínima 6 caracteres.' }, { status: 400 })
    const hash = await hashPassword(password)
    sets.push(`password_hash = $${i++}`); vals.push(hash)
  }
  if (sets.length === 0) return NextResponse.json({ ok: false, error: 'Nada para atualizar.' }, { status: 400 })

  vals.push(id)
  try {
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    await logAudit('user_update', { user_id: id, patch: { nome, role, ativo, password: password ? '***' : undefined } }, req)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })
  try {
    await db.query(`DELETE FROM users WHERE id = $1`, [id])
    await logAudit('user_delete', { user_id: parseInt(id, 10) }, req)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}
