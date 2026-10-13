import { useState } from 'react'

export default function PasswordDialog({ onClose, onSave, onDone }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (senha !== confirma) return setError('As senhas não conferem.')
    if (senha.length < 6) return setError('Use pelo menos 6 caracteres.')
    setBusy(true)
    setError('')
    try {
      await onSave(senha)
      onDone('Senha geral alterada. Avise a equipe da nova senha.')
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="modal narrow-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>Alterar senha geral</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <p className="muted">
          A nova senha vale para todo mundo. Quem já está conectado continua conectado; nos próximos logins será pedida
          a senha nova.
        </p>
        <div className="form-grid one">
          <label>
            Nova senha
            <input type="password" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          <label>
            Confirmar nova senha
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-foot">
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || !senha}>
            {busy ? 'Salvando…' : 'Salvar senha'}
          </button>
        </div>
      </form>
    </div>
  )
}
