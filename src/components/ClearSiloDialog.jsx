import { useState } from 'react'

export const FRASE_CONFIRMACAO = 'EU DESEJO APAGAR TODOS OS DADOS DESTE SILO'

export default function ClearSiloDialog({ silo, total, onClose, onConfirm }) {
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ok = texto.trim() === FRASE_CONFIRMACAO

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
          <h2>Excluir todos os dados do Silo {silo}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar" disabled={busy}>
            ✕
          </button>
        </div>
        <div className="alert error static">
          Isso apaga <b>{total} NF(s)</b> do Silo {silo} (pendentes e concluídas, de todas as datas) para todos os
          usuários. <b>Não dá para desfazer.</b>
        </div>
        <label className="confirm-label">
          Para confirmar, digite: <b className="mono">{FRASE_CONFIRMACAO}</b>
          <input
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            placeholder={FRASE_CONFIRMACAO}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-foot">
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn danger" disabled={!ok || busy}>
            {busy ? 'Apagando…' : 'Apagar tudo'}
          </button>
        </div>
      </form>
    </div>
  )
}
