import { useState } from 'react'

// Meta de itens do silo: define quantas NFs se deseja lançar e mostra a porcentagem (lançadas ÷ meta).
export default function MetaCard({ silo, st, onSave }) {
  const { meta } = st
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState('')
  const [busy, setBusy] = useState(false)

  const open = () => {
    setValor(meta ?? '')
    setEditing(true)
  }
  const save = async (v) => {
    setBusy(true)
    try {
      await onSave(silo, v)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }
  const submit = (e) => {
    e.preventDefault()
    if (Number(valor) >= 1) save(valor)
  }

  const showForm = editing || !meta
  const over = meta && st.done > meta
  const reached = meta && st.done >= meta

  return (
    <section className="meta-card">
      <div className="meta-head">
        <b>Meta de itens do Silo {silo}</b>
        {meta && !editing && (
          <button className="link-btn" onClick={open}>
            Editar meta
          </button>
        )}
      </div>

      {showForm ? (
        <form className="meta-form" onSubmit={submit}>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Ex.: 30"
            value={valor}
            autoFocus={editing}
            onChange={(e) => setValor(e.target.value)}
          />
          <span className="muted">itens a lançar neste silo</span>
          <div className="spacer" />
          {meta && (
            <>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button type="button" className="btn danger-ghost" disabled={busy} onClick={() => save(null)}>
                Remover meta
              </button>
            </>
          )}
          <button className="btn primary" disabled={busy || !(Number(valor) >= 1)}>
            Salvar meta
          </button>
        </form>
      ) : (
        <div className="meta-body">
          <div className="meta-pct">{st.pct}%</div>
          <div className="meta-info">
            <div className="bar big">
              <span className={reached ? 'full' : ''} style={{ width: `${Math.min(100, st.pct)}%` }} />
            </div>
            <div className="muted">
              <b>{st.done}</b> de <b>{meta}</b> itens lançados ·{' '}
              {over
                ? `meta superada em ${st.done - meta}`
                : reached
                  ? 'meta atingida ✓'
                  : `faltam ${st.missing}`}
              {st.total !== meta && <> · {st.total} NF(s) cadastradas</>}
            </div>
          </div>
        </div>
      )}
      {!meta && <p className="muted meta-hint">Defina uma meta para acompanhar a porcentagem lançada (ex.: meta 30 e 15 lançadas = 50%).</p>}
    </section>
  )
}
