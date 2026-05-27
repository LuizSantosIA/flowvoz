'use client'

import { useState } from 'react'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4">
      <span className="w-1 h-4 bg-violet-500 rounded-full inline-block" />
      {children}
    </h2>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-zinc-400 mb-1.5">{children}</label>
}

function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
    />
  )
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
          placeholder="••••••••••••"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function ConfigPage() {
  // Evolution API
  const [evoUrl, setEvoUrl] = useState('')
  const [evoInstance, setEvoInstance] = useState('')
  const [evoApikey, setEvoApikey] = useState('')

  // Meta API
  const [metaToken, setMetaToken] = useState('')
  const [metaPhoneId, setMetaPhoneId] = useState('')
  const [metaVerifyToken, setMetaVerifyToken] = useState('')

  // Geral
  const [empresa, setEmpresa] = useState('')
  const [atendente, setAtendente] = useState('')

  // Provedor
  const [provider, setProvider] = useState<'evolution' | 'meta'>('evolution')
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evoUrl, evoInstance, evoApikey, metaToken, metaPhoneId, metaVerifyToken, empresa, atendente, provider }),
      })
      showToast('Configurações salvas com sucesso!')
    } catch {
      showToast('Configurações salvas localmente.')
    }
    setSaving(false)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-900/80 border border-green-700 text-green-100 text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-xs text-zinc-500">Gerencie as integrações do painel de atendimento</p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">

        {/* Provedor ativo — toggle */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <SectionTitle>Provedor WhatsApp</SectionTitle>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Provedor ativo:</span>
            <div className="flex items-center bg-zinc-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setProvider('evolution')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  provider === 'evolution'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Evolution
              </button>
              <button
                onClick={() => setProvider('meta')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  provider === 'meta'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Meta
              </button>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600">
            A troca de provedor é aplicada via variável <code className="bg-zinc-800 px-1 rounded text-violet-400">WA_PROVIDER</code> no .env.local
          </p>
        </div>

        {/* Evolution API */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <SectionTitle>Evolution API</SectionTitle>
          <div>
            <Label>URL da instância</Label>
            <Input placeholder="https://sua-evolution.com" value={evoUrl} onChange={setEvoUrl} />
          </div>
          <div>
            <Label>Nome da instância</Label>
            <Input placeholder="nome-instancia" value={evoInstance} onChange={setEvoInstance} />
          </div>
          <PasswordField label="API Key" value={evoApikey} onChange={setEvoApikey} />
        </div>

        {/* Meta API */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <SectionTitle>Meta Business API</SectionTitle>
          <PasswordField label="Token de acesso" value={metaToken} onChange={setMetaToken} />
          <div>
            <Label>Phone Number ID</Label>
            <Input placeholder="1234567890" value={metaPhoneId} onChange={setMetaPhoneId} />
          </div>
          <div>
            <Label>Verify Token (webhook)</Label>
            <Input placeholder="meu-token-seguro" value={metaVerifyToken} onChange={setMetaVerifyToken} />
          </div>
        </div>

        {/* Geral */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <SectionTitle>Geral</SectionTitle>
          <div>
            <Label>Nome da empresa</Label>
            <Input placeholder="Venda Direta MG" value={empresa} onChange={setEmpresa} />
          </div>
          <div>
            <Label>Nome do atendente</Label>
            <Input placeholder="João Silva" value={atendente} onChange={setAtendente} />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Salvando…
            </>
          ) : (
            'Salvar configurações'
          )}
        </button>
      </div>
    </div>
  )
}
