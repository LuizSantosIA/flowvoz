/**
 * Envio de WhatsApp por caixa (inbox) — suporte a múltiplos números.
 *
 * Cada inbox tem um provider:
 *  - 'evolution' → key = nome da instância (usa EVO_URL + EVO_APIKEY do env)
 *  - 'meta'      → key = phone_number_id   (usa META_TOKEN do env)
 *
 * Os segredos compartilhados ficam no env; a identidade do número vem do inbox.
 */

export interface InboxConfig {
  key: string
  provider: 'evolution' | 'meta'
}

// ─── Helpers de número ────────────────────────────────────────────────────────
function evoNumber(to: string) {
  return to.includes('@') ? to : `${to}@s.whatsapp.net`
}
function metaNumber(to: string) {
  return to.replace(/\D/g, '')
}

// ─── Evolution API v2 ──────────────────────────────────────────────────────────
async function evoSendText(instance: string, to: string, message: string, delay = 1000) {
  const res = await fetch(`${process.env.EVO_URL}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVO_APIKEY ?? '' },
    body: JSON.stringify({ number: evoNumber(to), text: message, delay }),
  })
  if (!res.ok) throw new Error(`[Evolution] sendText: ${await res.text()}`)
}

async function evoSendAudio(instance: string, to: string, audioUrl: string) {
  // v2: o endpoint correto é sendWhatsAppAudio (sendAudio não existe → 404)
  const res = await fetch(`${process.env.EVO_URL}/message/sendWhatsAppAudio/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.EVO_APIKEY ?? '' },
    body: JSON.stringify({ number: evoNumber(to), audio: audioUrl }),
  })
  if (!res.ok) throw new Error(`[Evolution] sendAudio: ${await res.text()}`)
}

// ─── Meta Cloud API ─────────────────────────────────────────────────────────────
async function metaSendText(phoneId: string, to: string, message: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.META_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: metaNumber(to), type: 'text', text: { body: message } }),
  })
  if (!res.ok) throw new Error(`[Meta] sendText: ${await res.text()}`)
}

async function metaSendAudio(phoneId: string, to: string, audioUrl: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.META_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: metaNumber(to), type: 'audio', audio: { link: audioUrl } }),
  })
  if (!res.ok) throw new Error(`[Meta] sendAudio: ${await res.text()}`)
}

// ─── API pública (roteia pelo provider do inbox) ────────────────────────────────
export async function sendText(inbox: InboxConfig, to: string, message: string, delay = 1000) {
  if (inbox.provider === 'meta') return metaSendText(inbox.key, to, message)
  return evoSendText(inbox.key, to, message, delay)
}

export async function sendAudio(inbox: InboxConfig, to: string, audioUrl: string) {
  if (inbox.provider === 'meta') return metaSendAudio(inbox.key, to, audioUrl)
  return evoSendAudio(inbox.key, to, audioUrl)
}
