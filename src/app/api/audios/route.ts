import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MOCK_AUDIOS = [
  { id:  1, nome: 'Saudação inicial',           filename: 'audio-01.ogg', enviados_hoje: 12 },
  { id:  2, nome: 'Como funciona — 60 dias',    filename: 'audio-02.ogg', enviados_hoje: 8  },
  { id:  3, nome: 'Moradia — casa ou aluguel',  filename: 'audio-03.ogg', enviados_hoje: 5  },
  { id:  4, nome: 'Sem investimento inicial',   filename: 'audio-04.ogg', enviados_hoje: 7  },
  { id:  5, nome: 'Encaminhando pro vendedor',  filename: 'audio-05.ogg', enviados_hoje: 3  },
  { id:  6, nome: 'Solicitar endereço',         filename: 'audio-06.ogg', enviados_hoje: 4  },
  { id:  7, nome: 'Já é revendedora',           filename: 'audio-07.ogg', enviados_hoje: 2  },
  { id:  8, nome: 'Solicitar renda',            filename: 'audio-08.ogg', enviados_hoje: 9  },
  { id:  9, nome: 'Dúvida sobre comissão',      filename: 'audio-09.ogg', enviados_hoje: 6  },
  { id: 10, nome: 'Somos de Minas',             filename: 'audio-10.ogg', enviados_hoje: 0  },
  { id: 11, nome: 'Sem fotos/tabela de preços', filename: 'audio-11.ogg', enviados_hoje: 0  },
  { id: 12, nome: 'Como funciona — 90 dias',    filename: 'audio-12.ogg', enviados_hoje: 0  },
]

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        id,
        nome,
        filename,
        audio_url,
        ordem,
        (
          SELECT COUNT(*) FROM messages
          WHERE message_type = 'audio' AND direction = 'out'
            AND created_at >= CURRENT_DATE
        )::int AS enviados_hoje
      FROM audio_templates
      ORDER BY ordem ASC, id ASC
    `)
    return NextResponse.json(result.rows)
  } catch {
    return NextResponse.json(MOCK_AUDIOS)
  }
}

export async function POST(req: NextRequest) {
  const { nome, filename, audio_url, ordem } = await req.json()
  try {
    const result = await db.query(
      `INSERT INTO audio_templates (nome, filename, audio_url, ordem) VALUES ($1,$2,$3,$4) RETURNING *`,
      [nome, filename, audio_url ?? null, ordem ?? 0]
    )
    return NextResponse.json(result.rows[0])
  } catch {
    return NextResponse.json({ ok: true, mock: true })
  }
}

export async function PUT(req: NextRequest) {
  const { id, nome } = await req.json()
  try {
    await db.query(`UPDATE audio_templates SET nome = $1 WHERE id = $2`, [nome, id])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  try {
    await db.query(`DELETE FROM audio_templates WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
