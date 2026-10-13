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
  // Erro devolvido pelo link do e-mail (ex.: link expirado) vem no hash da URL
  const [error, setError] = useState(() => {
    const desc = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
    return desc ? erroDoLink(desc) : ''
  })

  const sendCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    })
    setBusy(false)
    if (error) setError(erroDoEnvio(error))
    else setSent(true)
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(erroDoCodigo(error.message))
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

function erroDoEnvio(error) {
  const msg = error.message || ''
  if (/rate limit|security purposes/i.test(msg) || error.status === 429)
    return 'Limite de e-mails atingido. Aguarde alguns minutos (o servidor grátis do Supabase envia poucos e-mails por hora).'
  if (/not authorized|invalid/i.test(msg))
    return `O Supabase recusou enviar para este e-mail: "${msg}". O servidor de e-mail padrão só envia para membros da organização no Supabase — veja o README.`
  return `Não foi possível enviar o e-mail: ${msg}`
}

function erroDoCodigo(msg) {
  if (/expired|invalid/i.test(msg)) return 'Código inválido ou expirado. Peça um novo código.'
  return msg
}

function erroDoLink(desc) {
  if (/expired|invalid/i.test(desc))
    return 'O link de acesso é inválido ou expirou (às vezes o antivírus do e-mail abre o link antes de você). Peça um novo.'
  return desc
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
