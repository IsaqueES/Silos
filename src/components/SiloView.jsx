import { useMemo, useState } from 'react'
import { fmtNum, stats } from '../lib/stats.js'
import { toCsv } from '../lib/csv.js'

export default function SiloView({ silo, rows, onSetStatus }) {
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
      return [r.nf, r.lote, r.material, r.dep, r.nor].some((v) => String(v ?? '').toLowerCase().includes(q))
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
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                className={r.concluida ? 'done' : ''}
                onClick={() => onSetStatus([r.id], !r.concluida)}
                title={
                  r.concluida
                    ? `Concluída${r.concluida_por ? ' por ' + r.concluida_por : ''}${
                        r.concluida_em ? ' em ' + new Date(r.concluida_em).toLocaleString('pt-BR') : ''
                      }${r.origem === 'csv' ? ' (via CSV)' : ''} — clique para desfazer`
                    : 'Clique para marcar como OK (já lançada)'
                }
              >
                <td>
                  <span className={`pill ${r.concluida ? 'ok' : 'pend'}`}>{r.concluida ? '✓ OK' : 'Pendente'}</span>
                </td>
                <td className="mono strong">{r.nf}</td>
                <td className="num mono">{r.nor}</td>
                <td className="num">{fmtNum(r.qtd)}</td>
                <td>{r.dep}</td>
                <td className="mono">{r.lote}</td>
                <td className="mono">{r.material}</td>
                <td>{r.dtv}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <div className="empty">Nenhum item para os filtros atuais.</div>}
      </div>
      <p className="muted small-note">Clique em uma linha para alternar entre Pendente e OK.</p>
    </div>
  )
}
