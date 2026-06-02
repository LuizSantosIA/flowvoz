/**
 * Transcrição de áudio via OpenAI Whisper API.
 * Custo: ~US$ 0,006 por minuto de áudio. Suporta português nativamente.
 *
 * Requer OPENAI_API_KEY no ambiente. Sem isso, retorna ok=false e o conteúdo
 * permanece como "[Áudio recebido]".
 */

export interface TranscribeResult {
  ok: boolean
  text: string
  error?: string
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg',
): Promise<TranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, text: '', error: 'OPENAI_API_KEY não configurado' }
  }

  try {
    // Determina extensão a partir do mime (Whisper exige nome de arquivo válido)
    const ext = mimeType.includes('mp4') ? 'mp4'
      : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3'
      : mimeType.includes('wav') ? 'wav'
      : mimeType.includes('webm') ? 'webm'
      : 'ogg'

    const form = new FormData()
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType })
    form.append('file', blob, `audio.${ext}`)
    form.append('model', 'whisper-1')
    form.append('language', 'pt') // forçar PT-BR

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, text: '', error: `OpenAI ${res.status}: ${txt.slice(0, 200)}` }
    }
    const data = await res.json() as { text?: string }
    return { ok: true, text: (data.text ?? '').trim() }
  } catch (err) {
    return { ok: false, text: '', error: err instanceof Error ? err.message : 'erro desconhecido' }
  }
}

/**
 * Baixa qualquer mídia (áudio, imagem, documento, vídeo) do Meta WhatsApp Cloud API.
 * Processo em 2 passos: 1) GET /{media_id} pra obter URL → 2) GET essa URL com Authorization.
 */
export async function fetchMetaMedia(mediaId: string): Promise<{ buffer: Buffer; mimetype: string } | null> {
  const token = process.env.META_TOKEN
  if (!token) return null
  try {
    // 1) Metadata + URL temporária
    const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!meta.ok) {
      console.warn('[transcribe] Meta media meta falhou:', meta.status)
      return null
    }
    const info = await meta.json() as { url?: string; mime_type?: string }
    if (!info.url) return null

    // 2) Download autenticado
    const dl = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } })
    if (!dl.ok) {
      console.warn('[transcribe] Meta media download falhou:', dl.status)
      return null
    }
    const arrayBuf = await dl.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuf),
      mimetype: info.mime_type ?? 'audio/ogg',
    }
  } catch (err) {
    console.warn('[transcribe] erro buscando mídia Meta:', err)
    return null
  }
}

/** @deprecated Use fetchMetaMedia */
export const fetchMetaAudio = fetchMetaMedia

/**
 * Baixa o áudio de uma mensagem da Evolution API (v2) e devolve como Buffer.
 * Usa o endpoint /chat/getBase64FromMediaMessage que descriptografa a mídia.
 */
export async function fetchEvolutionAudio(
  instance: string,
  messageKey: { id: string; remoteJid: string; fromMe: boolean },
): Promise<{ buffer: Buffer; mimetype: string } | null> {
  try {
    const res = await fetch(
      `${process.env.EVO_URL}/chat/getBase64FromMediaMessage/${instance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.EVO_APIKEY ?? '',
        },
        body: JSON.stringify({
          message: { key: messageKey },
          convertToMp4: false,
        }),
      },
    )
    if (!res.ok) {
      console.warn('[transcribe] Evolution media fetch falhou:', res.status, await res.text())
      return null
    }
    const data = await res.json() as { base64?: string; mimetype?: string }
    if (!data.base64) return null
    return {
      buffer: Buffer.from(data.base64, 'base64'),
      mimetype: data.mimetype ?? 'audio/ogg',
    }
  } catch (err) {
    console.warn('[transcribe] erro buscando áudio:', err)
    return null
  }
}
