import { NextRequest, NextResponse } from 'next/server'
import { signSession } from '@/lib/auth'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Anti brute-force: 10 tentativas por IP a cada 5 minutos
  const ip = clientIp(req)
  const rl = await checkRateLimit(`login:${ip}`, { max: 10, windowSec: 300, cleanup: true })
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 })
  }

  const { password } = await req.json().catch(() => ({ password: '' }))
  const expected = process.env.PANEL_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: false, error: 'PANEL_PASSWORD não configurado no servidor.' }, { status: 500 })
  }
  if (typeof password !== 'string' || password !== expected) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta.' }, { status: 401 })
  }

  const token = await signSession(null)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('flowvoz_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
  return res
}
