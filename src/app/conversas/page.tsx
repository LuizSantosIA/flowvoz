'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type ConversaStatus = 'novo' | 'andamento' | 'encerrado'

interface ConversaItem {
  session_id: string
  inbox: string | null
  inbox_nome: string
  inbox_cor: string
  nome: string
  ultima_msg: string
  hora: string
  status: ConversaStatus
}

interface Message {
  id: string
  direction: 'in' | 'out'
  content: string
  tipo: 'text' | 'audio'
  hora: string
}

interface Audio {
  id: number
  nome: string
  filename: string
  audio_url?: string
}

interface Inbox {
  key: string
  nome: string
  provider: string
  cor: string
  ordem: number
}

const STATUS_COLORS: Record<ConversaStatus, string> = {
  novo:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  andamento: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  encerrado: 'bg-zinc-700/40 text-zinc-500 border-zinc-600/30',
}

const STATUS_LABELS: Record<ConversaStatus, string> = {
  novo:      'Novo',
  andamento: 'Em andamento',
  encerrado: 'Encerrado',
}

// Cores das etiquetas de número (classes estáticas p/ Tailwind)
const INBOX_COLORS: Record<string, string> = {
  violet:  'bg-violet-500/20 text-violet-300 border-violet-500/40',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  blue:    'bg-blue-500/20 text-blue-300 border-blue-500/40',
  amber:   'bg-amber-500/20 text-amber-300 border-amber-500/40',
  rose:    'bg-rose-500/20 text-rose-300 border-rose-500/40',
  zinc:    'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
}
function inboxColor(cor?: string) {
  return INBOX_COLORS[cor ?? 'zinc'] ?? INBOX_COLORS.zinc
}

const MOCK_CONVERSAS: ConversaItem[] = [
  { session_id: '5531991234567', inbox: 'num1', inbox_nome: 'Número 1', inbox_cor: 'violet',  nome: 'Maria Santos',   ultima_msg: 'Oi, quero saber mais', hora: '10:32', status: 'novo' },
  { session_id: '5531998765432', inbox: 'num1', inbox_nome: 'Número 1', inbox_cor: 'violet',  nome: 'Ana Lima',        ultima_msg: 'Qual o valor?',         hora: '10:18', status: 'andamento' },
  { session_id: '5531987654321', inbox: 'num2', inbox_nome: 'Número 2', inbox_cor: 'emerald', nome: 'Josefa Oliveira', ultima_msg: 'Tá bom obrigada',       hora: '09:47', status: 'encerrado' },
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
  return sessionId
}

function convKey(c: { inbox: string | null; session_id: string }) {
  return `${c.inbox ?? '-'}:${c.session_id}`
}

function StatusBadge({ status }: { status: ConversaStatus }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
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

  const [conversas, setConversas] = useState<ConversaItem[]>(MOCK_CONVERSAS)
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [selectedInbox, setSelectedInbox] = useState<string>('todos')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState<ConversaStatus | 'todos'>('todos')
  const [statusMap, setStatusMap] = useState<Record<string, ConversaStatus>>({})
  const [audios, setAudios] = useState<Audio[]>(MOCK_AUDIOS)
  const [audioSearch, setAudioSearch] = useState('')
  const [sendingAudio, setSendingAudio] = useState<number | null>(null)
  const [sentAudio, setSentAudio] = useState<number | null>(null)
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/inboxes')
      .then(r => r.json())
      .then((data: Inbox[]) => { if (Array.isArray(data)) setInboxes(data) })
      .catch(() => { /* silencioso */ })
  }, [])

  useEffect(() => {
    fetch('/api/conversas')
      .then(r => r.json())
      .then((data: ConversaItem[]) => {
        setConversas(data)
        const map: Record<string, ConversaStatus> = {}
        data.forEach(c => { map[convKey(c)] = c.status ?? 'novo' })
        setStatusMap(map)
        if (initialSession && !selectedKey) {
          const match = data.find(c => c.session_id === initialSession)
          if (match) setSelectedKey(convKey(match))
        }
      })
      .catch(() => setConversas(MOCK_CONVERSAS))
  }, [initialSession]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/audios')
      .then(r => r.json())
      .then((data: Audio[]) => { if (Array.isArray(data) && data.length) setAudios(data) })
      .catch(() => setAudios(MOCK_AUDIOS))
  }, [])

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
  }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function assumeChat() {
    if (!selectedConversa) return
    try {
      await fetch('/api/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id }),
      })
    } catch { /* silencioso */ }
    setStatusMap(prev => ({ ...prev, [selectedKey!]: 'andamento' }))
    showToast('Atendimento assumido!')
  }

  async function encerrarChat() {
    if (!selectedConversa) return
    setStatusMap(prev => ({ ...prev, [selectedKey!]: 'encerrado' }))
    try {
      await fetch('/api/conversas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id, status: 'encerrado' }),
      })
    } catch { /* silencioso */ }
    showToast('Conversa encerrada.')
  }

  async function sendText() {
    if (!replyText.trim() || !selectedConversa) return
    setSendingMsg(true)
    const text = replyText.trim()
    setReplyText('')
    setMessages(prev => [...prev, { id: Date.now().toString(), direction: 'out', content: text, tipo: 'text', hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }])
    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox, tipo: 'text', content: text }),
      })
    } catch { /* silencioso */ }
    setSendingMsg(false)
  }

  async function sendAudio(audio: Audio) {
    if (!selectedConversa) { showToast('Selecione uma conversa primeiro'); return }
    setSendingAudio(audio.id)
    const audioUrl = audio.audio_url || `/audios/${audio.filename}`
    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedConversa.session_id, inbox: selectedConversa.inbox, tipo: 'audio', audio_url: audioUrl }),
      })
      setMessages(prev => [...prev, { id: Date.now().toString(), direction: 'out', content: audio.nome, tipo: 'audio', hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }])
      setSentAudio(audio.id)
      setTimeout(() => setSentAudio(null), 2000)
    } catch {
      showToast('Erro ao enviar áudio')
    }
    setSendingAudio(null)
  }

  function playAudio(audio: Audio) {
    const el = audioRefs.current[audio.id]
    if (el) { el.currentTime = 0; el.play() }
  }

  const currentStatus: ConversaStatus = selectedKey ? (statusMap[selectedKey] ?? 'novo') : 'novo'

  // 1º filtra por número, 2º por status
  const byInbox = selectedInbox === 'todos'
    ? conversas
    : conversas.filter(c => c.inbox === selectedInbox)

  const filteredConversas = activeTab === 'todos'
    ? byInbox
    : byInbox.filter(c => (statusMap[convKey(c)] ?? c.status) === activeTab)

  const tabCounts = {
    todos:     byInbox.length,
    novo:      byInbox.filter(c => (statusMap[convKey(c)] ?? c.status) === 'novo').length,
    andamento: byInbox.filter(c => (statusMap[convKey(c)] ?? c.status) === 'andamento').length,
    encerrado: byInbox.filter(c => (statusMap[convKey(c)] ?? c.status) === 'encerrado').length,
  }

  const filteredAudios = audios.filter(a => a.nome.toLowerCase().includes(audioSearch.toLowerCase()))

  const tabs: { key: ConversaStatus | 'todos'; label: string }[] = [
    { key: 'todos',     label: 'Todos' },
    { key: 'novo',      label: 'Novos' },
    { key: 'andamento', label: 'Em andamento' },
    { key: 'encerrado', label: 'Encerrados' },
  ]

  const showInboxTag = selectedInbox === 'todos' && inboxes.length > 1

  return (
    <div className="flex-1 flex overflow-hidden h-full bg-[#09090b]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Coluna esquerda: Lista de conversas ── */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Seletor de número */}
        {inboxes.length > 1 && (
          <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedInbox('todos')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedInbox === 'todos' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos
            </button>
            {inboxes.map(ib => (
              <button
                key={ib.key}
                onClick={() => setSelectedInbox(ib.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  selectedInbox === ib.key ? inboxColor(ib.cor) : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                {ib.nome}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-white">Conversas</h1>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{byInbox.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${
                    activeTab === tab.key ? 'bg-violet-500 text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversas.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">Nenhuma conversa</div>
          ) : filteredConversas.map(conv => {
            const k = convKey(conv)
            const convStatus = (statusMap[k] ?? conv.status ?? 'novo') as ConversaStatus
            const isSelected = selectedKey === k
            const inicial = conv.nome.charAt(0).toUpperCase()
            return (
              <button
                key={k}
                onClick={() => setSelectedKey(k)}
                className={`w-full text-left px-4 py-3.5 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${
                  isSelected ? 'bg-violet-900/20 border-l-2 border-l-violet-500' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-violet-800/40 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-zinc-200 truncate">{conv.nome}</span>
                      <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-1">{conv.hora}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">{conv.ultima_msg}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <StatusBadge status={convStatus} />
                      {showInboxTag && <InboxBadge nome={conv.inbox_nome} cor={conv.inbox_cor} />}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Coluna central: Chat ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
                <div className="w-9 h-9 rounded-full bg-violet-800/40 flex items-center justify-center text-xs font-bold text-violet-300">
                  {selectedConversa.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{selectedConversa.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-500">{formatPhone(selectedConversa.session_id)}</span>
                    <StatusBadge status={currentStatus} />
                    {inboxes.length > 1 && <InboxBadge nome={selectedConversa.inbox_nome} cor={selectedConversa.inbox_cor} />}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentStatus !== 'andamento' && currentStatus !== 'encerrado' && (
                  <button onClick={assumeChat} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    Assumir
                  </button>
                )}
                {currentStatus !== 'encerrado' && (
                  <button onClick={encerrarChat} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors">
                    Encerrar
                  </button>
                )}
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
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-violet-700/60' : 'bg-zinc-700'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M9 18V5l12-2v13" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="16" r="3" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-medium">{msg.content}</p>
                            <p className={`text-[10px] mt-0.5 ${isOut ? 'text-violet-400/70' : 'text-zinc-500'}`}>Áudio</p>
                          </div>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isOut ? 'text-violet-400/70 text-right' : 'text-zinc-600'}`}>{msg.hora}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite uma mensagem…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                />
                <button
                  onClick={sendText}
                  disabled={sendingMsg || !replyText.trim()}
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
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Coluna direita: Painel de Áudios ── */}
      <div className="w-72 flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-900/50">
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <h2 className="text-sm font-bold text-white">Áudios Rápidos</h2>
          </div>
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
                <audio ref={el => { audioRefs.current[audio.id] = el }} src={audio.audio_url || `/audios/${audio.filename}`} preload="none" className="hidden" />
                <div className="flex gap-1.5">
                  <button onClick={() => playAudio(audio)} title="Ouvir prévia" className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
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
