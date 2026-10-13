import { useState } from 'react'
import { isLocalMode } from '../lib/store.js'

export default function Login({ initialName, onLogin }) {
  const [nome, setNome] = useState(initialName || '')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(nome.trim(), senha)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">🌾</div>
        <h1>Controle de Silos</h1>
        <p className="muted">Romaneios e NFs por silo</p>

        <form className="login-form" onSubmit={submit}>
          <label>
            Nome
            <input
              required
              autoFocus={!initialName}
              autoComplete="name"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required={!isLocalMode}
              autoFocus={!!initialName}
              autoComplete="current-password"
              placeholder={isLocalMode ? 'Modo local: qualquer senha' : 'Senha geral'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
          <button className="btn ms" disabled={busy || !nome.trim()}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {isLocalMode && (
          <p className="hint">Supabase não configurado: os dados ficam salvos só neste navegador. Veja o README.</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
