'use client'

import { useEffect, useState } from 'react'
import LogoutButton from './LogoutButton'

interface Me { id: number | null; nome: string; email: string; role: string }

export default function UserBox({ companyName }: { companyName: string }) {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setMe(d?.user ?? null)).catch(() => null)
  }, [])

  const displayName = me?.nome || companyName
  const subtitle = me?.email || (me ? me.role : 'Online')
  const initials = (displayName.match(/\b\w/g) ?? ['F']).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-zinc-100 truncate">{displayName}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[11px] text-zinc-500 truncate">{subtitle}</span>
        </div>
      </div>
      <LogoutButton />
    </div>
  )
}
