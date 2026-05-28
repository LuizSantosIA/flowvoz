import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import './globals.css'
import LogoutButton from '@/components/LogoutButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FlowVoz — Atendimento',
  description: 'Painel de atendimento com áudios rápidos para WhatsApp',
  robots: { index: false, follow: false },
}

const navItems = [
  { href: '/dashboard', label: 'Painel',    icon: 'chart' },
  { href: '/conversas', label: 'Conversas', icon: 'message' },
  { href: '/audios',    label: 'Áudios',    icon: 'mic' },
  { href: '/templates', label: 'Textos',    icon: 'doc' },
  { href: '/config',    label: 'Caixas',    icon: 'settings' },
]

function Icon({ name }: { name: string }) {
  if (name === 'message') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  if (name === 'mic') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    )
  }
  if (name === 'chart') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    )
  }
  if (name === 'doc') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    )
  }
  if (name === 'settings') {
    return (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }
  return null
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="bg-[#09090b] text-zinc-100 min-h-screen" suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden">

          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-60 bg-zinc-900 border-r border-zinc-800 flex-shrink-0 fixed left-0 top-0 h-full z-20">
            <div className="px-5 py-6 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center font-extrabold text-lg text-white shadow-lg">F</div>
              <div>
                <div className="font-bold text-sm text-white leading-tight">FlowVoz</div>
                <div className="text-xs text-zinc-500">Atendimento</div>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-r-lg text-sm font-medium text-zinc-400 hover:bg-violet-500/10 hover:text-zinc-100 transition-all border-l-[3px] border-transparent hover:border-violet-500">
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-zinc-800">
              {(() => {
                const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || 'FlowVoz'
                const initials = (companyName.match(/\b\w/g) ?? ['F']).join('').slice(0, 2).toUpperCase()
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-100 truncate">{companyName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[11px] text-zinc-500">Online</span>
                      </div>
                    </div>
                    <LogoutButton />
                  </div>
                )
              })()}
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 md:ml-60 flex flex-col h-screen overflow-hidden">
            {children}
          </main>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex items-center z-30">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-zinc-500 hover:text-violet-400 transition-colors text-[10px] font-medium">
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  )
}
