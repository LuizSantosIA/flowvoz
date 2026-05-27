import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ─── Tipos Meta ──────────────────────────────────────────────────────────────
interface MetaMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'video' | string
  text?: { body: string }
  audio?: { id: string; mime_type?: string }
  image?: { id: string; caption?: string; mime_type?: string }
  document?: { id: string; caption?: string; filename?: string; mime_type?: string }
  sticker?: { id: string }
  video?: { id: string; caption?: string }
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

// Mapa de tipos Meta → formato Evolution-like
const typeMap: Record<string, string> = {
  text: 'conversation',
  audio: 'audioMessage',
  image: 'imageMessage',
  document: 'documentMessage',
  sticker: 'stickyMessage',
  video: 'videoMessage',
}

// ─── GET — Verificação de webhook pela Meta ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verificação de webhook aprovada')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('[Meta Webhook] Verificação recusada — token inválido ou mode incorreto')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST — Recebe mensagens da Meta e encaminha ao n8n ──────────────────────
export async function POST(req: NextRequest) {
  // 1. Validar assinatura X-Hub-Signature-256 (recomendado)
  const appSecret = process.env.META_APP_SECRET
  if (appSecret) {
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')

    if (signature !== expected) {
      console.warn('[Meta Webhook] Assinatura inválida — requisição rejeitada')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse após validação (rawBody já foi lido)
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    return handlePayload(payload)
  }

  // Sem APP_SECRET configurado — parse direto
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  return handlePayload(payload)
}

// ─── Processamento do payload ─────────────────────────────────────────────────
async function handlePayload(payload: Record<string, unknown>) {
  // 2. Parsear estrutura Meta
  const entries = payload.entry as Array<{
    changes: Array<{ value: MetaValue }>
  }> | undefined

  if (!entries || entries.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const value: MetaValue | undefined = entries[0]?.changes?.[0]?.value

  if (!value) {
    return NextResponse.json({ ok: true })
  }

  // 3. Ignorar eventos de status (delivered, read, sent) — não são mensagens
  if (!value.messages || value.messages.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const message = value.messages[0]
  const contact = value.contacts?.[0]

  // 4. Normalizar para formato Evolution-like esperado pelo n8n
  const metaMediaId: string =
    ((message as unknown) as Record<string, Record<string, string>>)[message.type]?.id ?? ''

  const normalized = {
    body: {
      data: {
        key: {
          remoteJid: `${message.from}@s.whatsapp.net`,
          id: message.id,
          fromMe: false,
        },
        pushName: contact?.profile?.name ?? message.from,
        message: {
          conversation: message.type === 'text' ? (message.text?.body ?? '') : '',
          audioMessage:
            message.type === 'audio'
              ? { id: message.audio?.id }
              : undefined,
          imageMessage:
            message.type === 'image'
              ? { id: message.image?.id, caption: message.image?.caption }
              : undefined,
          documentMessage:
            message.type === 'document'
              ? { id: message.document?.id, caption: message.document?.caption }
              : undefined,
        },
        messageType: typeMap[message.type] ?? 'conversation',
        messageTimestamp: parseInt(message.timestamp, 10),
        // Campos extras para o n8n identificar que é Meta
        metaPhoneNumberId: value.metadata?.phone_number_id ?? '',
        metaMediaId,
        provedor: 'meta',
      },
    },
  }

  // 5. Encaminhar ao n8n
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    console.warn('[Meta Webhook] N8N_WEBHOOK_URL não configurado — mensagem descartada')
    return NextResponse.json({ ok: true })
  }

  try {
    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    })
    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      console.error('[Meta Webhook] Erro ao encaminhar ao n8n:', errText)
    }
  } catch (err) {
    console.error('[Meta Webhook] Falha de rede ao chamar n8n:', err)
  }

  // 6. Retornar 200 imediatamente — Meta espera resposta rápida
  return NextResponse.json({ ok: true })
}
