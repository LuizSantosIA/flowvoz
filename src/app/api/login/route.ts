import { NextRequest, NextResponse } from 'next/server'

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  const expected = process.env.PANEL_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: false, error: 'PANEL_PASSWORD não configurado no servidor.' }, { status: 500 })
  }

  if (typeof password !== 'string' || password !== expected) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta.' }, { status: 401 })
  }

  const token = await sha256Hex(expected)
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
