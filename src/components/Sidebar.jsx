import { stats } from '../lib/stats.js'

export default function Sidebar({ rows, silos, view, onSelect, nome, onLogout, invalidCount, onAddSilo }) {
  const all = stats(rows)
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo-sm">🌾</span>
        <span>Silos</span>
      </div>
      <nav>
        <button className={`nav-item ${view === 'geral' ? 'active' : ''}`} onClick={() => onSelect('geral')}>
          <span className="nav-icon">▦</span>
          <span className="nav-label">Visão geral</span>
          <span className="nav-count">{all.pending}</span>
        </button>
        <div className="nav-section">Silos</div>
        {silos.map((s) => {
          const st = stats(rows.filter((r) => r.silo === s))
          return (
            <button key={s} className={`nav-item ${view === s ? 'active' : ''}`} onClick={() => onSelect(s)}>
              <span className="nav-icon silo-num">{s}</span>
              <span className="nav-label">
                Silo {s}
                <span className="mini-bar">
                  <span style={{ width: `${st.pct}%` }} />
                </span>
              </span>
              <span className={`nav-count ${st.pending ? '' : 'zero'}`} title="Pendentes">
                {st.pending}
              </span>
            </button>
          )
        })}
        <button className="nav-item nav-add" onClick={onAddSilo}>
          <span className="nav-icon">+</span>
          <span className="nav-label">Adicionar silo</span>
        </button>
        {invalidCount > 0 && (
          <button
            className={`nav-item nav-invalid ${view === 'outros' ? 'active' : ''}`}
            onClick={() => onSelect('outros')}
            title="NFs cujo SILO não está na lista de silos"
          >
            <span className="nav-icon">!</span>
            <span className="nav-label">Silo inválido</span>
            <span className="nav-count">{invalidCount}</span>
          </button>
        )}
      </nav>
      <div className="user">
        <div className="avatar">{(nome || '?')[0].toUpperCase()}</div>
        <div className="user-info">
          <div className="user-email" title={nome}>
            {nome}
          </div>
          <button className="link" onClick={onLogout}>
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
