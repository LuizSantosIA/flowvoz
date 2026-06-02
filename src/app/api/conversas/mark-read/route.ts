import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest) {
  const { session_id, inbox } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id obrigatório' }, { status: 400 })
  const inboxKey = inbox ?? ''
  try {
    await db.query(
      `INSERT INTO conversas_status (session_id, inbox, status, updated_at, last_read_at)
       VALUES ($1, $2, 'novo', NOW(), NOW())
       ON CONFLICT (session_id, inbox)
       DO UPDATE SET last_read_at = NOW()`,
      [session_id, inboxKey]
    )
  } catch { /* silencioso */ }
  return NextResponse.json({ ok: true })
}
