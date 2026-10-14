import { useState } from 'react'
import { SILOS } from '../lib/stats.js'
import { formatDate, normalizeNf, parseDate } from '../lib/csv.js'

const today = () => new Date().toISOString().slice(0, 10)

// Formulário para incluir uma NF pelo site (ou editar/excluir uma existente).
export default function NfForm({ row, defaultSilo, onClose, onSave, onDelete }) {
  const editing = !!row
  const [f, setF] = useState(() => ({
    nf: row?.nf ?? '',
    nor: row?.nor ?? '',
    qtd: row?.qtd ?? '',
    dep: row?.dep ?? '',
    // silo inválido (ex.: "10" vindo do CSV) obriga a escolher um silo de 1 a 9
    silo: row ? (SILOS.includes(row.silo) ? row.silo : '') : defaultSilo || '1',
    lote: row?.lote ?? '',
    material: row?.material ?? '',
    dtv: row ? (row.dtv_date ?? parseDate(row.dtv) ?? '') : today(),
    concluida: row?.concluida ?? false,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [another, setAnother] = useState(false)

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const num = (v) => (v === '' || v == null ? null : Number(v))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave({
        nf: normalizeNf(f.nf),
        nor: num(f.nor),
        qtd: num(f.qtd),
        dep: f.dep.trim(),
        silo: f.silo,
        lote: f.lote.trim(),
        material: String(f.material).trim(),
        dtv: formatDate(f.dtv),
        dtv_date: f.dtv || null,
        concluida: f.concluida,
      })
      if (!editing && another) {
        // mantém silo, depósito, lote, material e data para agilizar a próxima
        setF((s) => ({ ...s, nf: '', nor: '', qtd: '', concluida: false }))
        setBusy(false)
        document.getElementById('nf-input')?.focus()
      } else onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Excluir a NF ${row.nf} (lote ${row.lote || '—'})?`)) return
    setBusy(true)
    try {
      await onDelete(row)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="modal wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>{editing ? `Editar NF ${row.nf}` : 'Nova NF'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="form-grid">
          <label>
            NF *
            <input id="nf-input" required autoFocus value={f.nf} onChange={set('nf')} />
          </label>
          <label>
            NOR
            <input type="number" step="any" value={f.nor} onChange={set('nor')} />
          </label>
          <label>
            QTD
            <input type="number" step="any" value={f.qtd} onChange={set('qtd')} />
          </label>
          <label>
            DEP
            <input value={f.dep} onChange={set('dep')} />
          </label>
          <label>
            SILO *
            <select required value={f.silo} onChange={set('silo')}>
              {!f.silo && (
                <option value="" disabled>
                  {row?.silo ? `Inválido (${row.silo}) — escolha` : 'Escolha'}
                </option>
              )}
              {SILOS.map((s) => (
                <option key={s} value={s}>
                  Silo {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            LOTE
            <input value={f.lote} onChange={set('lote')} />
          </label>
          <label>
            MATERIAL
            <input inputMode="numeric" value={f.material} onChange={set('material')} />
          </label>
          <label>
            DTV
            <input type="date" value={f.dtv} onChange={set('dtv')} />
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={f.concluida} onChange={set('concluida')} />
          Já lançada no SAP (OK)
        </label>

        {editing && (
          <p className="muted">
            Adicionado por <b>{row.adicionado_por || '—'}</b>
            {row.concluida && (
              <>
                {' '}
                · Lançado por <b>{row.lancado_por || row.concluida_por || '—'}</b>
              </>
            )}
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-foot">
          {editing ? (
            <button type="button" className="btn danger-ghost" onClick={remove} disabled={busy}>
              Excluir NF
            </button>
          ) : (
            <label className="check">
              <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} />
              Adicionar outra em seguida
            </label>
          )}
          <div className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || !f.nf.trim()}>
            {busy ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar NF'}
          </button>
        </div>
      </form>
    </div>
  )
}
