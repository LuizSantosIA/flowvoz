import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const guard = await requireUser(req); if ('error' in guard) return guard.error
  try {
    const totals = await db.query<{
      in_hoje: number; out_hoje: number; audio_hoje: number; text_hoje: number
      conversas_7d: number; conversas_hoje: number; contatos_total: number; msgs_total: number
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE direction='in'  AND created_at >= CURRENT_DATE)::int AS in_hoje,
        COUNT(*) FILTER (WHERE direction='out' AND created_at >= CURRENT_DATE)::int AS out_hoje,
        COUNT(*) FILTER (WHERE direction='out' AND message_type='audio' AND created_at >= CURRENT_DATE)::int AS audio_hoje,
        COUNT(*) FILTER (WHERE direction='out' AND message_type='text'  AND created_at >= CURRENT_DATE)::int AS text_hoje,
        COUNT(DISTINCT (session_id || ':' || COALESCE(inbox, '')))
          FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS conversas_7d,
        COUNT(DISTINCT (session_id || ':' || COALESCE(inbox, '')))
          FILTER (WHERE created_at >= CURRENT_DATE)::int AS conversas_hoje,
        COUNT(DISTINCT session_id)::int AS contatos_total,
        COUNT(*)::int AS msgs_total
      FROM messages
    `)

    // Conversas com a janela de 24h ainda aberta (última mensagem RECEBIDA < 24h)
    const janela = await db.query<{ abertas: number }>(`
      SELECT COUNT(*)::int AS abertas FROM (
        SELECT session_id, inbox
          FROM messages
         GROUP BY session_id, inbox
        HAVING MAX(created_at) FILTER (WHERE direction='in') >= NOW() - INTERVAL '24 hours'
      ) s
    `)

    const porCaixa = await db.query<{ inbox: string; cor: string; in_hoje: number; out_hoje: number }>(`
      SELECT COALESCE(ib.nome, m.inbox, 'Sem número') AS inbox,
             COALESCE(ib.cor, 'zinc') AS cor,
             COUNT(*) FILTER (WHERE m.direction='in')::int  AS in_hoje,
             COUNT(*) FILTER (WHERE m.direction='out')::int AS out_hoje
      FROM messages m
      LEFT JOIN inboxes ib ON ib.key = m.inbox
      WHERE m.created_at >= CURRENT_DATE
      GROUP BY ib.nome, m.inbox, ib.cor
      ORDER BY in_hoje DESC, out_hoje DESC
    `)

    const porDia = await db.query<{ dia: string; recebidas: number; enviadas: number }>(`
      SELECT
        TO_CHAR(d::date, 'DD/MM') AS dia,
        COALESCE(SUM(CASE WHEN m.direction='in'  THEN 1 ELSE 0 END), 0)::int AS recebidas,
        COALESCE(SUM(CASE WHEN m.direction='out' THEN 1 ELSE 0 END), 0)::int AS enviadas
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '6 days')::date,
        CURRENT_DATE::date,
        INTERVAL '1 day'
      ) d
      LEFT JOIN messages m ON m.created_at::date = d::date
      GROUP BY d
      ORDER BY d
    `)

    // Movimento por hora do dia (últimos 7 dias, fuso de São Paulo)
    const porHoraRows = await db.query<{ hora_num: number; recebidas: number; enviadas: number }>(`
      SELECT h AS hora_num,
             COALESCE(SUM(CASE WHEN m.direction='in'  THEN 1 ELSE 0 END), 0)::int AS recebidas,
             COALESCE(SUM(CASE WHEN m.direction='out' THEN 1 ELSE 0 END), 0)::int AS enviadas
      FROM generate_series(0, 23) h
      LEFT JOIN messages m
        ON EXTRACT(HOUR FROM m.created_at AT TIME ZONE 'America/Sao_Paulo')::int = h
       AND m.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY h
      ORDER BY h
    `)
    const porHora = porHoraRows.rows.map(r => ({
      hora: `${String(r.hora_num).padStart(2, '0')}h`,
      recebidas: r.recebidas,
      enviadas: r.enviadas,
    }))

    // Conversas por etiqueta (quantos contatos têm cada etiqueta)
    const porEtiqueta = await db.query<{ nome: string; cor: string; total: number }>(`
      SELECT tg.nome, tg.cor,
             COUNT(DISTINCT (lt.session_id || ':' || COALESCE(lt.inbox, '')))::int AS total
        FROM tags tg
        LEFT JOIN lead_tags lt ON lt.tag_id = tg.id
       GROUP BY tg.id, tg.nome, tg.cor
       ORDER BY total DESC, tg.nome ASC
    `)

    const topAudios = await db.query<{ nome: string; envios: number }>(`
      SELECT at.nome,
             COUNT(m.id)::int AS envios
        FROM audio_templates at
        LEFT JOIN messages m
               ON m.audio_id = at.id
              AND m.direction = 'out'
              AND m.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY at.id, at.nome
       HAVING COUNT(m.id) > 0
       ORDER BY envios DESC, at.nome ASC
       LIMIT 5
    `)

    return NextResponse.json({
      totals: {
        ...(totals.rows[0] ?? { in_hoje: 0, out_hoje: 0, audio_hoje: 0, text_hoje: 0, conversas_7d: 0, conversas_hoje: 0, contatos_total: 0, msgs_total: 0 }),
        janela_aberta: janela.rows[0]?.abertas ?? 0,
      },
      porCaixa: porCaixa.rows,
      porDia: porDia.rows,
      porHora,
      porEtiqueta: porEtiqueta.rows,
      topAudios: topAudios.rows,
    })
  } catch {
    return NextResponse.json({
      totals: { in_hoje: 0, out_hoje: 0, audio_hoje: 0, text_hoje: 0, conversas_7d: 0, conversas_hoje: 0, contatos_total: 0, msgs_total: 0, janela_aberta: 0 },
      porCaixa: [],
      porDia: [],
      porHora: [],
      porEtiqueta: [],
      topAudios: [],
    })
  }
}