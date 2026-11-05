import { useState } from 'react'

export default function AddSiloDialog({ silos, onClose, onAdd }) {
  const next = String(Math.max(0, ...silos.map(Number)) + 1)
  const [valor, setValor] = useState(next)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onAdd(valor)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={busy ? undefined : onClose}>
      <form className="modal narrow-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>Adicionar silo</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar" disabled={busy}>
            ✕
          </button>
        </div>
        <label className="confirm-label">
          Número do novo silo
          <input
            type="number"
            min="1"
            max="999"
            step="1"
            inputMode="numeric"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </label>
        <p className="muted">
          Silos atuais: {silos.length ? silos.join(', ') : 'nenhum'}. NFs que já estão com esse número de silo na
          planilha passam a aparecer nele.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="modal-foot">
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || !valor}>
            {busy ? 'Adicionando…' : 'Adicionar silo'}
          </button>
        </div>
      </form>
    </div>
  )
}
