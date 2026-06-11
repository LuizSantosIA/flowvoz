import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { requireUser } from '@/lib/session'

const MOCK_CONVERSAS = [
  { session_id: '5531991234567', inbox: 'num1', inbox_nome: 'Número 1', inbox_cor: 'violet',  nome: 'Maria Santos',   ultima_msg: 'Oi, quero saber mais', hora: '10:32', status: 'novo' },
  { session_id: '5531998765432', inbox: 'num1', inbox_nome: 'Número 1', inbox_cor: 'violet',  nome: 'Ana Lima',        ultima_msg: 'Qual o valor?',         hora: '10:18', status: 'andamento' },
  { session_id: '5531987654321', inbox: 'num2', inbox_nome: 'Número 2', inbox_cor: 'emerald', nome: 'Josefa Oliveira', ultima_msg: 'Tá bom obrigada',       hora: '09:47', status: 'encerrado' },
]

const MOCK_MESSAGES = [
  { id: '1', direction: 'in',  content: 'Oi, quero saber mais sobre o produto', tipo: 'text',  hora: '10:30' },
  { id: '2', direction: 'out', content: 'Boas-vindas',                          tipo: 'audio', hora: '10:31' },
  { id: '3', direction: 'in',  content: 'Legal, pode me explicar melhor?',      tipo: 'text',  hora: '10:32' },
]

export async function GET(req: NextRequest) {
  const guard = await requireUser(req); if ('error' in guard) return guard.error
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  const inbox = searchParams.get('inbox') // filtro opcional
  const showArchived = searchParams.get('arquivadas') === 'true'

  try {
    if (sessionId) {
      // Mensagens de uma conversa (de um número específico se inbox vier)
      const result = await db.query<{ id: string; direction: string; content: string; tipo: string; hora: string; created_at: string; status: string | null; media_url: string | null }>(
        `SELECT id::text, direction, content, message_type AS tipo,
                TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
                created_at,
                status, media_url
         FROM messages
         WHERE session_id = $1 AND ($2::text IS NULL OR inbox = $2)
         ORDER BY created_at ASC
         LIMIT 200`,
        [sessionId, inbox]
      )
      return NextResponse.json(result.rows)
    }

    // Lista de conversas — uma por (número, contato), ordenada pela mais recente, com etiquetas
    const result = await db.query(`
      SELECT
        t.session_id, t.inbox, t.inbox_nome, t.inbox_cor, t.nome, t.ultima_msg, t.hora,
        t.status, t.last_direction, t.last_at, t.unread_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', tg.id, 'nome', tg.nome, 'cor', tg.cor) ORDER BY tg.ordem ASC, tg.id ASC)
             FROM lead_tags lt
             JOIN tags tg ON tg.id = lt.tag_id
            WHERE lt.session_id = t.session_id AND lt.inbox = COALESCE(t.inbox, '')),
          '[]'::json
        ) AS tags
      FROM (
        SELECT DISTINCT ON (m.inbox, m.session_id)
          m.session_id,
          m.inbox,
          COALESCE(ib.nome, m.inbox, 'Sem número') AS inbox_nome,
          COALESCE(ib.cor, 'zinc') AS inbox_cor,
          COALESCE(m.contact_name, m.session_id) AS nome,
          m.content AS ultima_msg,
          TO_CHAR(m.created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
          COALESCE(cs.status, 'novo') AS status,
          COALESCE(cs.arquivada, false) AS arquivada,
          m.direction AS last_direction,
          m.created_at AS last_at,
          m.created_at AS _ts,
          (
            SELECT COUNT(*)::int FROM messages m2
            WHERE m2.session_id = m.session_id AND m2.inbox = m.inbox
              AND m2.direction = 'in'
              AND (cs.last_read_at IS NULL OR m2.created_at > cs.last_read_at)
          ) AS unread_count
        FROM messages m
        LEFT JOIN conversas_status cs ON cs.session_id = m.session_id AND cs.inbox = m.inbox
        LEFT JOIN inboxes ib ON ib.key = m.inbox
        WHERE m.created_at >= NOW() - INTERVAL '30 days'
          AND ($1::text IS NULL OR m.inbox = $1)
          AND COALESCE(cs.arquivada, false) = $2
        ORDER BY m.inbox, m.session_id, m.created_at DESC
      ) t
      ORDER BY t._ts DESC
      LIMIT 200
    `, [inbox, showArchived])
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch {
    if (sessionId) return NextResponse.json(MOCK_MESSAGES)
    return NextResponse.json(MOCK_CONVERSAS)
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireUser(req); if ('error' in guard) return guard.error
  const { searchParams } = new URL(req.url)
  const session_id = searchParams.get('session_id')
  const inbox = searchParams.get('inbox') ?? ''
  const mode = searchParams.get('mode') ?? 'messages' // 'messages' | 'all'

  if (!session_id) return NextResponse.json({ error: 'session_id obrigatório' }, { status: 400 })

  try {
    if (mode === 'all') {
      await db.query(`DELETE FROM lead_tags WHERE session_id = $1 AND inbox = $2`, [session_id, inbox])
      await db.query(`DELETE FROM conversas_status WHERE session_id = $1 AND inbox = $2`, [session_id, inbox])
    }
    await db.query(`DELETE FROM messages WHERE session_id = $1 AND ($2 = '' OR inbox = $2)`, [session_id, inbox])
    await logAudit(mode === 'all' ? 'conv_delete' : 'conv_clear', { session_id, inbox }, req)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/conversas]', err)
    return NextResponse.json({ error: 'Erro ao apagar' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireUser(req); if ('error' in guard) return guard.error
  // Assumir atendimento (status independente por número/caixa)
  const { session_id, inbox } = await req.json()
  const inboxKey = inbox ?? ''
  try {
    await db.query(
      `INSERT INTO conversas_status (session_id, inbox, status, updated_at)
       VALUES ($1, $2, 'andamento', NOW())
       ON CONFLICT (session_id, inbox)
       DO UPDATE SET status = 'andamento', updated_at = NOW()`,
      [session_id, inboxKey]
    )
  } catch { /* silencioso */ }
  await logAudit('conv_assume', { session_id, inbox: inboxKey }, req)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireUser(req); if ('error' in guard) return guard.error
  const { session_id, inbox, status } = await req.json()
  const inboxKey = inbox ?? ''
  try {
    await db.query(
      `INSERT INTO conversas_status (session_id, inbox, status, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (session_id, inbox)
       DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
      [session_id, inboxKey, status]
    )
    await logAudit('conv_status', { session_id, inbox: inboxKey, status }, req)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
