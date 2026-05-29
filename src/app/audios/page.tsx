'use client'

import { useEffect, useRef, useState } from 'react'

interface Audio {
  id: number
  nome: string
  filename: string
  audio_url?: string | null
  ordem?: number
  enviados_hoje?: number
}

export default function AudiosPage() {
  const [audios, setAudios] = useState<Audio[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [nome, setNome] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [playingId, setPlayingId] = useState<number | null>(null)
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gravação ao vivo (modal separado)
  const [showRecModal, setShowRecModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [recordTime, setRecordTime] = useState(0)
  const [recordError, setRecordError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaRecorderRef = useRef<any>(null)
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!recordedBlob) { setRecordedUrl(null); return }
    const url = URL.createObjectURL(recordedBlob)
    setRecordedUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recordedBlob])

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500) }

  function load() {
    fetch('/api/audios')
      .then(r => r.json())
      .then((data: Audio[]) => { if (Array.isArray(data)) setAudios(data); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setNome(''); setFile(null); setShowModal(true)
  }

  async function saveNew() {
    if (!nome.trim()) { showToast('Informe o nome'); return }
    if (!file) { showToast('Selecione um arquivo'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('nome', nome.trim())
      const r = await fetch('/api/audios', { method: 'POST', body: form })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        showToast(d.error || 'Falha no upload.')
      } else {
        showToast('Áudio adicionado!')
        setShowModal(false); setNome(''); setFile(null); load()
      }
    } catch {
      showToast('Falha de rede.')
    }
    setUploading(false)
  }

  async function rename(id: number, novoNome: string) {
    if (!novoNome.trim()) return
    setAudios(prev => prev.map(a => a.id === id ? { ...a, nome: novoNome } : a))
    setEditingId(null)
    try {
      await fetch('/api/audios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nome: novoNome }) })
      showToast('Nome atualizado.')
    } catch { showToast('Falha ao salvar.') }
  }

  async function remove(a: Audio) {
    if (!confirm(`Excluir o áudio "${a.nome}"?`)) return
    setAudios(prev => prev.filter(x => x.id !== a.id))
    try {
      await fetch(`/api/audios?id=${a.id}`, { method: 'DELETE' })
      showToast('Removido.')
    } catch { showToast('Falha ao remover.'); load() }
  }

  async function move(id: number, dir: -1 | 1) {
    const idx = audios.findIndex(a => a.id === id)
    const swap = audios[idx + dir]
    if (!swap) return
    const a = audios[idx], b = swap
    const novos = [...audios]; novos[idx] = { ...b }; novos[idx + dir] = { ...a }
    setAudios(novos)
    try {
      await Promise.all([
        fetch('/api/audios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, ordem: b.ordem ?? 0 }) }),
        fetch('/api/audios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, ordem: a.ordem ?? 0 }) }),
      ])
    } catch { load() }
  }

  function togglePlay(a: Audio) {
    const el = audioRefs.current[a.id]
    if (!el) return
    if (playingId === a.id) { el.pause(); setPlayingId(null); return }
    Object.values(audioRefs.current).forEach(o => { try { o?.pause() } catch {} })
    el.currentTime = 0
    el.play().then(() => setPlayingId(a.id)).catch(() => setPlayingId(null))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  // ── Gravação ao vivo (opus-recorder gera OGG+Opus, formato aceito pela Meta) ──
  function fmtTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }
  function openRec() {
    setNome(''); setRecordedBlob(null); setRecordTime(0); setIsRecording(false); setRecordError(''); setShowRecModal(true)
  }
  function closeRec() {
    const rec = mediaRecorderRef.current
    if (rec?.stop) { try { rec.stop() } catch {} }
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    setIsRecording(false); setRecordedBlob(null); setRecordTime(0); setShowRecModal(false)
  }
  async function startRecording() {
    if (typeof window === 'undefined' || !window.isSecureContext) { showToast('Gravação só funciona em HTTPS.'); return }
    try {
      const mod = await import('opus-recorder')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Recorder: any = (mod as any).default ?? mod
      const recorder = new Recorder({
        encoderPath: '/opus/encoderWorker.min.js',
        encoderApplication: 2049, encoderSampleRate: 48000, numberOfChannels: 1,
        streamPages: false, encoderBitRate: 24000, monitorGain: 0, recordingGain: 1,
      })
      recorder.ondataavailable = (typedArray: Uint8Array) => {
        setRecordedBlob(new Blob([new Uint8Array(typedArray)], { type: 'audio/ogg' }))
      }
      mediaRecorderRef.current = recorder
      await recorder.start()
      setIsRecording(true); setRecordedBlob(null); setRecordTime(0)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch (err) {
      const e = err as { name?: string; message?: string }
      console.error('[recorder]', e.name, e.message, err)
      if (e.name === 'NotAllowedError') showToast('Você negou o acesso ao microfone.')
      else if (e.name === 'NotFoundError') showToast('Nenhum microfone encontrado.')
      else if (e.name === 'NotReadableError') showToast('Microfone em uso por outro programa.')
      else showToast(`Erro: ${e.message ?? 'desconhecido'}`)
    }
  }
  function stopRecording() {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    setIsRecording(false)
    const rec = mediaRecorderRef.current
    if (rec?.stop) { try { rec.stop() } catch {} }
  }
  async function saveRecording() {
    setRecordError('')
    if (!recordedBlob || !nome.trim()) { setRecordError('Grave um áudio e informe o nome.'); return }
    setUploading(true)
    try {
      const rawType = recordedBlob.type || 'audio/webm'
      const cleanType = rawType.split(';')[0]
      const ext = cleanType.includes('ogg') ? 'ogg' : cleanType.includes('mp4') || cleanType.includes('m4a') ? 'm4a' : 'webm'

      const fileToSend = new File([recordedBlob], `gravacao.${ext}`, { type: cleanType })
      const form = new FormData()
      form.append('file', fileToSend)
      form.append('nome', nome.trim())

      const r = await fetch('/api/audios', { method: 'POST', body: form })
      const respText = await r.text()
      let respJson: { ok?: boolean; error?: string } = {}
      try { respJson = JSON.parse(respText) } catch { /* não era JSON */ }

      if (!r.ok) {
        const msg = respJson.error || respText.slice(0, 200) || `HTTP ${r.status}`
        setRecordError(`HTTP ${r.status} — ${msg} (tipo: ${rawType}, tamanho: ${recordedBlob.size}b)`)
      } else {
        showToast('Áudio gravado salvo!')
        closeRec(); load()
      }
    } catch (err) {
      setRecordError(`Falha de rede: ${err instanceof Error ? err.message : 'erro'}`)
    }
    setUploading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {toast && <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">{toast}</div>}

      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Áudios
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{loading ? 'Carregando…' : `${audios.length} áudio(s) disponível(is)`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openRec} title="Gravar do microfone" className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Gravar áudio
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Adicionar áudio
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-6">
        {loading ? (
          <div className="col-span-full text-center text-zinc-600 text-sm py-12">Carregando…</div>
        ) : audios.length === 0 ? (
          <div className="col-span-full text-center text-zinc-500 text-sm py-12 border border-dashed border-zinc-800 rounded-2xl">
            Nenhum áudio ainda. Clique em <strong>Adicionar áudio</strong>.
          </div>
        ) : audios.map((a, idx) => (
          <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">{String(a.ordem ?? a.id).padStart(2, '0')}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => move(a.id, -1)} disabled={idx === 0} title="Subir"
                  className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button onClick={() => move(a.id, 1)} disabled={idx === audios.length - 1} title="Descer"
                  className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2">
              <button onClick={() => togglePlay(a)} className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors ${playingId === a.id ? 'bg-violet-600 border-violet-500 text-white' : 'bg-violet-600/10 border-violet-600/20 text-violet-400 hover:bg-violet-600/20'}`}>
                {playingId === a.id ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
            </div>

            <audio
              ref={el => { audioRefs.current[a.id] = el }}
              src={a.audio_url || `/audios/${a.filename}`}
              preload="none"
              className="hidden"
              onEnded={() => setPlayingId(c => c === a.id ? null : c)}
              onPause={() => setPlayingId(c => c === a.id ? null : c)}
            />

            {editingId === a.id ? (
              <input
                autoFocus
                value={editingNome}
                onChange={e => setEditingNome(e.target.value)}
                onBlur={() => rename(a.id, editingNome)}
                onKeyDown={e => { if (e.key === 'Enter') rename(a.id, editingNome); if (e.key === 'Escape') setEditingId(null) }}
                className="px-2 py-1 bg-zinc-800 border border-violet-600 rounded-lg text-sm text-zinc-100 focus:outline-none text-center"
              />
            ) : (
              <button onClick={() => { setEditingId(a.id); setEditingNome(a.nome) }} className="text-sm font-semibold text-zinc-100 text-center truncate hover:text-violet-300" title="Clique para renomear">{a.nome}</button>
            )}

            <div className="flex items-center justify-between text-[11px] text-zinc-600 gap-2">
              <span className="uppercase truncate">{(a.filename.split('.').pop() || '').slice(0, 5)}</span>
              <button onClick={() => remove(a)} className="text-zinc-500 hover:text-red-400" title="Excluir">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Adicionar áudio</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                dragging ? 'border-violet-500 bg-violet-900/20'
                : file ? 'border-emerald-600/60 bg-emerald-900/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".ogg,.opus,.mp3,.m4a,.wav,audio/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              {file ? (
                <>
                  <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                  <p className="text-sm text-emerald-400 font-medium">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(0)} KB · clique para trocar</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm text-zinc-400">Arraste o áudio aqui ou <span className="text-violet-400">clique para selecionar</span></p>
                  <p className="text-xs text-zinc-600 mt-1">.ogg, .opus, .mp3, .m4a, .wav · máx 10MB</p>
                </>
              )}
            </div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Apresentação inicial" className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} disabled={uploading} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm rounded-xl disabled:opacity-50">Cancelar</button>
              <button onClick={saveNew} disabled={uploading || !file || !nome.trim()} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl">
                {uploading ? 'Enviando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Gravar novo áudio</h3>
              <button onClick={closeRec} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* área de gravação */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-4 flex flex-col items-center gap-3">
              {isRecording ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center animate-pulse">
                    <svg className="w-10 h-10 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-mono text-rose-300">{fmtTime(recordTime)}</p>
                  <button onClick={stopRecording} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
                    Parar
                  </button>
                </>
              ) : recordedBlob ? (
                <>
                  <p className="text-xs text-emerald-400 font-medium">✓ Áudio gravado ({fmtTime(recordTime)})</p>
                  {recordedUrl && <audio controls src={recordedUrl} className="w-full" />}
                  <button onClick={() => { setRecordedBlob(null); setRecordTime(0) }} className="text-xs text-zinc-400 hover:text-rose-400 underline">
                    Gravar de novo
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-violet-600/10 border-2 border-violet-600/30 flex items-center justify-center">
                    <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </div>
                  <button onClick={startRecording} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    Começar a gravar
                  </button>
                </>
              )}
            </div>

            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do áudio</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Saudação personalizada"
              className="w-full px-3 py-2.5 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600" />

            {recordError && (
              <div className="mb-3 px-3 py-2.5 bg-rose-950/40 border border-rose-700/60 rounded-lg">
                <p className="text-[11px] font-semibold text-rose-300 mb-1">⚠️ Erro ao salvar</p>
                <p className="text-[11px] text-rose-200 break-words">{recordError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeRec} disabled={uploading} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm rounded-xl disabled:opacity-50">Cancelar</button>
              <button onClick={saveRecording} disabled={uploading || !recordedBlob || !nome.trim()}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl">
                {uploading ? 'Salvando…' : 'Salvar como template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
