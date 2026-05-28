'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/conversas'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (r.ok) {
        router.replace(next)
        router.refresh()
      } else {
        const data = await r.json().catch(() => ({}))
        setError(data.error || 'Senha incorreta.')
      }
    } catch {
      setError('Falha de rede. Tente de novo.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg mb-3">F</div>
          <h1 className="text-xl font-bold text-white">FlowVoz</h1>
          <p className="text-xs text-zinc-500 mt-1">Atendimento</p>
        </div>

        <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email (opcional para admin)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
            placeholder="seu@email.com"
          />
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
            placeholder="••••••••"
          />
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-5 w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-500 text-sm">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  )
}
