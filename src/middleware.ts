import { NextRequest, NextResponse } from 'next/server'

/**
 * Protege o painel inteiro com login simples baseado em senha (PANEL_PASSWORD).
 * Excluídos do bloqueio: /login, /api/login, /api/logout, webhooks e estáticos.
 *
 * Cookie 'flowvoz_session' guarda o SHA-256 da senha (não a senha em si),
 * para não expor a credencial mesmo em caso de leitura indevida do cookie.
 */

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(req: NextRequest) {
  const password = process.env.PANEL_PASSWORD
  // Sem PANEL_PASSWORD configurado → painel aberto (modo dev / instalação inicial).
  if (!password) return NextResponse.next()

  const cookie = req.cookies.get('flowvoz_session')?.value
  const expected = await sha256Hex(password)

  if (cookie === expected) return NextResponse.next()

  // Não autenticado: redireciona pra /login (preservando o destino)
  const url = req.nextUrl.clone()
  const target = url.pathname + url.search
  url.pathname = '/login'
  url.search = target && target !== '/' ? `?next=${encodeURIComponent(target)}` : ''
  return NextResponse.redirect(url)
}

// Aplica em tudo, exceto rotas públicas e assets.
export const config = {
  matcher: [
    '/((?!api/webhook|api/login|api/logout|login|_next/static|_next/image|audios|favicon).*)',
  ],
}
