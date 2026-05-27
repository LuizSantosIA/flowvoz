import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { session_id, tipo, content, audio_url } = await req.json()

  const { whatsapp } = await import('@/lib/whatsapp')

  if (tipo === 'audio' && audio_url) {
    await whatsapp.sendAudio(session_id + '@s.whatsapp.net', audio_url)
  } else if (tipo === 'text' && content) {
    await whatsapp.sendText(session_id + '@s.whatsapp.net', content)
  }

  // Salvar no DB como mensagem outbound
  try {
    await db.query(
      `INSERT INTO messages (session_id, content, message_type, direction) VALUES ($1,$2,$3,'out')`,
      [session_id, tipo === 'audio' ? '[Áudio enviado]' : content, tipo]
    )
  } catch { /* ignora se DB offline */ }

  return NextResponse.json({ ok: true })
}
