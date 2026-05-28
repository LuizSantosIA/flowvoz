import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Define o conjunto de tags de um lead (substitui).
 * Body: { session_id, inbox?, tag_ids: number[] }
 */
export async function PUT(req: NextRequest) {
  const { session_id, inbox, tag_ids } = await req.json()
  if (!session_id) return NextResponse.json({ ok: false, error: 'session_id obrigatório' }, { status: 400 })
  if (!Array.isArray(tag_ids)) return NextResponse.json({ ok: false, error: 'tag_ids deve ser array' }, { status: 400 })
  const inboxKey = inbox ?? ''
  try {
    await db.query(`DELETE FROM lead_tags WHERE session_id = $1 AND inbox = $2`, [session_id, inboxKey])
    for (const tagId of tag_ids) {
      if (typeof tagId !== 'number') continue
      await db.query(
        `INSERT INTO lead_tags (tag_id, session_id, inbox) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [tagId, session_id, inboxKey]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/conversas/tags] erro:', err)
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}
