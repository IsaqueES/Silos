import { useMemo, useState } from 'react'
import { SILOS, fmtNum, overall, stats } from '../lib/stats.js'
import { formatDate } from '../lib/csv.js'
import DangerZone from './DangerZone.jsx'

// Cores dos gráficos (validadas para daltonismo; o âmbar tem pouco contraste,
// por isso os valores sempre aparecem escritos e há a visão em tabela).
const SERIES = [
  { key: 'done', label: 'Concluídas', color: 'var(--chart-done)' },
  { key: 'pending', label: 'Pendentes', color: 'var(--chart-pend)' },
]

export default function Overview({ rows, metas, onSelect, onClearAll, totalRows }) {
  const all = overall(rows, metas)
  const anyMeta = SILOS.some((s) => metas[s] > 0)
  const [tip, setTip] = useState(null)

  const perSilo = useMemo(
    () =>
      SILOS.map((s) => ({
        silo: s,
        ...stats(
          rows.filter((r) => r.silo === s),
          metas[s],
        ),
      })),
    [rows, metas],
  )

  const perDate = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      if (!r.dtv_date) continue
      const d = map.get(r.dtv_date) ?? { date: r.dtv_date, done: 0, pending: 0 }
      r.concluida ? d.done++ : d.pending++
      map.set(r.dtv_date, d)
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-31)
  }, [rows])

  const showTip = (e, title, values, extra) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX || rect.left + rect.width / 2
    const y = e.clientY || rect.top
    setTip({ x, y, title, values, extra })
  }
  const tipProps = (title, values, extra) => ({
    onPointerMove: (e) => showTip(e, title, values, extra),
    onPointerLeave: () => setTip(null),
    onFocus: (e) => showTip(e, title, values, extra),
    onBlur: () => setTip(null),
  })

  return (
    <div className="content">
      <div className="dash-top">
        <div className="stat hero">
          <div className="stat-label">Progresso geral</div>
          <div className="hero-value">{all.pct}%</div>
          <div className="bar">
            <span style={{ width: `${Math.min(100, all.pct)}%` }} />
          </div>
          <div className="muted">
            {all.hasMeta
              ? `${all.counted} de ${all.base} itens (somando as metas dos silos)`
              : `${all.done} de ${all.total} itens lançados no SAP`}
          </div>
        </div>
        <div className="cards">
          <StatCard label="Pendentes" value={all.pending} tone="pend" />
          <StatCard label="Concluídas" value={all.done} tone="ok" />
          <StatCard label="Qtd. pendente" value={fmtNum(all.qtdPend)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          Nenhuma NF ainda. Clique em <b>+ Nova NF</b> para incluir uma, ou em <b>Importar CSV</b> para enviar a base do
          período.
        </div>
      ) : (
        <>
          <ChartCard
            title="Concluídas e pendentes por silo"
            subtitle={anyMeta ? 'A faixa cinza vai até a meta de itens de cada silo (linha preta) · clique em um silo para abrir' : 'Clique em um silo para abrir a lista de NFs'}
            legendMeta={anyMeta}
            table={
              <table>
                <thead>
                  <tr>
                    <th>Silo</th>
                    <th className="num">Concluídas</th>
                    <th className="num">Pendentes</th>
                    <th className="num">Total</th>
                    <th className="num">Meta</th>
                    <th className="num">{anyMeta ? '% da meta' : 'Progresso'}</th>
                    <th className="num">Qtd. pendente</th>
                  </tr>
                </thead>
                <tbody>
                  {perSilo.map((s) => (
                    <tr key={s.silo} className="clickable" onClick={() => onSelect(s.silo)}>
                      <td>Silo {s.silo}</td>
                      <td className="num">{s.done}</td>
                      <td className="num">{s.pending}</td>
                      <td className="num">{s.total}</td>
                      <td className="num">{s.meta ?? '—'}</td>
                      <td className="num">{s.pct}%</td>
                      <td className="num">{fmtNum(s.qtdPend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <SiloBars data={perSilo} onSelect={onSelect} tipProps={tipProps} />
          </ChartCard>

          {perDate.length > 0 && (
            <ChartCard
              title="NFs por data (DTV)"
              subtitle={perDate.length === 31 ? 'Últimas 31 datas' : `${perDate.length} data(s)`}
              table={
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th className="num">Concluídas</th>
                      <th className="num">Pendentes</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perDate.map((d) => (
                      <tr key={d.date}>
                        <td>{formatDate(d.date)}</td>
                        <td className="num">{d.done}</td>
                        <td className="num">{d.pending}</td>
                        <td className="num">{d.done + d.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <DateColumns data={perDate} tipProps={tipProps} />
            </ChartCard>
          )}
        </>
      )}

      <DangerZone
        text="Apaga todas as NFs de todos os silos, de todas as datas. Não dá para desfazer."
        button="Excluir todos os dados de todos os silos"
        onClick={onClearAll}
        disabled={!totalRows}
      />

      {tip && <Tooltip {...tip} />}
    </div>
  )
}

function ChartCard({ title, subtitle, table, legendMeta, children }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section className="chart-card">
      <div className="chart-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="muted">{subtitle}</div>}
        </div>
        <div className="chart-tools">
          <Legend showMeta={legendMeta} />
          <div className="segmented small">
            <button className={!asTable ? 'active' : ''} onClick={() => setAsTable(false)}>
              Gráfico
            </button>
            <button className={asTable ? 'active' : ''} onClick={() => setAsTable(true)}>
              Tabela
            </button>
          </div>
        </div>
      </div>
      {asTable ? <div className="chart-table">{table}</div> : children}
    </section>
  )
}

function Legend({ showMeta }) {
  return (
    <div className="legend">
      {SERIES.map((s) => (
        <span key={s.key} className="legend-item">
          <span className="swatch" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
      {showMeta && (
        <span className="legend-item">
          <span className="swatch meta-swatch" />
          Meta
        </span>
      )}
    </div>
  )
}

// Barras horizontais empilhadas: uma por silo, escala comum (maior total ou meta = largura cheia).
// A linha preta marca a meta de itens do silo.
function SiloBars({ data, onSelect, tipProps }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.total, d.meta || 0)))
  return (
    <div className="hbars">
      {data.map((d) => {
        const values = [
          { ...SERIES[0], value: d.done },
          { ...SERIES[1], value: d.pending },
        ]
        const extra = d.meta ? `Meta ${d.meta} · ${d.pct}% lançado` : null
        const empty = d.total === 0 && !d.meta
        return (
          <div key={d.silo} className="hbar-row">
            <button className="hbar-label" onClick={() => onSelect(d.silo)}>
              Silo {d.silo}
            </button>
            <div className="hbar-area">
              {empty ? (
                <span className="hbar-empty">sem NFs</span>
              ) : (
                <>
                  {d.meta && <span className="meta-track" style={{ width: `${(d.meta / max) * 100}%` }} />}
                  {d.total > 0 && (
                    <div className="hbar" style={{ width: `${(d.total / max) * 100}%` }}>
                      {values
                        .filter((v) => v.value > 0)
                        .map((v) => (
                          <div
                            key={v.key}
                            className="hbar-seg"
                            tabIndex={0}
                            role="button"
                            aria-label={`Silo ${d.silo}: ${v.value} ${v.label.toLowerCase()}`}
                            style={{ flexGrow: v.value, background: v.color }}
                            onClick={() => onSelect(d.silo)}
                            {...tipProps(`Silo ${d.silo}`, values, extra)}
                          />
                        ))}
                    </div>
                  )}
                  {d.meta && (
                    <span
                      className="meta-mark"
                      style={{ left: `${(d.meta / max) * 100}%` }}
                      title={`Meta: ${d.meta} itens`}
                    />
                  )}
                </>
              )}
            </div>
            {!empty && (
              <span className="hbar-value" title={d.meta ? 'lançadas ÷ meta' : 'pendentes · % lançado'}>
                {d.meta ? (
                  <>
                    <b>{d.done}</b> de {d.meta} · <b>{d.pct}%</b>
                  </>
                ) : (
                  <>
                    <b>{d.pending}</b> pend. · {d.pct}%
                  </>
                )}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Colunas empilhadas por data: concluídas embaixo, pendentes em cima
function DateColumns({ data, tipProps }) {
  const max = Math.max(1, ...data.map((d) => d.done + d.pending))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const every = Math.ceil(data.length / 12) // no máximo ~12 rótulos no eixo X
  return (
    <div className="vchart">
      <div className="vaxis">
        {[...ticks].reverse().map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="vplot">
        {ticks.map((t) => (
          <div key={t} className="vgrid" style={{ bottom: `calc(20px + (100% - 20px) * ${t / top})` }} />
        ))}
        <div className="vcols">
          {data.map((d, i) => {
            const values = [
              { ...SERIES[0], value: d.done },
              { ...SERIES[1], value: d.pending },
            ]
            const total = d.done + d.pending
            return (
              <div
                key={d.date}
                className="vcol"
                tabIndex={0}
                aria-label={`${formatDate(d.date)}: ${d.done} concluídas, ${d.pending} pendentes`}
                {...tipProps(formatDate(d.date), values)}
              >
                <div className="vstack" style={{ height: `${(total / top) * 100}%` }}>
                  {d.pending > 0 && <div className="vseg" style={{ flexGrow: d.pending, background: SERIES[1].color }} />}
                  {d.done > 0 && <div className="vseg" style={{ flexGrow: d.done, background: SERIES[0].color }} />}
                </div>
                {i % every === 0 && (
                  // em telas estreitas, metade dos rótulos some (classe "alt") para não encavalar
                  <span className={`vlabel ${(i / every) % 2 ? 'alt' : ''}`}>{formatDate(d.date).slice(0, 5)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function niceTicks(max) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find((s) => max / s <= 4) ?? 10000
  const out = []
  for (let t = 0; t <= max + step - 1 && out.length < 6; t += step) out.push(t)
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step)
  return out
}

function Tooltip({ x, y, title, values, extra }) {
  const total = values.reduce((s, v) => s + v.value, 0)
  const left = Math.min(x + 14, window.innerWidth - 190)
  return (
    <div className="chart-tip" style={{ left, top: y + 14 }}>
      <div className="tip-title">{title}</div>
      {values.map((v) => (
        <div key={v.key} className="tip-row">
          <span className="tip-key" style={{ background: v.color }} />
          <b>{v.value}</b>
          <span className="muted">{v.label.toLowerCase()}</span>
        </div>
      ))}
      <div className="tip-row muted">Total {total}</div>
      {extra && <div className="tip-row tip-meta">{extra}</div>}
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
