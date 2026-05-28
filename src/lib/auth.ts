/**
 * Autenticação multi-usuário.
 *
 *  - Senhas: PBKDF2-SHA256, 100k iterações, sal aleatório.
 *    Armazenadas como  pbkdf2$<iter>$<saltHex>$<hashHex>
 *
 *  - Sessão: cookie httpOnly contém  <userId>.<expiryTs>.<sigHex>
 *    assinado com HMAC-SHA256 usando SESSION_SECRET (ou PANEL_PASSWORD como fallback).
 *
 * Tudo em Web Crypto para funcionar no edge runtime do Next.
 */

const ITERATIONS = 100_000

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ─── Hash de senha (PBKDF2) ────────────────────────────────────────────────────
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    // @ts-expect-error: tipos do TS pra deriveBits aceitam Uint8Array em runtime
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const hash = await pbkdf2(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${hash}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iter = parseInt(parts[1], 10)
  if (!Number.isFinite(iter) || iter < 1000) return false
  const salt = fromHex(parts[2])
  const want = parts[3]
  const got = await pbkdf2(password, salt, iter)
  return timingSafeEqual(got, want)
}

// ─── Sessão (HMAC-SHA256 sobre payload userId.expiryTs) ────────────────────────
function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.PANEL_PASSWORD || 'flowvoz-dev-secret-change-me'
}

async function hmacHex(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return toHex(sig)
}

export interface SessionPayload {
  userId: number | null   // null = sessão "legado" via PANEL_PASSWORD
  expiryTs: number
}

const SESSION_TTL_DAYS = 30

export async function signSession(userId: number | null, ttlDays: number = SESSION_TTL_DAYS): Promise<string> {
  const expiryTs = Date.now() + ttlDays * 24 * 60 * 60 * 1000
  const payload = `${userId ?? 'legacy'}.${expiryTs}`
  const sig = await hmacHex(payload)
  return `${payload}.${sig}`
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [uidRaw, expiryRaw, sig] = parts
  const payload = `${uidRaw}.${expiryRaw}`
  const expectedSig = await hmacHex(payload)
  if (!timingSafeEqual(sig, expectedSig)) return null
  const expiryTs = parseInt(expiryRaw, 10)
  if (!Number.isFinite(expiryTs) || expiryTs < Date.now()) return null
  const userId = uidRaw === 'legacy' ? null : (parseInt(uidRaw, 10) || null)
  return { userId, expiryTs }
}
