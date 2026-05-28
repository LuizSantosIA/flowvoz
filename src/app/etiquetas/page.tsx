'use client'

import { useEffect, useState } from 'react'

interface Tag { id: number; nome: string; cor: string; ordem: number }

const COLORS = [
  { key: 'violet',  bg: 'bg-violet-500',  badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { key: 'emerald', bg: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { key: 'blue',    bg: 'bg-blue-500',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { key: 'amber',   bg: 'bg-amber-500',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { key: 'rose',    bg: 'bg-rose-500',    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { key: 'pink',    bg: 'bg-pink-500',    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { key: 'cyan',    bg: 'bg-cyan-500',    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { key: 'zinc',    bg: 'bg-zinc-500',    badge: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40' },
]
function badgeClasses(cor: string) { return (COLORS.find(c => c.key === cor) ?? COLORS[0]).badge }

export default function EtiquetasPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('violet')

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500) }

  function load() {
    fetch('/api/tags').then(r => r.json()).then((d: Tag[]) => { if (Array.isArray(d)) setTags(d); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setNome(''); setCor('violet'); setShowModal(true) }
  function openEdit(t: Tag) { setEditing(t); setNome(t.nome); setCor(t.cor); setShowModal(true) }

  async function save() {
    if (!nome.trim()) { showToast('Informe o nome.'); return }
    try {
      const r = editing
        ? await fetch('/api/tags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, nome, cor }) })
        : await fetch('/api/tags', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, cor }) })
      if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(d.error || 'Falha ao salvar.'); return }
      setShowModal(false); load(); showToast(editing ? 'Atualizada!' : 'Criada!')
    } catch { showToast('Falha de rede.') }
  }

  async function remove(t: Tag) {
    if (!confirm(`Excluir a etiqueta "${t.nome}"? Ela será removida de todas as conversas.`)) return
    setTags(prev => prev.filter(x => x.id !== t.id))
    try { await fetch(`/api/tags?id=${t.id}`, { method: 'DELETE' }); showToast('Removida.') }
    catch { showToast('Falha de rede.'); load() }
  }

  async function move(id: number, dir: -1 | 1) {
    const idx = tags.findIndex(t => t.id === id); const swap = tags[idx + dir]
    if (!swap) return
    const a = tags[idx], b = swap
    const novos = [...tags]; novos[idx] = { ...b }; novos[idx + dir] = { ...a }
    setTags(novos)
    try {
      await Promise.all([
        fetch('/api/tags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, ordem: b.ordem }) }),
        fetch('/api/tags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, ordem: a.ordem }) }),
      ])
    } catch { load() }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {toast && <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">{toast}</div>}

      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Etiquetas
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{tags.length} etiqueta(s) — aplique nas conversas pra organizar seus leads.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nova etiqueta
        </button>
      </div>

      <div className="p-6 max-w-3xl pb-20 md:pb-6">
        {loading ? (
          <div className="text-center text-zinc-600 text-sm py-12">Carregando…</div>
        ) : tags.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12 border border-dashed border-zinc-800 rounded-2xl">
            Nenhuma etiqueta ainda. Crie a primeira (ex: <em>"Interessado"</em>, <em>"Sem investimento"</em>, <em>"Fechou"</em>).
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((t, idx) => (
              <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => move(t.id, -1)} disabled={idx === 0} className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button onClick={() => move(t.id, 1)} disabled={idx === tags.length - 1} className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClasses(t.cor)}`}>{t.nome}</span>
                <span className="text-[11px] text-zinc-600 flex-1">#{t.id}</span>
                <button onClick={() => openEdit(t)} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs rounded-lg">Editar</button>
                <button onClick={() => remove(t)} className="px-2 py-1.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-800/50 text-zinc-500 hover:text-red-400 text-xs rounded-lg">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">{editing ? 'Editar etiqueta' : 'Nova etiqueta'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus placeholder="Ex: Interessado, Sem investimento, Já comprou…"
              className="w-full px-3 py-2.5 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600" />
            <label className="block text-xs font-medium text-zinc-400 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {COLORS.map(c => (
                <button key={c.key} onClick={() => setCor(c.key)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-transform hover:scale-110 ${cor === c.key ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white' : ''}`} />
              ))}
            </div>
            <div className="mb-4 text-xs text-zinc-500">Pré-visualização:</div>
            <div className="mb-5">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClasses(cor)}`}>{nome || 'minha etiqueta'}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm rounded-xl">Cancelar</button>
              <button onClick={save} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
