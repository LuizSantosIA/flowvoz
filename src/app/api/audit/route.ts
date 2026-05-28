import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface AuditRow {
  id: string
  action: string
  details: Record<string, unknown>
  ip: string | null
  ok: boolean
  created_at: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500)
  const action = searchParams.get('action')

  try {
    const r = await db.query<AuditRow>(
      `SELECT id::text, action, details, ip, ok,
              TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI:SS') AS created_at
         FROM audit_log
        WHERE ($1::text IS NULL OR action = $1)
        ORDER BY created_at DESC
        LIMIT $2`,
      [action, limit]
    )
    return NextResponse.json(r.rows)
  } catch {
    return NextResponse.json([])
  }
}
