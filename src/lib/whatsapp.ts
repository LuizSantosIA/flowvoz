/**
 * Envio de WhatsApp por caixa (inbox) — suporte a múltiplos números.
 *
 * Cada inbox tem um provider:
 *  - 'evolution' → key = nome da instância (usa EVO_URL + EVO_APIKEY do env)
 *  - 'meta'      → key = phone_number_id   (usa META_TOKEN do env)
 *
 * Os segredos compartilhados ficam no env; a identidade do número vem do inbox.
 * Cada função de envio retorna { externalId } com o ID atribuído pelo provedor,
 * útil pra rastrear status de entrega/leitura depois.
 */

export interface InboxConfig {
  key: string
  provider: 'evolution' | 'meta'
}

export interface SendResult {
  externalId?: string
}

// ─── Helpers de número ────────────────────────────────────────────────────────
function evoNumber(to: string) {
  return to.includes('@') ? to : `${to}@s.whatsapp.net`
}
function metaNumber(to: string) {
  let n = to.replace(/\D/g, '')
  // Workaround Meta + Brasil: a API armazena wa_id sem o "9" (12 dígitos) mas
  // exige "9" na frente quando manda mensagem (13 dígitos). Insere se faltar.
  // Formato esperado: 55 + DDD (2) + 9 + número (8) = 13 dígitos
  if (n.length === 12 && n.startsWith('55')) {
    const ddd = n.slice(2, 4)
    const rest = n.slice(4)
    // Só insere o 9 se for número de celular (DDD válido + 8 dígitos restantes começando com 6-9)
    if (rest.length === 8 && /^[6789]/.test(rest)) {
      n = '55' + ddd + '9' + rest
    }
  }
  return n
}

// ─── Evolution API v2 ──────────────────────────────────────────────────────────
async function evoSendText(instance: string, to: string, message: string, delay = 1000): Promise<SendResult> {
  const res = await fetch(`${process.env.EVO_URL}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVO_APIKEY ?? '' },
    body: JSON.stringify({ number: evoNumber(to), text: message, delay }),
  })
  if (!res.ok) throw new Error(`[Evolution] sendText: ${await res.text()}`)
  const data = await res.json().catch(() => null) as { key?: { id?: string } } | null
  return { externalId: data?.key?.id }
}

async function evoSendAudio(instance: string, to: string, audioUrl: string): Promise<SendResult> {
  const res = await fetch(`${process.env.EVO_URL}/message/sendWhatsAppAudio/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVO_APIKEY ?? '' },
    body: JSON.stringify({ number: evoNumber(to), audio: audioUrl }),
  })
  if (!res.ok) throw new Error(`[Evolution] sendAudio: ${await res.text()}`)
  const data = await res.json().catch(() => null) as { key?: { id?: string } } | null
  return { externalId: data?.key?.id }
}

// ─── Meta Cloud API ─────────────────────────────────────────────────────────────
async function metaSendText(phoneId: string, to: string, message: string): Promise<SendResult> {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.META_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: metaNumber(to), type: 'text', text: { body: message } }),
  })
  if (!res.ok) throw new Error(`[Meta] sendText: ${await res.text()}`)
  const data = await res.json().catch(() => null) as { messages?: Array<{ id?: string }> } | null
  return { externalId: data?.messages?.[0]?.id }
}

async function metaSendAudio(phoneId: string, to: string, audioUrl: string): Promise<SendResult> {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.META_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: metaNumber(to), type: 'audio', audio: { link: audioUrl } }),
  })
  if (!res.ok) throw new Error(`[Meta] sendAudio: ${await res.text()}`)
  const data = await res.json().catch(() => null) as { messages?: Array<{ id?: string }> } | null
  return { externalId: data?.messages?.[0]?.id }
}

// ─── API pública (roteia pelo provider do inbox) ────────────────────────────────
export async function sendText(inbox: InboxConfig, to: string, message: string, delay = 1000): Promise<SendResult> {
  if (inbox.provider === 'meta') return metaSendText(inbox.key, to, message)
  return evoSendText(inbox.key, to, message, delay)
}

export async function sendAudio(inbox: InboxConfig, to: string, audioUrl: string): Promise<SendResult> {
  if (inbox.provider === 'meta') return metaSendAudio(inbox.key, to, audioUrl)
  return evoSendAudio(inbox.key, to, audioUrl)
}
