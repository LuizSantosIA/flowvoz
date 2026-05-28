'use client'

import { useEffect, useState } from 'react'

interface User {
  id: number
  nome: string
  email: string
  role: 'admin' | 'atendente' | string
  ativo: boolean
  criado_em: string
  ultimo_login: string | null
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'atendente'>('atendente')

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500) }

  function load() {
    fetch('/api/users').then(async r => {
      if (r.status === 403) { setForbidden(true); setLoading(false); return }
      const data = await r.json(); if (Array.isArray(data)) setUsers(data); setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setNome(''); setEmail(''); setPassword(''); setRole('atendente'); setShowModal(true) }
  function openEdit(u: User) { setEditing(u); setNome(u.nome); setEmail(u.email); setPassword(''); setRole(u.role === 'admin' ? 'admin' : 'atendente'); setShowModal(true) }

  async function save() {
    if (!nome.trim() || !email.trim()) { showToast('Nome e email obrigatórios.'); return }
    if (!editing && !password) { showToast('Senha obrigatória.'); return }
    try {
      const body = editing
        ? { id: editing.id, nome, role, ...(password ? { password } : {}) }
        : { nome, email, password, role }
      const method = editing ? 'PATCH' : 'POST'
      const r = await fetch('/api/users', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) {
        const d = await r.json().catch(() => ({})); showToast(d.error || 'Falha ao salvar.'); return
      }
      setShowModal(false); load(); showToast(editing ? 'Atualizado!' : 'Criado!')
    } catch { showToast('Falha de rede.') }
  }

  async function toggle(u: User) {
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, ativo: !u.ativo }) })
    load()
  }
  async function remove(u: User) {
    if (!confirm(`Excluir usuário ${u.email}?`)) return
    await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' }); load(); showToast('Removido.')
  }

  if (forbidden) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b]">
        <div className="text-center text-zinc-500 text-sm max-w-md px-4">
          <p className="text-lg text-zinc-300 mb-2">Acesso restrito</p>
          <p>Apenas usuários com papel <strong>admin</strong> podem gerenciar usuários.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      {toast && <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl">{toast}</div>}

      <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Usuários
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{users.length} usuário(s) — Admin acessa tudo; Atendente só vê Painel e Conversas.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Novo usuário
        </button>
      </div>

      <div className="p-6 max-w-5xl pb-20 md:pb-6">
        {loading ? (
          <div className="text-center text-zinc-600 text-sm py-12">Carregando…</div>
        ) : users.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12 border border-dashed border-zinc-800 rounded-2xl">
            Nenhum usuário cadastrado. Clique em <strong>Novo usuário</strong>.<br />
            <span className="text-[11px]">Enquanto a tabela estiver vazia, o login com <code>PANEL_PASSWORD</code> continua funcionando.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className={`bg-zinc-900 border rounded-2xl p-4 flex items-center gap-4 ${u.ativo ? 'border-zinc-800' : 'border-zinc-800 opacity-60'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{u.nome}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40'}`}>{u.role === 'admin' ? 'Admin' : 'Atendente'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Último login: {u.ultimo_login || 'nunca'} · Criado: {u.criado_em}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggle(u)} title={u.ativo ? 'Desativar' : 'Ativar'}
                    className={`relative w-10 rounded-full transition-colors ${u.ativo ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                    style={{ height: 22 }}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${u.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => openEdit(u)} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs rounded-lg">Editar</button>
                  <button onClick={() => remove(u)} className="px-2 py-1.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-800/50 text-zinc-500 hover:text-red-400 text-xs rounded-lg">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">{editing ? 'Editar usuário' : 'Novo usuário'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus className="w-full px-3 py-2.5 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-600" />
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" disabled={!!editing} className="w-full px-3 py-2.5 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-600 disabled:opacity-60" />
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{editing ? 'Nova senha (deixe em branco para manter)' : 'Senha (mín. 6)'}</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full px-3 py-2.5 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-600" />
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Papel</label>
            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'atendente')} className="w-full px-3 py-2.5 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-600">
              <option value="atendente">Atendente — só Painel e Conversas</option>
              <option value="admin">Admin (cliente) — acessa tudo</option>
            </select>
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
