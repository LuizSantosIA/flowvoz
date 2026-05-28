'use client'

import { useEffect, useState } from 'react'

interface Template {
  id: number
  nome: string
  content: string
  ordem: number
}

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [nome, setNome] = useState('')
  const [content, setContent] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function load() {
    fetch('/api/templates').then(r => r.json()).then((data: Template[]) => {
      if (Array.isArray(data)) setItems(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null); setNome(''); setContent(''); setShowModal(true)
  }
  function openEdit(t: Template) {
    setEditing(t); setNome(t.nome); setContent(t.content); setShowModal(true)
  }

  async function save() {
    if (!nome.trim() || !content.trim()) { showToast('Preencha nome e conteúdo.'); return }
    try {
      const r = editing
        ? await fetch('/api/templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, nome, content }) })
        : await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, content, ordem: items.length + 1 }) })
      if (!r.ok) { showToast('Falha ao salvar.'); return }
      setShowModal(false); load(); showToast(editing ? 'Atualizado!' : 'Criado!')
    } catch { showToast('Falha de rede.') }
  }

  async function remove(id: number) {
    if (!confirm('Excluir esse template?')) return
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
      load(); showToast('Removido.')
    } catch { showToast('Falha de rede.') }
  }

  async function move(id: number, dir: -1 | 1) {
    const idx = items.findIndex(t => t.id === id)
    const swap = items[idx + dir]
    if (!swap) return
    const a = items[idx], b = swap
    // troca otimista local
    const novos = [...items]; novos[idx] = { ...b }; novos[idx + dir] = { ...a }
    setItems(novos)
    try {
      await Promise.all([
        fetch('/api/templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, ordem: b.ordem }) }),
        fetch('/api/templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, ordem: a.ordem }) }),
      ])
    } catch { load() }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">{toast}</div>
      )}

      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
            Templates de texto
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{items.length} template(s). Use no chat clicando em "Inserir".</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Novo template
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
        {loading ? (
          <div className="col-span-full text-center text-zinc-600 text-sm py-12">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center text-zinc-500 text-sm py-12 border border-dashed border-zinc-800 rounded-2xl">
            Nenhum template ainda. Clique em <strong>Novo template</strong> pra começar.
          </div>
        ) : items.map((t, idx) => (
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 truncate flex-1">{t.nome}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => move(t.id, -1)} disabled={idx === 0}
                  title="Mover pra cima"
                  className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button onClick={() => move(t.id, 1)} disabled={idx === items.length - 1}
                  title="Mover pra baixo"
                  className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <span className="text-[10px] font-mono text-zinc-600 ml-1">#{t.id}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-4 whitespace-pre-wrap">{t.content}</p>
            <div className="flex gap-2 pt-1 mt-auto">
              <button onClick={() => openEdit(t)} className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors">Editar</button>
              <button onClick={() => remove(t.id)} className="px-3 py-1.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-800/50 text-zinc-500 hover:text-red-400 text-xs font-medium rounded-lg transition-colors">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">{editing ? 'Editar template' : 'Novo template'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus placeholder="Ex: Boas-vindas" className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 mb-4" />
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Conteúdo</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Olá! Tudo bem? Aqui é a Bia da Venda Direta…" className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl">Cancelar</button>
              <button onClick={save} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
