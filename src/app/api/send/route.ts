import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveInbox } from '@/lib/inboxes'
import { sendText, sendAudio } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { session_id, tipo, content, audio_url, inbox } = await req.json()

  // Descobre por qual número/caixa enviar (explícito → conversa → env)
  const target = await resolveInbox(session_id, inbox)

  if (tipo === 'audio' && audio_url) {
    await sendAudio(target, session_id, audio_url)
  } else if (tipo === 'text' && content) {
    await sendText(target, session_id, content)
  }

  // Salvar no DB como mensagem outbound, marcando a caixa
  try {
    await db.query(
      `INSERT INTO messages (session_id, content, message_type, direction, inbox) VALUES ($1,$2,$3,'out',$4)`,
      [session_id, tipo === 'audio' ? '[Áudio enviado]' : content, tipo, target.key]
    )
  } catch { /* ignora se DB offline */ }

  return NextResponse.json({ ok: true })
}
