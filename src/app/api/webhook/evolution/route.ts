import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  // Protege o webhook: exige ?secret=WEBHOOK_SECRET (ou header X-Webhook-Secret).
  // Se WEBHOOK_SECRET não estiver configurado no env, o webhook fica aberto (modo dev).
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

  // Qual número/instância recebeu (Evolution v2 envia "instance" no corpo)
  const inbox: string | null = body?.instance ?? null

  const session_id = data?.key?.remoteJid?.split('@')[0]
  const nome = data?.pushName || session_id
  const messageType: string = data?.messageType || 'conversation'

  let content = ''
  if (messageType === 'conversation') content = data?.message?.conversation || ''
  else if (messageType === 'audioMessage') content = '[Áudio recebido]'
  else if (messageType === 'imageMessage') content = data?.message?.imageMessage?.caption || '[Imagem]'
  else content = '[Mensagem]'

  try {
    await db.query(
      `INSERT INTO messages (session_id, contact_name, content, message_type, direction, inbox) VALUES ($1,$2,$3,$4,'in',$5)`,
      [session_id, nome, content, messageType, inbox]
    )
  } catch {
    console.log('[webhook] DB offline, ignorando:', session_id, content)
  }

  return NextResponse.json({ ok: true })
}
