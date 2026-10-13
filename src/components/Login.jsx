import { useState } from 'react'
import { isLocalMode } from '../lib/store.js'

const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

// "  isaque   SOUZA " -> "Isaque Souza" (evita o mesmo nome escrito de jeitos diferentes)
export function padronizarNome(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .map((p, i) => {
      const w = p.toLocaleLowerCase('pt-BR')
      return i > 0 && MINUSCULAS.has(w) ? w : w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1)
    })
    .join(' ')
}

export default function Login({ initialName, notice, onLogin }) {
  // Com nome lembrado, só pede a senha; "Não é você?" libera o campo para outro nome.
  const [lembrado, setLembrado] = useState(!!initialName)
  const [nome, setNome] = useState(initialName || '')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(padronizarNome(nome), senha)
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

        {notice && <div className="alert warn notice">{notice}</div>}

        <form className="login-form" onSubmit={submit}>
          {lembrado ? (
            <div className="who-chip">
              <div className="avatar">{nome[0].toUpperCase()}</div>
              <div>
                <div className="muted">Entrando como</div>
                <b>{nome}</b>
              </div>
              <button
                type="button"
                className="link dark"
                onClick={() => {
                  setLembrado(false)
                  setNome('')
                }}
              >
                Não é você?
              </button>
            </div>
          ) : (
            <label>
              Nome
              <input
                required
                autoFocus
                autoComplete="name"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
          )}
          <label>
            Senha
            <input
              type="password"
              required={!isLocalMode}
              autoFocus={lembrado}
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
