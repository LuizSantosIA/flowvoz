import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FlowVoz — Atendimento',
  description: 'Painel de atendimento com áudios rápidos para WhatsApp',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || 'FlowVoz'
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="bg-[#09090b] text-zinc-100 min-h-screen" suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden">
          <Sidebar companyName={companyName} />
          <main className="flex-1 md:ml-60 flex flex-col h-screen overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
