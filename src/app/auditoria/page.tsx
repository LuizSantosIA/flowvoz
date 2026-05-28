'use client'

import { useEffect, useState } from 'react'

interface AuditRow {
  id: string
  action: string
  details: Record<string, unknown>
  ip: string | null
  ok: boolean
  created_at: string
}

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  send_ok:       { label: 'Envio',         color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  send_fail:     { label: 'Envio (falha)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  conv_assume:   { label: 'Assumiu',       color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  conv_status:   { label: 'Status',        color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  inbox_update:  { label: 'Caixa',         color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
}

function summary(row: AuditRow): string {
  const d = row.details ?? {}
  if (row.action === 'send_ok' || row.action === 'send_fail') {
    const tipo = String(d.tipo ?? '?')
    const ses = String(d.session_id ?? '?')
    const ibx = String(d.inbox ?? '?')
    const err = row.action === 'send_fail' ? ` — ${d.error ?? ''}` : ''
    return `${tipo} → ${ses} (caixa ${ibx})${err}`
  }
  if (row.action === 'conv_assume')  return `${d.session_id} (caixa ${d.inbox})`
  if (row.action === 'conv_status')  return `${d.session_id} (caixa ${d.inbox}) → ${d.status}`
  if (row.action === 'inbox_update') return `caixa ${d.key} — ${JSON.stringify(d.patch ?? {})}`
  return JSON.stringify(d)
}

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  function load() {
    const q = filter ? `?action=${filter}` : ''
    fetch(`/api/audit${q}`).then(r => r.json()).then(d => {
      setRows(Array.isArray(d) ? d : []); setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const filtros: { key: string; label: string }[] = [
    { key: '',             label: 'Todos' },
    { key: 'send_ok',      label: 'Envios' },
    { key: 'send_fail',    label: 'Falhas' },
    { key: 'conv_assume',  label: 'Assumir' },
    { key: 'conv_status',  label: 'Status' },
    { key: 'inbox_update', label: 'Caixas' },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Auditoria
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Histórico dos últimos eventos no painel.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {filtros.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                filter === f.key ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-5xl pb-20 md:pb-6">
        {loading ? (
          <div className="text-center text-zinc-600 text-sm py-12">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12 border border-dashed border-zinc-800 rounded-2xl">
            Nenhum evento registrado.
          </div>
        ) : (
          <div className="space-y-1.5">
            {rows.map(row => {
              const info = ACTION_LABEL[row.action] ?? { label: row.action, color: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40' }
              return (
                <div key={row.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-3 ${!row.ok ? 'border-rose-900/40' : ''}`}>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${info.color} flex-shrink-0`}>{info.label}</span>
                  <p className="text-xs text-zinc-300 truncate flex-1">{summary(row)}</p>
                  <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{row.created_at}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
