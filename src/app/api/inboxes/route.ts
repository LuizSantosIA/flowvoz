import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

interface Inbox {
  key: string
  nome: string
  provider: string
  cor: string
  ativo: boolean
  ordem: number
}

const MOCK_INBOXES: Inbox[] = [
  { key: 'num1', nome: 'Número 1', provider: 'evolution', cor: 'violet',  ativo: true, ordem: 1 },
  { key: 'num2', nome: 'Número 2', provider: 'evolution', cor: 'emerald', ativo: true, ordem: 2 },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === 'true'
  try {
    const r = await db.query<Inbox>(
      `SELECT key, nome, provider, cor, ativo, ordem
         FROM inboxes
        ${all ? '' : 'WHERE ativo = true'}
        ORDER BY ordem ASC, nome ASC`
    )
    return NextResponse.json(r.rows)
  } catch {
    return NextResponse.json(all ? MOCK_INBOXES : MOCK_INBOXES.filter(i => i.ativo))
  }
}

// Atualizar uma caixa: nome, cor, ativo, ordem
export async function PATCH(req: NextRequest) {
  const { key, nome, cor, ativo, ordem } = await req.json()
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ ok: false, error: 'key é obrigatório' }, { status: 400 })
  }

  // Monta SET dinâmico só com os campos enviados
  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1
  if (typeof nome === 'string')  { sets.push(`nome = $${i++}`);  vals.push(nome) }
  if (typeof cor === 'string')   { sets.push(`cor = $${i++}`);   vals.push(cor) }
  if (typeof ativo === 'boolean'){ sets.push(`ativo = $${i++}`); vals.push(ativo) }
  if (typeof ordem === 'number') { sets.push(`ordem = $${i++}`); vals.push(ordem) }

  if (sets.length === 0) {
    return NextResponse.json({ ok: false, error: 'nada para atualizar' }, { status: 400 })
  }

  vals.push(key)
  try {
    const r = await db.query<Inbox>(
      `UPDATE inboxes SET ${sets.join(', ')} WHERE key = $${i} RETURNING *`,
      vals
    )
    if (!r.rows[0]) return NextResponse.json({ ok: false, error: 'caixa não encontrada' }, { status: 404 })
    await logAudit('inbox_update', { key, patch: { nome, cor, ativo, ordem } }, req)
    return NextResponse.json({ ok: true, inbox: r.rows[0] })
  } catch (err) {
    console.error('[/api/inboxes] PATCH erro:', err)
    return NextResponse.json({ ok: false, error: 'falha no banco' }, { status: 500 })
  }
}
