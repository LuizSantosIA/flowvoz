import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MOCK_CONVERSAS = [
  { session_id: '5531991234567', nome: 'Maria Santos',   ultima_msg: 'Oi, quero saber mais',  hora: '10:32', status: 'novo' },
  { session_id: '5531998765432', nome: 'Ana Lima',        ultima_msg: 'Qual o valor?',          hora: '10:18', status: 'andamento' },
  { session_id: '5531987654321', nome: 'Josefa Oliveira', ultima_msg: 'Tá bom obrigada',        hora: '09:47', status: 'encerrado' },
]

const MOCK_MESSAGES = [
  { id: '1', direction: 'in',  content: 'Oi, quero saber mais sobre o produto', tipo: 'text',  hora: '10:30' },
  { id: '2', direction: 'out', content: 'Boas-vindas',                          tipo: 'audio', hora: '10:31' },
  { id: '3', direction: 'in',  content: 'Legal, pode me explicar melhor?',      tipo: 'text',  hora: '10:32' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  try {
    if (sessionId) {
      // Mensagens de uma conversa
      const result = await db.query<{ id: string; direction: string; content: string; message_type: string; created_at: string }>(
        `SELECT id::text, direction, content, message_type AS tipo,
                TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora
         FROM messages
         WHERE session_id = $1
         ORDER BY created_at ASC
         LIMIT 200`,
        [sessionId]
      )
      return NextResponse.json(result.rows)
    }

    // Lista de conversas (DISTINCT ON session_id)
    const result = await db.query(`
      SELECT DISTINCT ON (m.session_id)
        m.session_id,
        COALESCE(m.contact_name, m.session_id) AS nome,
        m.content AS ultima_msg,
        TO_CHAR(m.created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
        COALESCE(cs.status, 'novo') AS status
      FROM messages m
      LEFT JOIN conversas_status cs ON cs.session_id = m.session_id
      WHERE m.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY m.session_id, m.created_at DESC
      LIMIT 100
    `)
    return NextResponse.json(result.rows)
  } catch {
    if (sessionId) return NextResponse.json(MOCK_MESSAGES)
    return NextResponse.json(MOCK_CONVERSAS)
  }
}

export async function POST(req: NextRequest) {
  // Assumir atendimento — pausa bot (sem IA aqui, apenas registra status)
  const { session_id } = await req.json()
  try {
    await db.query(
      `INSERT INTO conversas_status (session_id, status, updated_at)
       VALUES ($1, 'andamento', NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET status = 'andamento', updated_at = NOW()`,
      [session_id]
    )
  } catch { /* silencioso */ }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { session_id, status } = await req.json()
  try {
    await db.query(
      `INSERT INTO conversas_status (session_id, status, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
      [session_id, status]
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
