import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

const MOCK_AUDIOS = [
  { id:  1, nome: 'Saudação inicial',           filename: 'audio-01.ogg', enviados_hoje: 12 },
  { id:  2, nome: 'Como funciona — 60 dias',    filename: 'audio-02.ogg', enviados_hoje: 8  },
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

/**
 * POST: aceita 2 formatos.
 *  - multipart/form-data com campos { file, nome } → upload pro Vercel Blob + INSERT
 *  - application/json com { nome, filename, audio_url } → INSERT direto (admin/manual)
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req); if ('error' in guard) return guard.error
  const ctype = req.headers.get('content-type') ?? ''

  // ── Upload via multipart ───────────────────────────────────────────────────
  if (ctype.startsWith('multipart/form-data')) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Vercel Blob não configurado (BLOB_READ_WRITE_TOKEN ausente).' }, { status: 500 })
    }
    try {
      const form = await req.formData()
      const file = form.get('file')
      const nome = (form.get('nome') as string | null)?.trim() ?? ''
      if (!nome) return NextResponse.json({ ok: false, error: 'Nome obrigatório.' }, { status: 400 })
      if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Arquivo de áudio obrigatório.' }, { status: 400 })

      // Limita tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: 'Arquivo muito grande (máx 10MB).' }, { status: 400 })
      }

      // Tipos aceitos
      const okTypes = ['audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/aac', 'audio/x-aac', 'audio/opus']
      if (file.type && !okTypes.some(t => file.type === t || file.type.startsWith(t))) {
        return NextResponse.json({ ok: false, error: `Formato não suportado: ${file.type}. Use .ogg, .mp3, .m4a ou .wav.` }, { status: 400 })
      }

      // Filename seguro
      const ext = (file.name.split('.').pop() ?? 'ogg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const stamp = Date.now()
      const blobPath = `audios/${stamp}-${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.${ext}`

      // Upload pro Vercel Blob (público — URL acessível pra Evolution/Meta baixar)
      const uploaded = await put(blobPath, file, { access: 'public', addRandomSuffix: false })

      // INSERT no DB
      const ordemMax = await db.query<{ m: number }>(`SELECT COALESCE(MAX(ordem), 0) AS m FROM audio_templates`)
      const novaOrdem = (ordemMax.rows[0]?.m ?? 0) + 1
      const r = await db.query(
        `INSERT INTO audio_templates (nome, filename, audio_url, ordem) VALUES ($1,$2,$3,$4) RETURNING *`,
        [nome, `${stamp}.${ext}`, uploaded.url, novaOrdem]
      )
      return NextResponse.json({ ok: true, audio: r.rows[0] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha no upload'
      console.error('[/api/audios] upload erro:', msg)
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
  }

  // ── Modo JSON (legacy / popular áudios fixos do repo) ──────────────────────
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
  const guard = await requireAdmin(req); if ('error' in guard) return guard.error
  const { id, nome, ordem } = await req.json()
  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1
  if (typeof nome === 'string')  { sets.push(`nome = $${i++}`);  vals.push(nome.trim()) }
  if (typeof ordem === 'number') { sets.push(`ordem = $${i++}`); vals.push(ordem) }
  if (sets.length === 0) return NextResponse.json({ ok: false, error: 'nada para atualizar' }, { status: 400 })
  vals.push(id)
  try {
    await db.query(`UPDATE audio_templates SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req); if ('error' in guard) return guard.error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 })
  try {
    // Pega a URL pra deletar do Blob se for de lá
    const r = await db.query<{ audio_url: string | null }>(
      `DELETE FROM audio_templates WHERE id = $1 RETURNING audio_url`,
      [id]
    )
    const url = r.rows[0]?.audio_url
    if (url && url.includes('.vercel-storage.com/')) {
      try { await del(url) } catch { /* silencioso — arquivo já pode não existir */ }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha no banco.' }, { status: 500 })
  }
}
