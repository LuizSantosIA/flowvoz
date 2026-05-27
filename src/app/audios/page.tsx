'use client'

import { useState, useRef } from 'react'

interface Audio {
  id: number
  nome: string
  filename: string
  audio_url?: string
  enviados_hoje: number
}

const MOCK_AUDIOS: Audio[] = [
  { id:  1, nome: 'Saudação inicial',           filename: 'audio-01.ogg', enviados_hoje: 12 },
  { id:  2, nome: 'Como funciona — 60 dias',    filename: 'audio-02.ogg', enviados_hoje: 8  },
  { id:  3, nome: 'Moradia — casa ou aluguel',  filename: 'audio-03.ogg', enviados_hoje: 5  },
  { id:  4, nome: 'Sem investimento inicial',   filename: 'audio-04.ogg', enviados_hoje: 7  },
  { id:  5, nome: 'Encaminhando pro vendedor',  filename: 'audio-05.ogg', enviados_hoje: 3  },
  { id:  6, nome: 'Solicitar endereço',         filename: 'audio-06.ogg', enviados_hoje: 4  },
  { id:  7, nome: 'Já é revendedora',           filename: 'audio-07.ogg', enviados_hoje: 2  },
  { id:  8, nome: 'Solicitar renda',            filename: 'audio-08.ogg', enviados_hoje: 9  },
  { id:  9, nome: 'Dúvida sobre comissão',      filename: 'audio-09.ogg', enviados_hoje: 6  },
  { id: 10, nome: 'Somos de Minas',             filename: 'audio-10.ogg', enviados_hoje: 0  },
  { id: 11, nome: 'Sem fotos/tabela de preços', filename: 'audio-11.ogg', enviados_hoje: 0  },
  { id: 12, nome: 'Como funciona — 90 dias',    filename: 'audio-12.ogg', enviados_hoje: 0  },
]

export default function AudiosPage() {
  const [audios, setAudios] = useState<Audio[]>(MOCK_AUDIOS)
  const [showModal, setShowModal] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [toast, setToast] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setNewFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setNewFile(file)
  }

  function handleSaveNew() {
    if (!newNome.trim()) { showToast('Informe o nome do áudio'); return }
    if (!newFile) { showToast('Selecione um arquivo de áudio'); return }
    const nextId = Math.max(...audios.map(a => a.id), 0) + 1
    const audio: Audio = {
      id: nextId,
      nome: newNome.trim(),
      filename: newFile.name,
      audio_url: URL.createObjectURL(newFile),
      enviados_hoje: 0,
    }
    setAudios(prev => [...prev, audio])
    // POST to API
    fetch('/api/audios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: audio.nome, filename: audio.filename }),
    }).catch(() => { /* silencioso */ })
    setShowModal(false)
    setNewNome('')
    setNewFile(null)
    showToast('Áudio adicionado com sucesso!')
  }

  function handleStartEdit(audio: Audio) {
    setEditingId(audio.id)
    setEditingNome(audio.nome)
  }

  function handleSaveEdit(id: number) {
    if (!editingNome.trim()) return
    setAudios(prev => prev.map(a => a.id === id ? { ...a, nome: editingNome.trim() } : a))
    fetch('/api/audios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nome: editingNome.trim() }),
    }).catch(() => { /* silencioso */ })
    setEditingId(null)
    showToast('Nome atualizado!')
  }

  function handleDelete(id: number) {
    if (!confirm('Deseja remover este áudio?')) return
    setAudios(prev => prev.filter(a => a.id !== id))
    fetch(`/api/audios?id=${id}`, { method: 'DELETE' }).catch(() => { /* silencioso */ })
    showToast('Áudio removido.')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Áudios Rápidos
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{audios.length} áudio(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar Áudio
        </button>
      </div>

      {/* Grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {audios.map(audio => (
          <div key={audio.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
            {/* Order + drag handle visual */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <svg className="w-3 h-3 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 3h2v2H9zM13 3h2v2h-2zM9 7h2v2H9zM13 7h2v2h-2zM9 11h2v2H9zM13 11h2v2h-2z" />
                  </svg>
                </span>
                <span className="text-xs font-mono text-zinc-500">{String(audio.id).padStart(2, '0')}</span>
              </div>
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                Enviado {audio.enviados_hoje}x hoje
              </span>
            </div>

            {/* Mic icon */}
            <div className="flex justify-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-600/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
            </div>

            {/* Nome (editável inline) */}
            {editingId === audio.id ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={editingNome}
                  onChange={e => setEditingNome(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit(audio.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 px-2 py-1 bg-zinc-800 border border-violet-600 rounded-lg text-sm text-zinc-100 focus:outline-none"
                />
                <button
                  onClick={() => handleSaveEdit(audio.id)}
                  className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-zinc-100 text-center truncate">{audio.nome}</p>
            )}

            {/* Player */}
            <audio
              controls
              src={audio.audio_url || `/audios/${audio.filename}`}
              preload="none"
              className="w-full h-8 opacity-80"
            />

            {/* Info */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-600">
              <span className="uppercase">{audio.filename.split('.').pop()}</span>
              <span>·</span>
              <span>{audio.filename}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleStartEdit(audio)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Renomear
              </button>
              <button
                onClick={() => handleDelete(audio.id)}
                className="flex items-center justify-center w-8 h-8 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-800/50 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Adicionar Áudio</h3>
              <button
                onClick={() => { setShowModal(false); setNewNome(''); setNewFile(null) }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                dragging
                  ? 'border-violet-500 bg-violet-900/20'
                  : newFile
                  ? 'border-green-600/60 bg-green-900/10'
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ogg,.opus,.mp3,audio/*"
                onChange={handleFileInput}
                className="hidden"
              />
              {newFile ? (
                <>
                  <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-sm text-green-400 font-medium">{newFile.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">Clique para trocar</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm text-zinc-400">Arraste o arquivo aqui ou <span className="text-violet-400">clique para selecionar</span></p>
                  <p className="text-xs text-zinc-600 mt-1">.ogg, .opus, .mp3</p>
                </>
              )}
            </div>

            {/* Nome */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do áudio *</label>
              <input
                type="text"
                placeholder="Ex: Boas-vindas"
                value={newNome}
                onChange={e => setNewNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveNew() }}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setNewNome(''); setNewFile(null) }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNew}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
