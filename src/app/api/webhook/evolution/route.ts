import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = body?.data

  // Ignorar mensagens enviadas pelo próprio número (fromMe)
  if (data?.key?.fromMe) return NextResponse.json({ ok: true })

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
      `INSERT INTO messages (session_id, contact_name, content, message_type, direction) VALUES ($1,$2,$3,$4,'in')`,
      [session_id, nome, content, messageType]
    )
  } catch {
    console.log('[webhook] DB offline, ignorando:', session_id, content)
  }

  return NextResponse.json({ ok: true })
}
