import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { transcribeAudio, fetchMetaAudio } from '@/lib/transcribe'

// ─── Tipos Meta ──────────────────────────────────────────────────────────────
interface MetaMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'video' | 'location' | string
  text?: { body: string }
  audio?: { id: string; mime_type?: string }
  image?: { id: string; caption?: string; mime_type?: string }
  document?: { id: string; caption?: string; filename?: string; mime_type?: string }
  video?: { id: string; caption?: string }
  location?: { latitude?: number; longitude?: number; name?: string; address?: string }
}

interface MetaContact {
  profile: { name: string }
  wa_id: string
}

interface MetaValue {
  messaging_product: string
  metadata: { display_phone_number: string; phone_number_id: string }
  contacts?: MetaContact[]
  messages?: MetaMessage[]
  statuses?: unknown[]
}

// Tipo Meta → tipo simplificado usado pelo painel
const typeMap: Record<string, string> = {
  text: 'text',
  audio: 'audio',
  image: 'image',
  document: 'document',
  sticker: 'sticker',
  video: 'video',
  location: 'location',
}

// ─── GET — Verificação de webhook pela Meta ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verificação aprovada')
    return new NextResponse(challenge, { status: 200 })
  }
  console.warn('[Meta Webhook] Verificação recusada')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST — Recebe mensagens da Meta e grava no painel ───────────────────────
export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET

  // Validar assinatura X-Hub-Signature-256 (se APP_SECRET configurado)
  let payload: Record<string, unknown>
  if (appSecret) {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
    if (signature !== expected) {
      console.warn('[Meta Webhook] Assinatura inválida')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  } else {
    try { payload = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }

  return handlePayload(payload)
}

interface MetaStatus { id: string; status: string; recipient_id?: string; timestamp?: string }

async function handlePayload(payload: Record<string, unknown>) {
  const entries = payload.entry as Array<{ changes: Array<{ value: MetaValue & { statuses?: MetaStatus[] } }> }> | undefined
  const value = entries?.[0]?.changes?.[0]?.value

  if (!value) return NextResponse.json({ ok: true })

  // Eventos de status (sent / delivered / read / failed) — atualizam mensagens outbound
  if (value.statuses && value.statuses.length > 0) {
    for (const st of value.statuses) {
      try {
        await db.query(
          `UPDATE messages SET status = $1 WHERE external_id = $2`,
          [st.status, st.id]
        )
      } catch { /* silencioso */ }
    }
    return NextResponse.json({ ok: true })
  }

  if (!value.messages || value.messages.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const message = value.messages[0]
  const contact = value.contacts?.[0]
  const phoneNumberId = value.metadata?.phone_number_id ?? null
  const displayNumber = value.metadata?.display_phone_number ?? phoneNumberId ?? 'Meta'

  const session_id = message.from
  const nome = contact?.profile?.name ?? message.from
  const tipo = typeMap[message.type] ?? 'text'

  let content = ''
  if (message.type === 'text') content = message.text?.body ?? ''
  else if (message.type === 'audio') content = '[Áudio recebido]'
  else if (message.type === 'image') content = message.image?.caption || '[Imagem]'
  else if (message.type === 'document') content = message.document?.caption || '[Documento]'
  else if (message.type === 'location') {
    const lat = message.location?.latitude
    const lng = message.location?.longitude
    const name = (message.location?.name || '').trim()
    const addr = (message.location?.address || '').trim()
    if (typeof lat === 'number' && typeof lng === 'number') {
      const url = `https://www.google.com/maps?q=${lat},${lng}`
      const label = name || addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      content = `📍 ${label}\n${url}`
    } else {
      content = '📍 Localização (sem coordenadas)'
    }
  }
  else content = '[Mensagem]'

  let insertedId: number | null = null
  try {
    // Auto-cadastra a caixa (número Meta) na primeira mensagem
    if (phoneNumberId) {
      await db.query(
        `INSERT INTO inboxes (key, nome, provider, cor, ordem)
         VALUES ($1, $2, 'meta', 'blue', 99)
         ON CONFLICT (key) DO NOTHING`,
        [phoneNumberId, displayNumber]
      )
    }
    const r = await db.query<{ id: number }>(
      `INSERT INTO messages (session_id, contact_name, content, message_type, direction, inbox)
       VALUES ($1,$2,$3,$4,'in',$5)
       RETURNING id`,
      [session_id, nome, content, tipo, phoneNumberId]
    )
    insertedId = r.rows[0]?.id ?? null
  } catch (err) {
    console.error('[Meta Webhook] Erro ao gravar no banco:', err)
  }

  // Se for áudio e OpenAI configurado: transcreve e atualiza a mensagem
  if (message.type === 'audio' && message.audio?.id && insertedId && process.env.OPENAI_API_KEY) {
    try {
      const media = await fetchMetaAudio(message.audio.id)
      if (media) {
        const t = await transcribeAudio(media.buffer, media.mimetype)
        if (t.ok && t.text) {
          await db.query(
            `UPDATE messages SET content = $1 WHERE id = $2`,
            [`Áudio transcrito: ${t.text}`, insertedId]
          )
        } else {
          console.warn('[Meta Webhook] transcrição falhou:', t.error)
        }
      }
    } catch (err) {
      console.error('[Meta Webhook] erro na transcrição:', err)
    }
  }

  // Meta espera 200 rápido
  return NextResponse.json({ ok: true })
}
