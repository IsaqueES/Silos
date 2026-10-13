import { SILOS, stats } from '../lib/stats.js'

export default function Sidebar({ rows, view, onSelect, nome, onLogout, onChangePassword }) {
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
        {SILOS.map((s) => {
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
      </nav>
      <div className="user">
        <div className="avatar">{(nome || '?')[0].toUpperCase()}</div>
        <div className="user-info">
          <div className="user-email" title={nome}>
            {nome}
          </div>
          <div className="side-actions">
            {onChangePassword && (
              <button className="link" onClick={onChangePassword}>
                Alterar senha
              </button>
            )}
            <button className="link" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
