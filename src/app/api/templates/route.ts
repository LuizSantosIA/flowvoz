import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Template {
  id: number
  nome: string
  content: string
  ordem: number
}

export async function GET() {
  try {
    const r = await db.query<Template>(
      `SELECT id, nome, content, ordem FROM text_templates ORDER BY ordem ASC, id ASC`
    )
    return NextResponse.json(r.rows)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const { nome, content, ordem } = await req.json()
  if (!nome?.trim() || !content?.trim()) {
    return NextResponse.json({ ok: false, error: 'Nome e conteúdo são obrigatórios.' }, { status: 400 })
  }
  try {
    const r = await db.query<Template>(
      `INSERT INTO text_templates (nome, content, ordem) VALUES ($1,$2,$3) RETURNING *`,
      [nome.trim(), content.trim(), typeof ordem === 'number' ? ordem : 0]
    )
    return NextResponse.json(r.rows[0])
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const { id, nome, content, ordem } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })

  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1
  if (typeof nome === 'string')    { sets.push(`nome = $${i++}`);    vals.push(nome.trim()) }
  if (typeof content === 'string') { sets.push(`content = $${i++}`); vals.push(content.trim()) }
  if (typeof ordem === 'number')   { sets.push(`ordem = $${i++}`);   vals.push(ordem) }
  if (sets.length === 0) return NextResponse.json({ ok: false, error: 'nada para atualizar' }, { status: 400 })

  vals.push(id)
  try {
    await db.query(`UPDATE text_templates SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })
  try {
    await db.query(`DELETE FROM text_templates WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}
