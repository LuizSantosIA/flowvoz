'use client'

import { useEffect, useState } from 'react'

interface Audio {
  id: number
  nome: string
  filename: string
  audio_url?: string
  ordem?: number
  enviados_hoje?: number
}

const MOCK_AUDIOS: Audio[] = [
  { id:  1, nome: 'Saudação inicial',           filename: 'audio-01.ogg' },
  { id:  2, nome: 'Como funciona — 60 dias',    filename: 'audio-02.ogg' },
  { id:  3, nome: 'Moradia — casa ou aluguel',  filename: 'audio-03.ogg' },
  { id:  4, nome: 'Sem investimento inicial',   filename: 'audio-04.ogg' },
  { id:  5, nome: 'Encaminhando pro vendedor',  filename: 'audio-05.ogg' },
  { id:  6, nome: 'Solicitar endereço',         filename: 'audio-06.ogg' },
  { id:  7, nome: 'Já é revendedora',           filename: 'audio-07.ogg' },
  { id:  8, nome: 'Solicitar renda',            filename: 'audio-08.ogg' },
  { id:  9, nome: 'Dúvida sobre comissão',      filename: 'audio-09.ogg' },
  { id: 10, nome: 'Somos de Minas',             filename: 'audio-10.ogg' },
  { id: 11, nome: 'Sem fotos/tabela de preços', filename: 'audio-11.ogg' },
  { id: 12, nome: 'Como funciona — 90 dias',    filename: 'audio-12.ogg' },
]

export default function AudiosPage() {
  const [audios, setAudios] = useState<Audio[]>(MOCK_AUDIOS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audios')
      .then(r => r.json())
      .then((data: Audio[]) => {
        if (Array.isArray(data) && data.length > 0) setAudios(data)
        setLoading(false)
      })
      .catch(() => { setAudios(MOCK_AUDIOS); setLoading(false) })
  }, [])

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Áudios Rápidos
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          {loading ? 'Carregando…' : `${audios.length} áudio(s) disponível(is)`}
        </p>
      </div>

      {/* Grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {audios.map(audio => (
          <div key={audio.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
            {/* Order */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">
                {String(audio.ordem ?? audio.id).padStart(2, '0')}
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

            {/* Nome */}
            <p className="text-sm font-semibold text-zinc-100 text-center truncate">{audio.nome}</p>

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
              <span className="truncate">{audio.filename}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
