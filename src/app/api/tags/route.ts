import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

interface Tag {
  id: number
  nome: string
  cor: string
  ordem: number
}

export async function GET() {
  try {
    const r = await db.query<Tag>(`SELECT id, nome, cor, ordem FROM tags ORDER BY ordem ASC, id ASC`)
    return NextResponse.json(r.rows)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req); if ('error' in guard) return guard.error
  const { nome, cor, ordem } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ ok: false, error: 'Nome obrigatório.' }, { status: 400 })
  try {
    const ordemMax = await db.query<{ m: number }>(`SELECT COALESCE(MAX(ordem), 0) AS m FROM tags`)
    const novaOrdem = typeof ordem === 'number' ? ordem : (ordemMax.rows[0]?.m ?? 0) + 1
    const r = await db.query<Tag>(
      `INSERT INTO tags (nome, cor, ordem) VALUES ($1, $2, $3) RETURNING *`,
      [nome.trim(), cor || 'violet', novaOrdem]
    )
    return NextResponse.json({ ok: true, tag: r.rows[0] })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req); if ('error' in guard) return guard.error
  const { id, nome, cor, ordem } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })

  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1
  if (typeof nome === 'string')  { sets.push(`nome = $${i++}`);  vals.push(nome.trim()) }
  if (typeof cor === 'string')   { sets.push(`cor = $${i++}`);   vals.push(cor) }
  if (typeof ordem === 'number') { sets.push(`ordem = $${i++}`); vals.push(ordem) }
  if (sets.length === 0) return NextResponse.json({ ok: false, error: 'nada para atualizar' }, { status: 400 })

  vals.push(id)
  try {
    await db.query(`UPDATE tags SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req); if ('error' in guard) return guard.error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })
  try {
    await db.query(`DELETE FROM tags WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}
