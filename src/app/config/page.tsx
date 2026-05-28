'use client'

import { useEffect, useState } from 'react'

interface Inbox {
  key: string
  nome: string
  provider: 'evolution' | 'meta' | string
  cor: string
  ativo: boolean
  ordem: number
}

const COLORS: { key: string; label: string; classes: string }[] = [
  { key: 'violet',  label: 'Violeta', classes: 'bg-violet-500'  },
  { key: 'emerald', label: 'Verde',   classes: 'bg-emerald-500' },
  { key: 'blue',    label: 'Azul',    classes: 'bg-blue-500'    },
  { key: 'amber',   label: 'Âmbar',   classes: 'bg-amber-500'   },
  { key: 'rose',    label: 'Rosa',    classes: 'bg-rose-500'    },
  { key: 'zinc',    label: 'Cinza',   classes: 'bg-zinc-500'    },
]

export default function ConfigPage() {
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [editingNome, setEditingNome] = useState<string | null>(null)
  const [nomeBuffer, setNomeBuffer] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function load() {
    fetch('/api/inboxes?all=true')
      .then(r => r.json())
      .then((data: Inbox[]) => { if (Array.isArray(data)) setInboxes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function update(key: string, patch: Partial<Inbox>) {
    // otimista
    setInboxes(prev => prev.map(ib => ib.key === key ? { ...ib, ...patch } : ib))
    try {
      const r = await fetch('/api/inboxes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...patch }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        showToast(d.error || 'Falha ao salvar.')
        load() // recarrega pra reverter
      }
    } catch {
      showToast('Falha de rede.')
      load()
    }
  }

  function startEditNome(ib: Inbox) {
    setEditingNome(ib.key)
    setNomeBuffer(ib.nome)
  }

  async function move(key: string, dir: -1 | 1) {
    const idx = inboxes.findIndex(i => i.key === key)
    const swap = inboxes[idx + dir]
    if (!swap) return
    const a = inboxes[idx], b = swap
    const novos = [...inboxes]; novos[idx] = { ...b }; novos[idx + dir] = { ...a }
    setInboxes(novos)
    try {
      await Promise.all([
        fetch('/api/inboxes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: a.key, ordem: b.ordem }) }),
        fetch('/api/inboxes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: b.key, ordem: a.ordem }) }),
      ])
    } catch { load() }
  }

  function commitNome(key: string) {
    const novo = nomeBuffer.trim()
    setEditingNome(null)
    if (!novo) return
    update(key, { nome: novo })
    showToast('Nome atualizado.')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Caixas de WhatsApp
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Renomeie, troque a cor da etiqueta e ative/desative cada número conectado.
        </p>
      </div>

      <div className="p-6 space-y-3 max-w-3xl">
        {loading ? (
          <div className="text-center text-zinc-600 text-sm py-12">Carregando…</div>
        ) : inboxes.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12 border border-dashed border-zinc-800 rounded-2xl">
            Nenhuma caixa cadastrada ainda.<br />
            Caixas aparecem aqui automaticamente quando o primeiro recebimento chega de um número.
          </div>
        ) : inboxes.map((ib, idx) => (
          <div key={ib.key} className={`bg-zinc-900 border rounded-2xl p-5 transition-colors ${ib.ativo ? 'border-zinc-800' : 'border-zinc-800 opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              {/* Esquerda: identidade */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {editingNome === ib.key ? (
                    <input
                      autoFocus
                      value={nomeBuffer}
                      onChange={e => setNomeBuffer(e.target.value)}
                      onBlur={() => commitNome(ib.key)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitNome(ib.key)
                        if (e.key === 'Escape') setEditingNome(null)
                      }}
                      className="px-2 py-1 bg-zinc-800 border border-violet-600 rounded-lg text-sm text-zinc-100 focus:outline-none w-56"
                    />
                  ) : (
                    <button
                      onClick={() => startEditNome(ib)}
                      title="Renomear"
                      className="text-base font-semibold text-zinc-100 hover:text-violet-300 transition-colors"
                    >
                      {ib.nome}
                    </button>
                  )}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${ib.provider === 'meta' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40'}`}>
                    {ib.provider === 'meta' ? 'Meta (oficial)' : 'Evolution'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono truncate">id: {ib.key}</p>
              </div>

              {/* Direita: reorder + toggle ativo */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col">
                  <button onClick={() => move(ib.key, -1)} disabled={idx === 0} title="Subir"
                    className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button onClick={() => move(ib.key, 1)} disabled={idx === inboxes.length - 1} title="Descer"
                    className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
                <button
                  onClick={() => update(ib.key, { ativo: !ib.ativo })}
                  title={ib.ativo ? 'Desativar' : 'Ativar'}
                  className={`relative w-11 h-6 rounded-full transition-colors ${ib.ativo ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${ib.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Seletor de cor */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Cor da etiqueta:</span>
              {COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => update(ib.key, { cor: c.key })}
                  title={c.label}
                  className={`w-5 h-5 rounded-full ${c.classes} transition-transform hover:scale-110 ${ib.cor === c.key ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white' : ''}`}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 text-[11px] text-zinc-600 text-center">
          As caixas são cadastradas automaticamente quando um número recebe a primeira mensagem.
        </div>
      </div>
    </div>
  )
}
