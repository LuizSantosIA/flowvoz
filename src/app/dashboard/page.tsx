'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Skeleton } from '@/components/Skeleton'

interface Stats {
  totals: { in_hoje: number; out_hoje: number; audio_hoje: number; text_hoje: number; conversas_7d: number }
  porCaixa: { inbox: string; cor: string; in_hoje: number; out_hoje: number }[]
  porDia:   { dia: string; recebidas: number; enviadas: number }[]
  topAudios: { nome: string; envios: number }[]
}

const INBOX_DOT: Record<string, string> = {
  violet: 'bg-violet-500', emerald: 'bg-emerald-500', blue: 'bg-blue-500',
  amber: 'bg-amber-500', rose: 'bg-rose-500', zinc: 'bg-zinc-500',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function load() {
      fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => null).finally(() => setLoading(false))
    }
    load()
    const id = setInterval(load, 30_000) // refresh 30s
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Painel de números
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Atualiza automaticamente a cada 30 segundos.</p>
      </div>

      {loading || !stats ? (
        <div className="p-6 space-y-6 max-w-6xl pb-20 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6 max-w-6xl pb-20 md:pb-6">
          {/* Cards de totais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Recebidas hoje"  value={stats.totals.in_hoje}   color="bg-blue-500/10 text-blue-300 border-blue-500/30" />
            <StatCard label="Enviadas hoje"   value={stats.totals.out_hoje}  color="bg-violet-500/10 text-violet-300 border-violet-500/30" />
            <StatCard label="Áudios hoje"     value={stats.totals.audio_hoje} color="bg-emerald-500/10 text-emerald-300 border-emerald-500/30" />
            <StatCard label="Conversas 7d"   value={stats.totals.conversas_7d} color="bg-amber-500/10 text-amber-300 border-amber-500/30" />
          </div>

          {/* Gráfico últimos 7 dias */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-zinc-100 mb-4">Últimos 7 dias</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.porDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="dia" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: '#e4e4e7' }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                  <Bar dataKey="recebidas" name="Recebidas" fill="#60a5fa" radius={[4,4,0,0]} />
                  <Bar dataKey="enviadas"  name="Enviadas"  fill="#a78bfa" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top áudios (7 dias) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-zinc-100 mb-4">Áudios mais enviados — últimos 7 dias</h2>
            {stats.topAudios.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum áudio enviado nos últimos 7 dias ainda.</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...stats.topAudios.map(a => a.envios), 1)
                  return stats.topAudios.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-600 w-4 flex-shrink-0">{i + 1}</span>
                      <span className="text-xs text-zinc-200 truncate flex-1 min-w-0">{a.nome}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(a.envios / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono text-violet-300 w-8 text-right flex-shrink-0">{a.envios}</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>

          {/* Por caixa (hoje) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-zinc-100 mb-4">Por número — hoje</h2>
            {stats.porCaixa.length === 0 ? (
              <p className="text-xs text-zinc-500">Sem movimento hoje ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="text-left font-medium py-2">Caixa</th>
                    <th className="text-right font-medium py-2">Recebidas</th>
                    <th className="text-right font-medium py-2">Enviadas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.porCaixa.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-2.5 flex items-center gap-2 text-zinc-200">
                        <span className={`w-2 h-2 rounded-full ${INBOX_DOT[row.cor] ?? INBOX_DOT.zinc}`} />
                        {row.inbox}
                      </td>
                      <td className="py-2.5 text-right text-blue-300 font-mono">{row.in_hoje}</td>
                      <td className="py-2.5 text-right text-violet-300 font-mono">{row.out_hoje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`border rounded-2xl p-4 ${color}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
