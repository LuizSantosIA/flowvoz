import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { transcribeAudio, fetchEvolutionAudio } from '@/lib/transcribe'

export async function POST(req: NextRequest) {
  // Protege o webhook: exige ?secret=WEBHOOK_SECRET (ou header X-Webhook-Secret).
  const expected = process.env.WEBHOOK_SECRET
  if (expected) {
    const url = new URL(req.url)
    const got = url.searchParams.get('secret') ?? req.headers.get('x-webhook-secret') ?? ''
    if (got !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json()
  const data = body?.data

  // Ignorar mensagens enviadas pelo próprio número (fromMe)
  if (data?.key?.fromMe) return NextResponse.json({ ok: true })

  const inbox: string | null = body?.instance ?? null
  const session_id = data?.key?.remoteJid?.split('@')[0]
  const messageType: string = data?.messageType || 'conversation'

  // Nome do contato:
  //  1) pushName na própria mensagem (ideal)
  //  2) fallback: busca o perfil na Evolution (chat/fetchProfile)
  //  3) último fallback: o próprio número
  let nome: string = data?.pushName || ''
  if (!nome && inbox && session_id) {
    try {
      const res = await fetch(
        `${process.env.EVO_URL}/chat/fetchProfile/${inbox}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.EVO_APIKEY ?? '',
          },
          body: JSON.stringify({ number: session_id }),
        },
      )
      if (res.ok) {
        const profile = await res.json() as { name?: string; pushname?: string }
        nome = (profile.name || profile.pushname || '').trim()
      }
    } catch { /* silencioso — segue pro fallback final */ }
  }
  if (!nome) nome = session_id

  let content = ''
  if (messageType === 'conversation') content = data?.message?.conversation || ''
  else if (messageType === 'audioMessage') content = '[Áudio recebido]'
  else if (messageType === 'imageMessage') content = data?.message?.imageMessage?.caption || '[Imagem]'
  else content = '[Mensagem]'

  // Insere mensagem com placeholder, retornando o id pra atualizar depois (transcrição)
  let insertedId: number | null = null
  try {
    const r = await db.query<{ id: number }>(
      `INSERT INTO messages (session_id, contact_name, content, message_type, direction, inbox)
       VALUES ($1,$2,$3,$4,'in',$5)
       RETURNING id`,
      [session_id, nome, content, messageType, inbox]
    )
    insertedId = r.rows[0]?.id ?? null
  } catch {
    console.log('[webhook] DB offline, ignorando:', session_id, content)
  }

  // Se for áudio e OpenAI configurado: tenta transcrever e atualiza a mensagem
  if (messageType === 'audioMessage' && insertedId && inbox && process.env.OPENAI_API_KEY) {
    try {
      const media = await fetchEvolutionAudio(inbox, data.key)
      if (media) {
        const t = await transcribeAudio(media.buffer, media.mimetype)
        if (t.ok && t.text) {
          await db.query(
            `UPDATE messages SET content = $1 WHERE id = $2`,
            [`Áudio transcrito: ${t.text}`, insertedId]
          )
        } else {
          console.warn('[webhook] transcrição falhou:', t.error)
        }
      }
    } catch (err) {
      console.error('[webhook] erro na transcrição:', err)
      // Mantém "[Áudio recebido]" — não bloqueia a mensagem
    }
  }

  return NextResponse.json({ ok: true })
}
