import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { resolveInbox } from '@/lib/inboxes'
import { sendAudio } from '@/lib/whatsapp'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/session'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Envio de áudio "ao vivo": atendente grava no painel → upload pro Blob → envio via Evolution/Meta.
 *
 * Recebe multipart/form-data:
 *   - audio   (File)
 *   - session_id (string)
 *   - inbox   (string opcional)
 */
export async function POST(req: NextRequest) {
  // Rate limit (mesma regra do /api/send)
  const me = await getCurrentUser(req)
  const rl = await checkRateLimit(`send:${me?.id ?? clientIp(req)}`, { max: 60, windowSec: 60, cleanup: true })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitos envios em pouco tempo. Aguarde 1 minuto.' }, { status: 429 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Vercel Blob não configurado.' }, { status: 500 })
  }

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ ok: false, error: 'Formato inválido.' }, { status: 400 })
  }
  const file = form.get('audio')
  const session_id = (form.get('session_id') as string | null)?.trim() ?? ''
  const inbox = (form.get('inbox') as string | null)?.trim() || undefined

  if (!session_id) return NextResponse.json({ ok: false, error: 'Conversa não identificada.' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Áudio ausente.' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ ok: false, error: 'Áudio vazio.' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'Áudio muito longo (máx 10MB).' }, { status: 400 })

  // Determina extensão
  const ext = file.type.includes('ogg') ? 'ogg'
    : file.type.includes('mp4') || file.type.includes('m4a') ? 'm4a'
    : file.type.includes('webm') ? 'webm'
    : 'ogg'

  // 1) Upload pro Blob (público)
  let audioUrl: string
  try {
    const blobPath = `recordings/${Date.now()}-${session_id}.${ext}`
    const uploaded = await put(blobPath, file, { access: 'public', addRandomSuffix: false, contentType: file.type || 'audio/ogg' })
    audioUrl = uploaded.url
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'falha no upload'
    console.error('[/api/send-recording] blob upload:', msg)
    return NextResponse.json({ ok: false, error: 'Falha ao subir o áudio.' }, { status: 500 })
  }

  // 2) Resolve inbox e envia via Evolution/Meta
  const target = await resolveInbox(session_id, inbox)
  let externalId: string | undefined
  try {
    ({ externalId } = await sendAudio(target, session_id, audioUrl))
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'falha desconhecida'
    console.error('[/api/send-recording] envio:', raw)
    await logAudit('send_recording_fail', { session_id, inbox: target.key, error: raw }, req, false)
    return NextResponse.json({ ok: false, error: 'Não foi possível enviar o áudio agora.' }, { status: 502 })
  }

  // 3) Registra no DB
  try {
    await db.query(
      `INSERT INTO messages (session_id, content, message_type, direction, inbox, external_id, status, user_id)
       VALUES ($1,$2,'audio','out',$3,$4,'sent',$5)`,
      [session_id, 'Áudio gravado', target.key, externalId ?? null, me?.id ?? null]
    )
  } catch { /* ignora */ }

  await logAudit('send_recording_ok', { session_id, inbox: target.key, external_id: externalId ?? null }, req)
  return NextResponse.json({ ok: true })
}
