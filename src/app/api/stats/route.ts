import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const totals = await db.query<{
      in_hoje: number; out_hoje: number; audio_hoje: number; text_hoje: number; conversas_7d: number
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE direction='in'  AND created_at >= CURRENT_DATE)::int AS in_hoje,
        COUNT(*) FILTER (WHERE direction='out' AND created_at >= CURRENT_DATE)::int AS out_hoje,
        COUNT(*) FILTER (WHERE direction='out' AND message_type='audio' AND created_at >= CURRENT_DATE)::int AS audio_hoje,
        COUNT(*) FILTER (WHERE direction='out' AND message_type='text'  AND created_at >= CURRENT_DATE)::int AS text_hoje,
        COUNT(DISTINCT (session_id || ':' || COALESCE(inbox, '')))
          FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS conversas_7d
      FROM messages
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

    return NextResponse.json({
      totals: totals.rows[0] ?? { in_hoje: 0, out_hoje: 0, audio_hoje: 0, text_hoje: 0, conversas_7d: 0 },
      porCaixa: porCaixa.rows,
      porDia: porDia.rows,
    })
  } catch {
    return NextResponse.json({
      totals: { in_hoje: 0, out_hoje: 0, audio_hoje: 0, text_hoje: 0, conversas_7d: 0 },
      porCaixa: [],
      porDia: [],
    })
  }
}
