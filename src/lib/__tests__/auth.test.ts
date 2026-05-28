import { describe, it, expect, beforeAll } from 'vitest'
import { hashPassword, verifyPassword, signSession, verifySession } from '../auth'

beforeAll(() => {
  // Garantir um segredo determinístico pros testes (sem isso, o fallback ainda funciona)
  process.env.SESSION_SECRET = 'test-secret-flowvoz'
})

describe('hashPassword / verifyPassword', () => {
  it('gera hashes diferentes pra mesma senha (salt aleatório)', async () => {
    const h1 = await hashPassword('senha-bem-forte')
    const h2 = await hashPassword('senha-bem-forte')
    expect(h1).not.toBe(h2)
    expect(h1.startsWith('pbkdf2$')).toBe(true)
  })

  it('verifica corretamente a senha válida', async () => {
    const hash = await hashPassword('correta')
    expect(await verifyPassword('correta', hash)).toBe(true)
  })

  it('rejeita senha errada', async () => {
    const hash = await hashPassword('correta')
    expect(await verifyPassword('errada', hash)).toBe(false)
  })

  it('rejeita hash em formato inválido', async () => {
    expect(await verifyPassword('qualquer', 'formato-inválido')).toBe(false)
  })
})

describe('signSession / verifySession', () => {
  it('assina e verifica uma sessão de usuário', async () => {
    const token = await signSession(42)
    const payload = await verifySession(token)
    expect(payload?.userId).toBe(42)
    expect(payload?.expiryTs).toBeGreaterThan(Date.now())
  })

  it('aceita sessão legacy (userId null)', async () => {
    const token = await signSession(null)
    const payload = await verifySession(token)
    expect(payload?.userId).toBeNull()
  })

  it('rejeita token adulterado', async () => {
    const token = await signSession(7)
    const tampered = token.slice(0, -2) + 'ab'
    expect(await verifySession(tampered)).toBeNull()
  })

  it('rejeita token sem três partes', async () => {
    expect(await verifySession('lixo')).toBeNull()
    expect(await verifySession('')).toBeNull()
    expect(await verifySession(null)).toBeNull()
  })

  it('rejeita sessão expirada', async () => {
    // ttlDays negativo → expiração no passado
    const token = await signSession(1, -1)
    expect(await verifySession(token)).toBeNull()
  })
})
