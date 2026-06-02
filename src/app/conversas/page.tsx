'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface Tag { id: number; nome: string; cor: string }

interface ConversaItem {
  session_id: string
  inbox: string | null
  inbox_nome: string
  inbox_cor: string
  nome: string
  ultima_msg: string
  hora: string
  arquivada?: boolean
  last_direction?: 'in' | 'out'
  last_at?: string
  unread_count?: number
  tags?: Tag[]
}

interface Message {
  id: string
  direction: 'in' | 'out'
  content: string
  tipo: 'text' | 'audio' | 'image' | 'document' | 'video' | 'location' | string
  hora: string
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | null
  media_url?: string | null
}

function StatusTicks({ status }: { status?: Message['status'] }) {
  if (!status) return null
  if (status === 'failed') {
    return (
      <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  }
  // ticks
  if (status === 'sent') {
    return (
      <svg className="w-3.5 h-3.5 text-violet-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  // delivered or read
  const color = status === 'read' ? 'text-sky-300' : 'text-violet-400/70'
  return (
    <svg className={`w-4 h-3.5 ${color}`} fill="none" viewBox="0 0 28 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
      <polyline points="27 6 16 17 11 12" />
    </svg>
  )
}

interface Audio {
  id: number
  nome: string
  filename: string
  audio_url?: string
}

interface TextTemplate {
  id: number
  nome: string
  content: string
}

interface Inbox {
  key: string
  nome: string
  provider: string
  cor: string
  ordem: number
}

// Cores compartilhadas pra caixas e etiquetas (classes estáticas p/ Tailwind)
const TAG_COLORS: Record<string, string> = {
  violet:  'bg-violet-500/20 text-violet-300 border-violet-500/40',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  blue:    'bg-blue-500/20 text-blue-300 border-blue-500/40',
  amber:   'bg-amber-500/20 text-amber-300 border-amber-500/40',
  rose:    'bg-rose-500/20 text-rose-300 border-rose-500/40',
  pink:    'bg-pink-500/20 text-pink-300 border-pink-500/40',
  cyan:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  zinc:    'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
}
function inboxColor(cor?: string) { return TAG_COLORS[cor ?? 'zinc'] ?? TAG_COLORS.zinc }
function tagColor(cor?: string)   { return TAG_COLORS[cor ?? 'violet'] ?? TAG_COLORS.violet }

const MOCK_CONVERSAS: ConversaItem[] = [
  { session_id: '5531991234567', inbox: 'num1', inbox_nome: 'Número 1', inbox_cor: 'violet',  nome: 'Maria Santos',   ultima_msg: 'Oi, quero saber mais', hora: '10:32' },
  { session_id: '5531998765432', inbox: 'num1', inbox_nome: 'Número 1', inbox_cor: 'violet',  nome: 'Ana Lima',        ultima_msg: 'Qual o valor?',         hora: '10:18' },
  { session_id: '5531987654321', inbox: 'num2', inbox_nome: 'Número 2', inbox_cor: 'emerald', nome: 'Josefa Oliveira', ultima_msg: 'Tá bom obrigada',       hora: '09:47' },
]

const MOCK_AUDIOS: Audio[] = [
  { id: 1, nome: 'Saudação inicial',        filename: 'audio-01.ogg' },
  { id: 2, nome: 'Como funciona — 60 dias', filename: 'audio-02.ogg' },
]

function formatPhone(sessionId: string) {
  const digits = sessionId.replace(/\D/g, '')
  if (digits.length >= 13) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return sessionId
}

/** Nome a exibir: se o "nome" for só o número (sem pushName), formata bonito. */
function displayName(c: { nome: string; session_id: string }): string {
  return c.nome === c.session_id ? formatPhone(c.nome) : c.nome
}

function convKey(c: { inbox: string | null; session_id: string }) {
  return `${c.inbox ?? '-'}:${c.session_id}`
}

function InboxBadge({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${inboxColor(cor)}`}>
      {nome}
    </span>
  )
}

function ConversasContent() {
  const searchParams = useSearchParams()
  const initialSession = searchParams.get('session_id') ?? null

  const [conversas, setConversas] = useState<ConversaItem[]>([])
  const [loadingConversas, setLoadingConversas] = useState(true)
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [selectedInbox, setSelectedInbox] = useState<string>('todos')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [toast, setToast] = useState('')
  const [audios, setAudios] = useState<Audio[]>([])
  const [audioSearch, setAudioSearch] = useState('')
  const [templates, setTemplates] = useState<TextTemplate[]>([])
  const [rightTab, setRightTab] = useState<'audios' | 'textos'>('audios')
  const [mobileShortcutsOpen, setMobileShortcutsOpen] = useState(false)

  // Etiquetas (tags) — catálogo + dropdown aberto?
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showConvMenu, setShowConvMenu] = useState(false)

  // Arquivadas: mostra ativas (false) ou arquivadas (true)?
  const [showArchived, setShowArchived] = useState(false)
  const showArchivedRef = useRef(showArchived)
  useEffect(() => { showArchivedRef.current = showArchived })
  const [sendingAudio, setSendingAudio] = useState<number | null>(null)
  const [sentAudio, setSentAudio] = useState<number | null>(null)

  // Gravação ao vivo
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [recordTime, setRecordTime] = useState(0)
  const [sendingRecording, setSendingRecording] = useState(false)
  // Recorder pode ser MediaRecorder ou opus-recorder.Recorder; usamos any pra simplificar tipagem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaRecorderRef = useRef<any>(null)
  const recordStreamRef = useRef<MediaStream | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cria/revoga a URL temporária do áudio gravado conforme o blob muda
  useEffect(() => {
    if (!recordedBlob) { setRecordedUrl(null); return }
    const url = URL.createObjectURL(recordedBlob)
    setRecordedUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recordedBlob])
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null)
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/inboxes')
      .then(r => r.json())
      .then((data: Inbox[]) => { if (Array.isArray(data)) setInboxes(data) })
      .catch(() => { /* silencioso */ })
  }, [])

  useEffect(() => {
    const q = showArchived ? '?arquivadas=true' : ''
    fetch(`/api/conversas${q}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: ConversaItem[]) => {
        if (Array.isArray(data)) {
          setConversas(data)
          if (initialSession && !selectedKey) {
            const match = data.find(c => c.session_id === initialSession)
            if (match) setSelectedKey(convKey(match))
          }
        }
      })
      .catch(() => setConversas([]))
      .finally(() => setLoadingConversas(false))
  }, [initialSession, showArchived]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/audios')
      .then(r => r.json())
      .then((data: Audio[]) => { if (Array.isArray(data) && data.length) setAudios(data) })
      .catch(() => setAudios(MOCK_AUDIOS))
  }, [])

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then((data: TextTemplate[]) => { if (Array.isArray(data)) setTemplates(data) })
      .catch(() => { /* silencioso */ })
  }, [])

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then((data: Tag[]) => { if (Array.isArray(data)) setAllTags(data) })
      .catch(() => { /* silencioso */ })
  }, [])

  // Arquiva/desarquiva a conversa selecionada (do chat header)
  async function clearMessages() {
    if (!selectedConversa) return
    if (!confirm('Apagar todas as mensagens desta conversa?')) return
    setShowConvMenu(false)
    const q = new URLSearchParams({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox ?? '', mode: 'messages' })
    await fetch(`/api/conversas?${q}`, { method: 'DELETE' })
    setMessages([])
  }

  async function deleteConversation() {
    if (!selectedConversa) return
    if (!confirm('Apagar conversa e todas as mensagens permanentemente?')) return
    setShowConvMenu(false)
    const q = new URLSearchParams({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox ?? '', mode: 'all' })
    await fetch(`/api/conversas?${q}`, { method: 'DELETE' })
    setSelectedKey(null)
    setMessages([])
    setConversas(prev => prev.filter(c => convKey(c) !== convKey(selectedConversa)))
  }

  async function toggleArchive() {
    if (!selectedConversa) return
    await archiveConversa(selectedConversa, !selectedConversa.arquivada)
    setSelectedKey(null)
  }

  // Helper genérico: arquivar/desarquivar qualquer conversa (usado tb na lista)
  async function archiveConversa(c: ConversaItem, arquivar: boolean) {
    setConversas(prev => prev.filter(x => convKey(x) !== convKey(c)))
    try {
      await fetch('/api/conversas/archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: c.session_id, inbox: c.inbox, arquivada: arquivar }),
      })
      showToast(arquivar ? 'Arquivada.' : 'Desarquivada.')
    } catch { showToast('Falha de rede.') }
  }

  // Aplica/desmarca uma tag no lead selecionado
  async function toggleTag(tagId: number) {
    if (!selectedConversa) return
    const current = selectedConversa.tags ?? []
    const has = current.some(t => t.id === tagId)
    const novos = has ? current.filter(t => t.id !== tagId) : [...current, allTags.find(t => t.id === tagId)!]
    // otimista
    setConversas(prev => prev.map(c => convKey(c) === selectedKey ? { ...c, tags: novos } : c))
    try {
      await fetch('/api/conversas/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox, tag_ids: novos.map(t => t.id) }),
      })
    } catch { /* polling reconcilia */ }
  }

  const selectedConversa = conversas.find(c => convKey(c) === selectedKey) ?? null

  useEffect(() => {
    if (!selectedConversa) { setMessages([]); return }
    setLoadingMsgs(true)
    const q = new URLSearchParams({ session_id: selectedConversa.session_id })
    if (selectedConversa.inbox) q.set('inbox', selectedConversa.inbox)
    fetch(`/api/conversas?${q.toString()}`)
      .then(r => r.json())
      .then((data: Message[]) => { setMessages(data); setLoadingMsgs(false) })
      .catch(() => { setMessages([]); setLoadingMsgs(false) })
    // Zera o badge de não lidas ao abrir a conversa
    fetch('/api/conversas/mark-read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox }),
    }).catch(() => {})
    setConversas(prev => prev.map(c => convKey(c) === selectedKey ? { ...c, unread_count: 0 } : c))
  }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling 5s: atualiza lista e mensagens sem precisar de F5 ──
  const selectedRef = useRef<ConversaItem | null>(null)
  useEffect(() => { selectedRef.current = selectedConversa })
  const lastSeenRef = useRef<Record<string, string>>({})
  const firstLoadRef = useRef(true)

  // Beep curto via Web Audio API (sem precisar de arquivo de áudio)
  function beep() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain).connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
      setTimeout(() => ctx.close(), 400)
    } catch { /* navegador sem AudioContext */ }
  }

  function notify(conv: ConversaItem) {
    try {
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return
      if (document.visibilityState === 'visible') return // não notifica se já tá olhando
      const n = new Notification(`Nova mensagem — ${displayName(conv)}`, {
        body: conv.ultima_msg?.slice(0, 120) ?? '',
        tag: `flowvoz-${conv.session_id}-${conv.inbox ?? ''}`,
      })
      n.onclick = () => { window.focus(); n.close() }
    } catch { /* silencioso */ }
  }

  // Pede permissão pra notificações na primeira interação
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* ignora */ })
    }
  }, [])

  // Atalhos de teclado:
  //   Esc     → fecha conversa selecionada / limpa busca
  //   Ctrl+/  → foca a busca de conversas
  const navListRef = useRef<{ keys: string[] } | null>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if (e.key === 'Escape') {
        if (selectedKey) { setSelectedKey(null); e.preventDefault() }
        else if (search) { setSearch(''); e.preventDefault() }
        return
      }
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        const el = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar por nome"]')
        el?.focus(); el?.select(); e.preventDefault()
        return
      }
      if (!isTyping && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const keys = navListRef.current?.keys ?? []
        if (keys.length === 0) return
        const idx = selectedKey ? keys.indexOf(selectedKey) : -1
        const next = e.key === 'ArrowDown'
          ? (idx < keys.length - 1 ? idx + 1 : 0)
          : (idx > 0 ? idx - 1 : keys.length - 1)
        setSelectedKey(keys[next])
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedKey, search])

  useEffect(() => {
    function refresh() {
      const q = showArchivedRef.current ? '?arquivadas=true' : ''
      fetch(`/api/conversas${q}`, { cache: 'no-store' })
        .then(r => r.json())
        .then((data: ConversaItem[]) => {
          if (!Array.isArray(data)) return
          // Detectar mensagens novas comparando last_at por conversa
          if (!firstLoadRef.current) {
            for (const conv of data) {
              const k = convKey(conv)
              const prev = lastSeenRef.current[k]
              const cur = conv.last_at ?? ''
              if (conv.last_direction === 'in' && cur && cur !== prev) {
                beep()
                notify(conv)
                break // 1 beep por ciclo
              }
            }
          }
          // Atualiza snapshot
          const next: Record<string, string> = {}
          for (const conv of data) next[convKey(conv)] = conv.last_at ?? ''
          lastSeenRef.current = next
          firstLoadRef.current = false
          setConversas(data)
        })
        .catch(() => { /* silencioso */ })
      const sel = selectedRef.current
      if (sel) {
        const q = new URLSearchParams({ session_id: sel.session_id })
        if (sel.inbox) q.set('inbox', sel.inbox)
        fetch(`/api/conversas?${q.toString()}`, { cache: 'no-store' })
          .then(r => r.json())
          .then((data: Message[]) => { if (Array.isArray(data)) setMessages(data) })
          .catch(() => { /* silencioso */ })
      }
    }

    // Polling adaptativo: 5s com aba visível, 30s em segundo plano
    let timer: ReturnType<typeof setTimeout> | null = null
    function schedule() {
      if (timer) clearTimeout(timer)
      const delay = (typeof document !== 'undefined' && document.visibilityState === 'visible') ? 5000 : 30000
      timer = setTimeout(() => { refresh(); schedule() }, delay)
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        // voltou pra aba → atualiza na hora e re-agenda em ritmo rápido
        refresh()
        schedule()
      }
    }
    schedule()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      if (timer) clearTimeout(timer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function sendText() {
    if (!replyText.trim() || !selectedConversa) return
    setSendingMsg(true)
    const text = replyText.trim()
    setReplyText('')
    const optimisticId = `tmp-${Date.now()}`
    setMessages(prev => [...prev, { id: optimisticId, direction: 'out', content: text, tipo: 'text', hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }])
    try {
      const r = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox, tipo: 'text', content: text }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        showToast(data.error || 'Falha ao enviar mensagem.')
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        setReplyText(text) // devolve o texto pro input
      }
    } catch {
      showToast('Falha de rede. Tente de novo.')
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setReplyText(text)
    }
    setSendingMsg(false)
  }

  async function sendAudio(audio: Audio) {
    if (!selectedConversa) { showToast('Selecione uma conversa primeiro'); return }
    setSendingAudio(audio.id)
    const audioUrl = audio.audio_url || `/audios/${audio.filename}`
    try {
      const r = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox, tipo: 'audio', audio_url: audioUrl, audio_id: audio.id, audio_nome: audio.nome }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        showToast(data.error || 'Falha ao enviar áudio.')
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), direction: 'out', content: audio.nome, tipo: 'audio', hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }])
        setSentAudio(audio.id)
        setTimeout(() => setSentAudio(null), 2000)
      }
    } catch {
      showToast('Falha de rede ao enviar áudio.')
    }
    setSendingAudio(null)
  }

  // ── Gravação ao vivo (com opus-recorder: gera OGG+Opus, formato aceito pela Meta) ──
  function fmtTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }
  async function startRecording() {
    if (!selectedConversa) { showToast('Selecione uma conversa primeiro'); return }
    if (typeof window === 'undefined' || !window.isSecureContext) {
      showToast('Gravação só funciona em HTTPS.'); return
    }
    try {
      const mod = await import('opus-recorder')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Recorder: any = (mod as any).default ?? mod
      const recorder = new Recorder({
        encoderPath: '/opus/encoderWorker.min.js',
        encoderApplication: 2049, // VOIP
        encoderSampleRate: 16000,
        numberOfChannels: 1,
        streamPages: false,
        encoderBitRate: 16000,
        monitorGain: 0,
        recordingGain: 1,
      })
      recorder.ondataavailable = (typedArray: Uint8Array) => {
        const blob = new Blob([new Uint8Array(typedArray)], { type: 'audio/ogg' })
        setRecordedBlob(blob)
      }
      mediaRecorderRef.current = recorder
      await recorder.start()
      setIsRecording(true); setRecordedBlob(null); setRecordTime(0)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch (err) {
      const e = err as { name?: string; message?: string }
      console.error('[recorder]', e.name, e.message, err)
      if (e.name === 'NotAllowedError') showToast('Acesso bloqueado. Cadeado da URL → libere o microfone.')
      else if (e.name === 'NotFoundError') showToast('Nenhum microfone encontrado.')
      else if (e.name === 'NotReadableError') showToast('Microfone em uso por outro programa.')
      else showToast(`Erro: ${e.message ?? e.name ?? 'desconhecido'}`)
    }
  }
  function stopRecording() {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    setIsRecording(false)
    const rec = mediaRecorderRef.current
    if (rec?.stop) { try { rec.stop() } catch {} }
  }
  function discardRecording() {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    const rec = mediaRecorderRef.current
    if (rec?.stop) { try { rec.stop() } catch {} }
    if (rec?.close) { try { rec.close() } catch {} }
    setIsRecording(false); setRecordedBlob(null); setRecordTime(0)
  }
  async function sendRecording() {
    if (!recordedBlob || !selectedConversa) return
    setSendingRecording(true)
    const optId = `tmp-${Date.now()}`
    setMessages(prev => [...prev, { id: optId, direction: 'out', content: 'Áudio gravado', tipo: 'audio', hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }])
    try {
      const form = new FormData()
      const ext = recordedBlob.type.includes('ogg') ? 'ogg' : recordedBlob.type.includes('mp4') ? 'm4a' : 'webm'
      form.append('audio', recordedBlob, `gravacao.${ext}`)
      form.append('session_id', selectedConversa.session_id)
      if (selectedConversa.inbox) form.append('inbox', selectedConversa.inbox)
      const r = await fetch('/api/send-recording', { method: 'POST', body: form })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        showToast(d.error || 'Falha ao enviar áudio.')
        setMessages(prev => prev.filter(m => m.id !== optId))
      } else {
        discardRecording()
      }
    } catch {
      showToast('Falha de rede.')
      setMessages(prev => prev.filter(m => m.id !== optId))
    }
    setSendingRecording(false)
  }

  function togglePlay(audio: Audio) {
    const el = audioRefs.current[audio.id]
    if (!el) return
    // Se já está tocando esse → pausa
    if (playingAudioId === audio.id) {
      el.pause()
      setPlayingAudioId(null)
      return
    }
    // Pausa qualquer outro áudio que esteja tocando
    Object.values(audioRefs.current).forEach(other => { try { other?.pause() } catch {} })
    el.currentTime = 0
    el.play().then(() => setPlayingAudioId(audio.id)).catch(() => setPlayingAudioId(null))
  }

  // Filtro por número
  const byInbox = selectedInbox === 'todos'
    ? conversas
    : conversas.filter(c => c.inbox === selectedInbox)

  // Busca (nome / número / última msg)
  const searchTerm = search.trim().toLowerCase()
  const filteredConversas = searchTerm
    ? byInbox.filter(c =>
        c.nome.toLowerCase().includes(searchTerm) ||
        c.session_id.toLowerCase().includes(searchTerm) ||
        (c.ultima_msg ?? '').toLowerCase().includes(searchTerm)
      )
    : byInbox

  // Não lidas: conversas com mensagens do cliente ainda não vistas
  const isUnread = (c: ConversaItem) => (c.unread_count ?? (c.last_direction === 'in' ? 1 : 0)) > 0
  const unreadByInbox: Record<string, number> = { todos: conversas.filter(isUnread).length }
  for (const ib of inboxes) {
    unreadByInbox[ib.key] = conversas.filter(c => c.inbox === ib.key && isUnread(c)).length
  }

  const filteredAudios = audios.filter(a => a.nome.toLowerCase().includes(audioSearch.toLowerCase()))

  const showInboxTag = selectedInbox === 'todos' && inboxes.length > 1

  // mantém a lista de keys atualizada para navegação por setas
  useEffect(() => {
    navListRef.current = { keys: filteredConversas.map(convKey) }
  })

  return (
    <div className="flex-1 flex overflow-hidden h-full bg-[#09090b]">
      {/* Drawer mobile: Áudios + Textos (visível só com < md) */}
      {mobileShortcutsOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#09090b]/95 backdrop-blur flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Atalhos rápidos</h2>
            <button onClick={() => setMobileShortcutsOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="px-3 pt-3 flex gap-1 border-b border-zinc-800">
            <button onClick={() => setRightTab('audios')}
              className={`flex-1 py-2 rounded-t-lg text-xs font-semibold transition-colors ${rightTab === 'audios' ? 'bg-zinc-800 text-violet-300' : 'text-zinc-500'}`}>Áudios</button>
            <button onClick={() => setRightTab('textos')}
              className={`flex-1 py-2 rounded-t-lg text-xs font-semibold transition-colors ${rightTab === 'textos' ? 'bg-zinc-800 text-violet-300' : 'text-zinc-500'}`}>Textos</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {rightTab === 'audios' ? (
              filteredAudios.length === 0
                ? <div className="text-xs text-zinc-600 text-center py-8">Nenhum áudio.</div>
                : filteredAudios.map(audio => (
                    <div key={audio.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                      <p className="text-sm font-semibold text-zinc-200 mb-2 truncate">{audio.nome}</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => togglePlay(audio)}
                          className={`px-3 py-2 rounded-lg text-xs ${playingAudioId === audio.id ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                        >
                          {playingAudioId === audio.id ? '⏸' : '▶'}
                        </button>
                        <button
                          onClick={async () => { await sendAudio(audio); setMobileShortcutsOpen(false) }}
                          disabled={sendingAudio === audio.id}
                          className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg"
                        >
                          {sendingAudio === audio.id ? 'Enviando…' : 'Enviar'}
                        </button>
                      </div>
                    </div>
                  ))
            ) : (
              templates.length === 0
                ? <div className="text-xs text-zinc-600 text-center py-8">Nenhum template.</div>
                : templates.map(t => (
                    <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                      <p className="text-sm font-semibold text-zinc-200 mb-1 truncate">{t.nome}</p>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2 whitespace-pre-wrap">{t.content}</p>
                      <button
                        onClick={() => { setReplyText(t.content); setMobileShortcutsOpen(false); showToast('Texto inserido') }}
                        className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg"
                      >Inserir no chat</button>
                    </div>
                  ))
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Coluna esquerda: Lista de conversas ── */}
      <div className={`${selectedKey ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 border-r border-zinc-800 flex-col bg-zinc-900/50`}>
        {/* Seletor de número + contador de não lidas */}
        {inboxes.length > 1 && (
          <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedInbox('todos')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedInbox === 'todos' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos
              {unreadByInbox.todos > 0 && (
                <span className="ml-0.5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-4">{unreadByInbox.todos}</span>
              )}
            </button>
            {inboxes.map(ib => (
              <button
                key={ib.key}
                onClick={() => setSelectedInbox(ib.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  selectedInbox === ib.key ? inboxColor(ib.cor) : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                {ib.nome}
                {(unreadByInbox[ib.key] ?? 0) > 0 && (
                  <span className="ml-0.5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-4">{unreadByInbox[ib.key]}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-white">{showArchived ? 'Arquivadas' : 'Conversas'}</h1>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{byInbox.length}</span>
          </div>
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => { setShowArchived(false); setSelectedKey(null) }}
              className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${!showArchived ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >Ativas</button>
            <button
              onClick={() => { setShowArchived(true); setSelectedKey(null) }}
              className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${showArchived ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              Arquivadas
            </button>
          </div>
          <div className="relative mb-2">
            <svg className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou número…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300" title="Limpar">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversas ? (
            <div className="flex flex-col gap-2 px-4 pt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 items-center py-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-zinc-800 rounded w-2/3" />
                    <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversas.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">Nenhuma conversa</div>
          ) : filteredConversas.map(conv => {
            const k = convKey(conv)
            const isSelected = selectedKey === k
            const display = displayName(conv)
            const inicial = display.charAt(0).toUpperCase()
            return (
              <div
                key={k}
                onClick={() => setSelectedKey(k)}
                className={`w-full text-left px-4 py-3.5 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors cursor-pointer relative group ${
                  isSelected ? 'bg-violet-900/20 border-l-2 border-l-violet-500' : ''
                }`}
              >
                {showArchived && (
                  <button
                    onClick={(e) => { e.stopPropagation(); archiveConversa(conv, false) }}
                    title="Desarquivar"
                    className="absolute right-2 top-2 z-10 p-1.5 bg-zinc-800 hover:bg-emerald-700 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 9 12 2 21 9 21 22 3 22 3 9" />
                      <polyline points="9 22 9 14 15 14 15 22" />
                    </svg>
                  </button>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-violet-800/40 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-zinc-200 truncate">{display}</span>
                      <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-1">{conv.hora}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-zinc-500 truncate">{conv.ultima_msg}</p>
                      {(conv.unread_count ?? 0) > 0 && !isSelected && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1 leading-none">
                          {(conv.unread_count ?? 0) > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    {(showInboxTag || (conv.tags && conv.tags.length > 0)) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {showInboxTag && <InboxBadge nome={conv.inbox_nome} cor={conv.inbox_cor} />}
                        {conv.tags?.slice(0, 3).map(t => (
                          <span key={t.id} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${tagColor(t.cor)}`}>{t.nome}</span>
                        ))}
                        {conv.tags && conv.tags.length > 3 && (
                          <span className="text-[9px] text-zinc-500">+{conv.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Coluna central: Chat ── */}
      <div className={`${selectedKey ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        {!selectedConversa ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedKey(null)}
                  title="Voltar"
                  className="md:hidden p-1 -ml-1 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className="w-9 h-9 rounded-full bg-violet-800/40 flex items-center justify-center text-xs font-bold text-violet-300">
                  {displayName(selectedConversa).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{displayName(selectedConversa)}</p>
                  {/* mostra o número embaixo só se o nome for diferente do número (tem pushName) */}
                  {selectedConversa.nome !== selectedConversa.session_id && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">{formatPhone(selectedConversa.session_id)}</p>
                  )}
                  {inboxes.length > 1 && (
                    <div className="mt-1"><InboxBadge nome={selectedConversa.inbox_nome} cor={selectedConversa.inbox_cor} /></div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={toggleArchive}
                  title={selectedConversa.arquivada ? 'Desarquivar' : 'Arquivar (some da lista principal)'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                  {selectedConversa.arquivada ? 'Desarquivar' : 'Arquivar'}
                </button>
                <button
                  onClick={() => setShowTagPicker(s => !s)}
                  title="Etiquetas"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Etiquetas
                  {selectedConversa.tags && selectedConversa.tags.length > 0 && (
                    <span className="bg-violet-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{selectedConversa.tags.length}</span>
                  )}
                </button>

                {/* Menu ··· */}
                <div className="relative">
                  <button
                    onClick={() => setShowConvMenu(s => !s)}
                    title="Mais opções"
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                  {showConvMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowConvMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-52 overflow-hidden">
                        <button onClick={clearMessages}
                          className="w-full px-4 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-colors">
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                          </svg>
                          Limpar mensagens
                        </button>
                        <div className="border-t border-zinc-800" />
                        <button onClick={deleteConversation}
                          className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                          Apagar conversa
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {showTagPicker && (
                  <>
                    {/* overlay pra fechar clicando fora */}
                    <div className="fixed inset-0 z-30" onClick={() => setShowTagPicker(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-64 max-h-80 overflow-y-auto">
                      <div className="px-3 py-2 border-b border-zinc-800 text-[11px] text-zinc-500">Aplicar etiquetas</div>
                      {allTags.length === 0 ? (
                        <div className="p-4 text-xs text-zinc-500 text-center">
                          Nenhuma etiqueta criada ainda.<br />
                          <a href="/etiquetas" className="text-violet-400 hover:underline">Criar primeira →</a>
                        </div>
                      ) : allTags.map(tag => {
                        const checked = selectedConversa.tags?.some(t => t.id === tag.id) ?? false
                        return (
                          <button key={tag.id} onClick={() => toggleTag(tag.id)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 transition-colors text-left">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-violet-600 border-violet-600' : 'bg-zinc-800 border-zinc-600'}`}>
                              {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${tagColor(tag.cor)}`}>{tag.nome}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                <button
                  onClick={() => setMobileShortcutsOpen(true)}
                  title="Áudios e textos"
                  className="md:hidden p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">Carregando…</div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">Sem mensagens</div>
              ) : messages.map(msg => {
                const isOut = msg.direction === 'out'
                return (
                  <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isOut ? 'bg-violet-900/60 text-violet-100 rounded-br-md' : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                    }`}>
                      {msg.tipo === 'audio' ? (
                        <div className="min-w-[200px]">
                          {msg.media_url ? (
                            <audio controls src={msg.media_url} className="w-full max-w-[260px] h-10 accent-violet-500" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-violet-700/60' : 'bg-zinc-700'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-medium">{msg.content}</p>
                                <p className={`text-[10px] mt-0.5 ${isOut ? 'text-violet-400/70' : 'text-zinc-500'}`}>Áudio</p>
                              </div>
                            </div>
                          )}
                          {msg.content && msg.content !== '[Áudio recebido]' && msg.media_url && (
                            <p className="text-xs mt-1.5 opacity-80 italic">{msg.content}</p>
                          )}
                        </div>
                      ) : msg.tipo === 'image' ? (
                        <div className="min-w-[160px]">
                          {msg.media_url ? (
                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={msg.media_url} alt="Imagem" className="rounded-lg max-w-[240px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <p className="text-xs">[Imagem]</p>
                          )}
                          {msg.content && msg.content !== '[Imagem]' && (
                            <p className="text-xs mt-1 opacity-80">{msg.content}</p>
                          )}
                        </div>
                      ) : msg.tipo === 'document' ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-violet-700/60' : 'bg-zinc-700'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-medium">{msg.content || 'Documento'}</p>
                            {msg.media_url && (
                              <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                                className={`text-[10px] mt-0.5 underline ${isOut ? 'text-violet-300' : 'text-blue-400'}`}>
                                Baixar ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ) : msg.tipo === 'location' ? (() => {
                        // content vem como "📍 nome\nhttps://maps..."
                        const lines = msg.content.split('\n')
                        const label = (lines[0] || '📍 Localização').replace(/^📍\s*/, '').trim()
                        const url = lines.find(l => /^https?:\/\//.test(l.trim()))?.trim()
                        return (
                          <div>
                            <div className="flex items-start gap-2 mb-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-violet-700/60' : 'bg-zinc-700'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{label}</p>
                                <p className={`text-[10px] mt-0.5 ${isOut ? 'text-violet-400/70' : 'text-zinc-500'}`}>Localização</p>
                              </div>
                            </div>
                            {url && (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                className={`block text-center text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${isOut ? 'bg-violet-700/40 hover:bg-violet-700/60 text-violet-100' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'}`}>
                                Abrir no Google Maps ↗
                              </a>
                            )}
                          </div>
                        )
                      })() : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : ''}`}>
                        <p className={`text-[10px] ${isOut ? 'text-violet-400/70' : 'text-zinc-600'}`}>{msg.hora}</p>
                        {isOut && <StatusTicks status={msg.status} />}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-3 pb-20 md:pb-3 border-t border-zinc-800 bg-zinc-900/40 flex-shrink-0">
              {/* Modo 1: Gravando agora */}
              {isRecording ? (
                <div className="flex items-center gap-3 px-3 py-2 bg-rose-950/30 border border-rose-900/60 rounded-xl">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-sm text-rose-200 font-mono">{fmtTime(recordTime)}</span>
                  <span className="text-xs text-rose-300/80 flex-1">Gravando…</span>
                  <button onClick={discardRecording} title="Cancelar" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg">
                    Cancelar
                  </button>
                  <button onClick={stopRecording} title="Parar" className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
                    Parar
                  </button>
                </div>
              ) : recordedBlob ? (
                /* Modo 2: Áudio gravado, esperando envio/descarte */
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-950/30 border border-violet-900/60 rounded-xl">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  {recordedUrl && <audio controls src={recordedUrl} className="flex-1 h-8" />}
                  <button onClick={discardRecording} disabled={sendingRecording} title="Descartar"
                    className="p-2 text-zinc-400 hover:text-rose-400 disabled:opacity-40">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                  </button>
                  <button onClick={sendRecording} disabled={sendingRecording}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    {sendingRecording ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Enviando…
                      </>
                    ) : 'Enviar'}
                  </button>
                </div>
              ) : (
                /* Modo 3: Input de texto + botões */
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite uma mensagem…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                  />
                  {replyText.trim() ? (
                    <button
                      onClick={sendText}
                      disabled={sendingMsg}
                      title="Enviar"
                      className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      {sendingMsg ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      title="Gravar áudio"
                      className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Coluna direita: Áudios / Textos (escondida no mobile) ── */}
      <div className="hidden md:flex w-72 flex-shrink-0 border-l border-zinc-800 flex-col bg-zinc-900/50">
        {/* Tabs */}
        <div className="px-3 pt-3 flex gap-1 border-b border-zinc-800">
          <button
            onClick={() => setRightTab('audios')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-t-lg text-xs font-semibold transition-colors ${rightTab === 'audios' ? 'bg-zinc-800 text-violet-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            Áudios
          </button>
          <button
            onClick={() => setRightTab('textos')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-t-lg text-xs font-semibold transition-colors ${rightTab === 'textos' ? 'bg-zinc-800 text-violet-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Textos
          </button>
        </div>

        {rightTab === 'audios' ? (
        <>
        <div className="px-4 py-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Buscar áudio…"
            value={audioSearch}
            onChange={e => setAudioSearch(e.target.value)}
            className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredAudios.length === 0 ? (
            <div className="text-xs text-zinc-600 text-center py-8">Nenhum áudio encontrado</div>
          ) : filteredAudios.map(audio => {
            const isSending = sendingAudio === audio.id
            const isSent = sentAudio === audio.id
            return (
              <div key={audio.id} className={`rounded-xl border p-3 transition-all ${isSent ? 'bg-green-900/20 border-green-700/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">{String(audio.id).padStart(2, '0')}</span>
                    <span className="text-xs font-semibold text-zinc-200 truncate">{audio.nome}</span>
                  </div>
                </div>
                <audio
                  ref={el => { audioRefs.current[audio.id] = el }}
                  src={audio.audio_url || `/audios/${audio.filename}`}
                  preload="none"
                  className="hidden"
                  onEnded={() => setPlayingAudioId(curr => curr === audio.id ? null : curr)}
                  onPause={() => setPlayingAudioId(curr => curr === audio.id ? null : curr)}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => togglePlay(audio)}
                    title={playingAudioId === audio.id ? 'Pausar' : 'Ouvir prévia'}
                    className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ${playingAudioId === audio.id ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
                  >
                    {playingAudioId === audio.id ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>
                  <button
                    onClick={() => sendAudio(audio)}
                    disabled={isSending}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSent ? 'bg-green-700 text-white' : isSending ? 'bg-violet-800 text-violet-300 cursor-wait' : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                  >
                    {isSending ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Enviando…
                      </>
                    ) : isSent ? (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        Enviado!
                      </>
                    ) : 'Enviar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        </>
        ) : (
        <>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {templates.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-8 px-4">
                Nenhum template ainda.<br />
                <a href="/templates" className="text-violet-400 hover:underline">Criar agora →</a>
              </div>
            ) : templates.map(t => (
              <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors">
                <p className="text-xs font-semibold text-zinc-200 mb-1 truncate">{t.nome}</p>
                <p className="text-[11px] text-zinc-500 line-clamp-2 whitespace-pre-wrap mb-2">{t.content}</p>
                <button
                  onClick={() => { setReplyText(t.content); showToast('Texto inserido — edite e envie.') }}
                  disabled={!selectedConversa}
                  className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Inserir no chat
                </button>
              </div>
            ))}
          </div>
        </>
        )}
      </div>
    </div>
  )
}

export default function ConversasPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Carregando…</div>}>
      <ConversasContent />
    </Suspense>
  )
}
