import { useState } from 'react'
import { isLocalMode, supabase } from '../lib/store.js'

// Login Microsoft (Azure) só aparece se VITE_LOGIN_MICROSOFT=true no build.
const microsoftEnabled = import.meta.env.VITE_LOGIN_MICROSOFT === 'true'
const redirectTo = () => window.location.origin + window.location.pathname

export default function Login({ onLocalLogin }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    })
    setBusy(false)
    if (error) setError(traduz(error.message))
    else setSent(true)
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(traduz(error.message))
    // sucesso: o onAuthStateChange do App assume daqui
  }

  const microsoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { scopes: 'email', redirectTo: redirectTo() },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">🌾</div>
        <h1>Controle de Silos</h1>
        <p className="muted">Romaneios e NFs por silo</p>

        {isLocalMode ? (
          <>
            <button className="btn ms" onClick={onLocalLogin}>
              Entrar em modo local
            </button>
            <p className="hint">
              O Supabase ainda não foi configurado, então os dados ficam salvos só neste navegador. Veja o README.
            </p>
          </>
        ) : !sent ? (
          <form className="login-form" onSubmit={sendCode}>
            <label>
              E-mail
              <input
                type="email"
                required
                autoFocus
                placeholder="seu.nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="btn ms" disabled={busy || !email}>
              {busy ? 'Enviando…' : 'Enviar link de acesso'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={verify}>
            <p className="hint">
              Enviamos um e-mail para <b>{email}</b>. <b>Clique no link</b> do e-mail ou, se ele trouxer um código,
              digite abaixo. Confira também o lixo eletrônico.
            </p>
            <label>
              Código
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                placeholder="000000"
                className="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <button className="btn ms" disabled={busy || code.length < 6}>
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
            <button
              type="button"
              className="link dark"
              onClick={() => {
                setSent(false)
                setCode('')
                setError('')
              }}
            >
              Usar outro e-mail / reenviar código
            </button>
          </form>
        )}

        {!isLocalMode && microsoftEnabled && (
          <>
            <div className="divider">ou</div>
            <button className="btn ghost" onClick={microsoft}>
              <MicrosoftIcon /> Entrar com Microsoft
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}

function traduz(msg) {
  if (/rate limit|security purposes/i.test(msg)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  if (/expired|invalid/i.test(msg)) return 'Código inválido ou expirado. Peça um novo código.'
  return msg
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
