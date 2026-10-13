import { useState } from 'react'
import { parseCsv, readFileText } from '../lib/csv.js'

const MODES = {
  base: {
    title: 'Base de NFs (pendentes)',
    desc: 'Todas as NFs do período. Entram como "não concluídas". NFs que já existem não são alteradas.',
  },
  lancadas: {
    title: 'NFs lançadas no SAP (concluir)',
    desc: 'As NFs deste arquivo ficam marcadas como OK. Se alguma não existir na base, ela é criada já concluída.',
  },
}

export default function ImportDialog({ onClose, onImportBase, onImportLancadas, onClearAll, onDone, totalRows }) {
  const [mode, setMode] = useState('lancadas')
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (file) => {
    if (!file) return
    setError('')
    setFileName(file.name)
    try {
      setParsed(parseCsv(await readFileText(file)))
    } catch (e) {
      setError(e.message)
    }
  }

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const msg = await (mode === 'base' ? onImportBase : onImportLancadas)(parsed.rows)
      onDone(msg)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    if (!confirm(`Apagar TODOS os ${totalRows} itens? Isso não pode ser desfeito.`)) return
    setBusy(true)
    try {
      await onClearAll()
      onDone('Todos os dados foram apagados.')
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Importar CSV</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="mode-pick">
          {Object.entries(MODES).map(([k, m]) => (
            <label key={k} className={`mode ${mode === k ? 'active' : ''}`}>
              <input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} />
              <div>
                <div className="mode-title">{m.title}</div>
                <div className="muted">{m.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <label
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFile(e.dataTransfer.files[0])
          }}
        >
          <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files[0])} hidden />
          {fileName ? <b>{fileName}</b> : 'Arraste o arquivo .csv aqui ou clique para escolher'}
          <div className="muted">Colunas: NF; NOR; QTD; DEP; SILO; LOTE; MATERIAL; DTV</div>
        </label>

        {parsed && (
          <div className="preview">
            <div>
              <b>{parsed.rows.length}</b> linha(s) válidas · <b>{new Set(parsed.rows.map((r) => r.nf)).size}</b> NF(s)
              distintas
              {!parsed.hasHeader && parsed.rows.length > 0 && ' · sem cabeçalho (usando a ordem padrão)'}
            </div>
            {parsed.errors.length > 0 && (
              <ul className="warn-list">
                {parsed.errors.slice(0, 5).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {parsed.errors.length > 5 && <li>… e mais {parsed.errors.length - 5}</li>}
              </ul>
            )}
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>NF</th>
                    <th>NOR</th>
                    <th>QTD</th>
                    <th>DEP</th>
                    <th>SILO</th>
                    <th>LOTE</th>
                    <th>MATERIAL</th>
                    <th>DTV</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>{r.nf}</td>
                      <td>{r.nor}</td>
                      <td>{r.qtd}</td>
                      <td>{r.dep}</td>
                      <td>{r.silo}</td>
                      <td>{r.lote}</td>
                      <td>{r.material}</td>
                      <td>{r.dtv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-foot">
          <button className="btn danger-ghost" onClick={clear} disabled={busy || !totalRows}>
            Apagar todos os dados
          </button>
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={run} disabled={busy || !parsed?.rows.length}>
            {busy ? 'Importando…' : mode === 'base' ? 'Importar base' : 'Marcar como concluídas'}
          </button>
        </div>
      </div>
    </div>
  )
}
