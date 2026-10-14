import { useMemo, useState } from 'react'
import { fmtNum, stats } from '../lib/stats.js'
import { toCsv } from '../lib/csv.js'
import DangerZone from './DangerZone.jsx'

export default function SiloView({ silo, label, rows, onSetStatus, onEdit, onClearSilo }) {
  const invalid = silo === 'outros'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todas')
  const [sort, setSort] = useState({ col: 'dtv_date', dir: 1 })

  const st = stats(rows)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (status === 'pendentes' && r.concluida) return false
      if (status === 'concluidas' && !r.concluida) return false
      if (!q) return true
      return [r.nf, r.lote, r.material, r.dep, r.nor, r.adicionado_por, r.lancado_por].some((v) => String(v ?? '').toLowerCase().includes(q))
    })
    const { col, dir } = sort
    return list.sort((a, b) => {
      const x = a[col] ?? ''
      const y = b[col] ?? ''
      const cmp =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'pt-BR', { numeric: true })
      return cmp * dir || String(a.nf).localeCompare(String(b.nf), 'pt-BR', { numeric: true })
    })
  }, [rows, search, status, sort])

  const pendingVisible = visible.filter((r) => !r.concluida)

  const exportCsv = () => {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `silo-${silo}-${status}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const markAllVisible = () => {
    if (!pendingVisible.length) return
    if (confirm(`Marcar ${pendingVisible.length} item(ns) exibidos como OK?`))
      onSetStatus(
        pendingVisible.map((r) => r.id),
        true,
      )
  }

  const Th = ({ col, children, num }) => (
    <th
      className={`${num ? 'num' : ''} sortable`}
      onClick={() => setSort((s) => ({ col, dir: s.col === col ? -s.dir : 1 }))}
    >
      {children}
      {sort.col === col && <span className="sort">{sort.dir > 0 ? '▲' : '▼'}</span>}
    </th>
  )

  return (
    <div className="content">
      <div className="cards">
        <div className="stat">
          <div className="stat-label">Itens</div>
          <div className="stat-value">{st.total}</div>
        </div>
        <div className="stat ok">
          <div className="stat-label">Concluídas</div>
          <div className="stat-value">{st.done}</div>
        </div>
        <div className="stat pend">
          <div className="stat-label">Pendentes</div>
          <div className="stat-value">{st.pending}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Qtd. total · pendente</div>
          <div className="stat-value small">
            {fmtNum(st.qtdTotal)} · {fmtNum(st.qtdPend)}
          </div>
          <div className="bar">
            <span style={{ width: `${st.pct}%` }} />
          </div>
        </div>
      </div>

      {invalid && (
        <div className="alert warn static">
          Estas NFs têm um SILO fora de 1–9 (provavelmente erro de digitação no CSV). Use <b>✎</b> para corrigir o silo
          de cada uma, ou apague todas na zona de perigo abaixo.
        </div>
      )}

      <div className="filters">
        <input
          className="search"
          placeholder="Buscar NF, lote, material, depósito…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="segmented">
          {[
            ['todas', 'Todas'],
            ['pendentes', 'Pendentes'],
            ['concluidas', 'Concluídas'],
          ].map(([k, label]) => (
            <button key={k} className={status === k ? 'active' : ''} onClick={() => setStatus(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn ghost" onClick={markAllVisible} disabled={!pendingVisible.length}>
          ✓ Marcar exibidas como OK
        </button>
        <button className="btn ghost" onClick={exportCsv} disabled={!visible.length}>
          ⬇ Exportar CSV
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <Th col="concluida">Status</Th>
              {invalid && <Th col="silo">SILO</Th>}
              <Th col="nf">NF</Th>
              <Th col="nor" num>
                NOR
              </Th>
              <Th col="qtd" num>
                QTD
              </Th>
              <Th col="dep">DEP</Th>
              <Th col="lote">LOTE</Th>
              <Th col="material">MATERIAL</Th>
              <Th col="dtv_date">DTV</Th>
              <Th col="adicionado_por">Adicionado por</Th>
              <Th col="lancado_por">Lançado por</Th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                className={r.concluida ? 'done' : ''}
              >
                <td>
                  <div className="status-cell">
                    <span
                      className={`pill ${r.concluida ? 'ok' : 'pend'}`}
                      title={
                        r.concluida
                          ? `Lançada${r.lancado_por || r.concluida_por ? ' por ' + (r.lancado_por || r.concluida_por) : ''}${
                              r.concluida_em ? ' em ' + new Date(r.concluida_em).toLocaleString('pt-BR') : ''
                            }${r.origem === 'csv' ? ' (via CSV)' : ''}`
                          : 'Ainda não lançada no SAP'
                      }
                    >
                      {r.concluida ? '✓ OK' : 'Pendente'}
                    </span>
                    {r.concluida ? (
                      <button
                        className="undo-btn"
                        title="Voltar para pendente"
                        onClick={() => {
                          if (confirm(`Voltar a NF ${r.nf} para pendente?`)) onSetStatus([r.id], false)
                        }}
                      >
                        Desfazer
                      </button>
                    ) : (
                      <button className="done-btn" title="Marcar como lançada no SAP" onClick={() => onSetStatus([r.id], true)}>
                        ✓ Concluir
                      </button>
                    )}
                  </div>
                </td>
                {invalid && <td className="mono bad-silo">{r.silo || '(vazio)'}</td>}
                <td className="mono strong">{r.nf}</td>
                <td className="num mono">{r.nor}</td>
                <td className="num">{fmtNum(r.qtd)}</td>
                <td>{r.dep}</td>
                <td className="mono">{r.lote}</td>
                <td className="mono">{r.material}</td>
                <td>{r.dtv}</td>
                <td className="who">{r.adicionado_por}</td>
                <td className="who">{r.concluida ? r.lancado_por || r.concluida_por : ''}</td>
                <td>
                  <button
                    className="row-btn"
                    title="Editar ou excluir"
                    onClick={() => onEdit(r)}
                  >
                    ✎
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <div className="empty">Nenhum item para os filtros atuais.</div>}
      </div>
      <p className="muted small-note">Use ✓ Concluir para marcar uma NF como lançada · ✎ para editar ou excluir.</p>

      <DangerZone
        text={`Apaga todas as ${label === `Silo ${silo}` ? `NFs do ${label}` : label}, de todas as datas. Não dá para desfazer.`}
        button={invalid ? 'Excluir todas as NFs com silo inválido' : 'Excluir todos os dados deste silo'}
        onClick={onClearSilo}
      />
    </div>
  )
}
