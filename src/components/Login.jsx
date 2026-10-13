import { isLocalMode } from '../lib/store.js'

export default function Login({ onLogin, error }) {
  return (
    <div className="login">
      <div className="login-card">
        <div className="logo">🌾</div>
        <h1>Controle de Silos</h1>
        <p className="muted">Romaneios e NFs por silo</p>
        <button className="btn ms" onClick={onLogin}>
          {isLocalMode ? (
            'Entrar em modo local'
          ) : (
            <>
              <MicrosoftIcon /> Entrar com Microsoft
            </>
          )}
        </button>
        {isLocalMode && (
          <p className="hint">
            O Supabase ainda não foi configurado, então os dados ficam salvos só neste navegador. Veja o README para
            ativar o login Microsoft e o banco compartilhado.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
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
