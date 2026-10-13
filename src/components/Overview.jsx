import { SILOS, fmtNum, stats } from '../lib/stats.js'

export default function Overview({ rows, onSelect }) {
  const all = stats(rows)
  const others = rows.filter((r) => !SILOS.includes(r.silo))
  return (
    <div className="content">
      <div className="cards">
        <StatCard label="NFs / itens" value={all.total} />
        <StatCard label="Concluídas" value={all.done} tone="ok" />
        <StatCard label="Pendentes" value={all.pending} tone="pend" />
        <StatCard label="Progresso" value={`${all.pct}%`} bar={all.pct} />
      </div>

      {rows.length === 0 && (
        <div className="empty">
          Nenhuma NF ainda. Clique em <b>Importar CSV</b> e envie a base de NFs do período.
        </div>
      )}

      <div className="silo-grid">
        {SILOS.map((s) => {
          const st = stats(rows.filter((r) => r.silo === s))
          return (
            <button key={s} className="silo-card" onClick={() => onSelect(s)}>
              <Ring pct={st.pct} label={s} />
              <div className="silo-info">
                <div className="silo-title">Silo {s}</div>
                <div className="silo-line">
                  <span className="dot ok" /> {st.done} concluídas
                </div>
                <div className="silo-line">
                  <span className="dot pend" /> {st.pending} pendentes
                </div>
                <div className="silo-line muted">Qtd. pendente: {fmtNum(st.qtdPend)}</div>
              </div>
            </button>
          )
        })}
      </div>

      {others.length > 0 && (
        <div className="alert warn">
          {others.length} item(ns) com SILO fora de 1–9 (
          {[...new Set(others.map((r) => r.silo || 'vazio'))].slice(0, 5).join(', ')}). Confira a coluna SILO do CSV.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone, bar }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {bar != null && (
        <div className="bar">
          <span style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  )
}

function Ring({ pct, label }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} className="ring-bg" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className="ring-fg"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="30" className="ring-label">
        {label}
      </text>
      <text x="32" y="44" className="ring-pct">
        {pct}%
      </text>
    </svg>
  )
}
