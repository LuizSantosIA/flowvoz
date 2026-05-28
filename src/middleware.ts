import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

/**
 * Protege o painel inteiro.
 *
 * Modo padrão (multi-usuário): cookie 'flowvoz_session' = sessão assinada (lib/auth).
 * Modo legado: se PANEL_PASSWORD estiver setado e ninguém estiver autenticado,
 *   o painel é bloqueado normalmente — login na /login aceita PANEL_PASSWORD como
 *   senha única (sem email) e cria uma sessão "legacy".
 *
 * Excluídos do bloqueio: /login, /api/login, /api/logout, webhooks, estáticos.
 */
export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get('flowvoz_session')?.value
  const session = await verifySession(cookie)
  if (session) return NextResponse.next()

  // Sem PANEL_PASSWORD configurado E ninguém logado → painel aberto (modo dev/inicial)
  if (!process.env.PANEL_PASSWORD) return NextResponse.next()

  // Não autenticado: redireciona pra /login (preservando o destino)
  const url = req.nextUrl.clone()
  const target = url.pathname + url.search
  url.pathname = '/login'
  url.search = target && target !== '/' ? `?next=${encodeURIComponent(target)}` : ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!api/webhook|api/login|api/logout|login|_next/static|_next/image|audios|favicon|robots).*)',
  ],
}
