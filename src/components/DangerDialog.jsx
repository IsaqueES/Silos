import { useState } from 'react'

// Confirmação para exclusões em massa: só libera depois de digitar a frase exata (colar é bloqueado).
export default function DangerDialog({ title, children, phrase, confirmLabel = 'Apagar tudo', onClose, onConfirm }) {
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ok = texto.trim() === phrase

  const submit = async (e) => {
    e.preventDefault()
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={busy ? undefined : onClose}>
      <form className="modal narrow-modal danger-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar" disabled={busy}>
            ✕
          </button>
        </div>
        <div className="alert error static">{children}</div>
        <label className="confirm-label">
          Para confirmar, digite: <b className="mono">{phrase}</b>
          <input
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            placeholder={phrase}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-foot">
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn danger" disabled={!ok || busy}>
            {busy ? 'Apagando…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
