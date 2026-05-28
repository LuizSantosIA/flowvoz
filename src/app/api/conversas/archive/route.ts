import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

/**
 * Arquivar/desarquivar uma conversa.
 * Body: { session_id, inbox?, arquivada: boolean }
 */
export async function PUT(req: NextRequest) {
  const { session_id, inbox, arquivada } = await req.json()
  if (!session_id) return NextResponse.json({ ok: false, error: 'session_id obrigatório' }, { status: 400 })
  if (typeof arquivada !== 'boolean') return NextResponse.json({ ok: false, error: 'arquivada (boolean) obrigatório' }, { status: 400 })
  const inboxKey = inbox ?? ''
  try {
    await db.query(
      `INSERT INTO conversas_status (session_id, inbox, status, arquivada, updated_at)
       VALUES ($1, $2, 'novo', $3, NOW())
       ON CONFLICT (session_id, inbox)
       DO UPDATE SET arquivada = EXCLUDED.arquivada, updated_at = NOW()`,
      [session_id, inboxKey, arquivada]
    )
    await logAudit(arquivada ? 'conv_archive' : 'conv_unarchive', { session_id, inbox: inboxKey }, req)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}
