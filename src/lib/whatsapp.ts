/**
 * Abstração do provedor de WhatsApp.
 * Para trocar de Evolution para Meta, mude WA_PROVIDER=meta no .env.local
 * e preencha as variáveis META_*.
 */

export interface WhatsAppProvider {
  sendText(to: string, message: string, delay?: number): Promise<void>
  sendAudio(to: string, audioUrl: string): Promise<void>
  pauseBot(sessionId: string, ttlSeconds?: number): Promise<void>
  markAsRead?(messageId: string, extra?: string): Promise<void>
  getMediaUrl?(mediaId: string): Promise<string>
}

// ─── Evolution API (atual) ──────────────────────────────────────────────────
class EvolutionProvider implements WhatsAppProvider {
  private base = process.env.EVO_URL!
  private instance = process.env.EVO_INSTANCE!
  private apikey = process.env.EVO_APIKEY!

  private headers() {
    return { 'Content-Type': 'application/json', apikey: this.apikey }
  }

  async sendText(to: string, message: string, delay = 1000) {
    const res = await fetch(`${this.base}/message/sendText/${this.instance}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ number: to, text: message, delay }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Evolution] sendText error:', err)
      throw new Error(err)
    }
  }

  async sendAudio(to: string, audioUrl: string) {
    const res = await fetch(`${this.base}/message/sendWhatsAppAudio/${this.instance}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ number: to, audio: audioUrl }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Evolution] sendAudio error:', err)
      throw new Error(err)
    }
  }

  async pauseBot(sessionId: string, ttlSeconds = 3600) {
    // Seta o flag de block no Redis via endpoint do n8n ou diretamente
    // Por ora, apenas log — implementar conforme infraestrutura do cliente
    console.log(`[Evolution] Pausing bot for ${sessionId} for ${ttlSeconds}s`)
  }
}

// ─── Meta Business API ─────────────────────────────────────────────────────
class MetaProvider implements WhatsAppProvider {
  private token = process.env.META_TOKEN!
  private phoneId = process.env.META_PHONE_NUMBER_ID!

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    }
  }

  async sendText(to: string, message: string, _delay?: number) {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${this.phoneId}/messages`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      },
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[Meta] sendText error:', err)
      throw new Error(err)
    }
  }

  async sendAudio(to: string, audioUrl: string) {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${this.phoneId}/messages`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'audio',
          audio: { link: audioUrl },
        }),
      },
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[Meta] sendAudio error:', err)
      throw new Error(err)
    }
  }

  async pauseBot(sessionId: string, ttlSeconds = 3600) {
    // Meta não tem endpoint de pause nativo — flag gerenciado externamente
    console.log(`[Meta] Pausing bot for ${sessionId} for ${ttlSeconds}s`)
  }

  async markAsRead(messageId: string) {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${this.phoneId}/messages`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      },
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[Meta] markAsRead error:', err)
      throw new Error(err)
    }
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      { headers: this.headers() },
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[Meta] getMediaUrl error:', err)
      throw new Error(err)
    }
    const data = await res.json()
    return data.url as string
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────
function createProvider(): WhatsAppProvider {
  const provider = process.env.WA_PROVIDER ?? 'evolution'
  if (provider === 'meta') return new MetaProvider()
  return new EvolutionProvider()
}

export const whatsapp = createProvider()
