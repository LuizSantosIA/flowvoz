import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveInbox } from '@/lib/inboxes'
import { sendText, sendAudio } from '@/lib/whatsapp'

/** Converte erros técnicos em mensagens amigáveis pro atendente */
function friendlyError(msg: string): string {
  const low = msg.toLowerCase()
  if (low.includes('"exists":false')) return 'Esse número não existe no WhatsApp.'
  if (low.includes('401') || low.includes('unauthorized')) return 'Credenciais inválidas no provedor.'
  if (low.includes('403') || low.includes('forbidden')) return 'Provedor recusou o envio (permissão).'
  if (low.includes('404')) return 'Endpoint do provedor não encontrado.'
  if (low.includes('timeout') || low.includes('etimedout')) return 'O provedor não respondeu a tempo. Tente de novo.'
  if (low.includes('fetch failed') || low.includes('econnrefused')) return 'Não foi possível conectar ao provedor (offline?).'
  return 'Não foi possível enviar agora. Tente de novo.'
}

export async function POST(req: NextRequest) {
  const { session_id, tipo, content, audio_url, inbox } = await req.json()

  if (!session_id) {
    return NextResponse.json({ ok: false, error: 'Conversa não identificada.' }, { status: 400 })
  }
  if (tipo === 'text' && !content?.trim()) {
    return NextResponse.json({ ok: false, error: 'Mensagem vazia.' }, { status: 400 })
  }
  if (tipo === 'audio' && !audio_url) {
    return NextResponse.json({ ok: false, error: 'Áudio sem URL.' }, { status: 400 })
  }

  const target = await resolveInbox(session_id, inbox)

  let externalId: string | undefined
  try {
    if (tipo === 'audio') {
      ({ externalId } = await sendAudio(target, session_id, audio_url))
    } else if (tipo === 'text') {
      ({ externalId } = await sendText(target, session_id, content))
    } else {
      return NextResponse.json({ ok: false, error: 'Tipo de mensagem inválido.' }, { status: 400 })
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Falha desconhecida'
    console.error('[/api/send] envio falhou:', raw)
    return NextResponse.json({ ok: false, error: friendlyError(raw) }, { status: 502 })
  }

  // Sucesso: registra no DB com external_id e status='sent'
  try {
    await db.query(
      `INSERT INTO messages (session_id, content, message_type, direction, inbox, external_id, status)
       VALUES ($1,$2,$3,'out',$4,$5,'sent')`,
      [session_id, tipo === 'audio' ? '[Áudio enviado]' : content, tipo, target.key, externalId ?? null]
    )
  } catch { /* ignora se DB offline */ }

  return NextResponse.json({ ok: true })
}
