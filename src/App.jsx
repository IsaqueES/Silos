import { useCallback, useEffect, useMemo, useState } from 'react'
import { isLocalMode, store, supabase } from './lib/store.js'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Overview from './components/Overview.jsx'
import SiloView from './components/SiloView.jsx'
import ImportDialog from './components/ImportDialog.jsx'
import { SILOS } from './lib/stats.js'


const LOCAL_USER = { email: 'modo-local' }

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [allowed, setAllowed] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [view, setView] = useState(() => window.location.hash.replace('#silo-', '') || 'geral')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  // ---- autenticação ----
  useEffect(() => {
    if (isLocalMode) {
      if (sessionStorage.getItem('silos:local-login')) setUser(LOCAL_USER)
      setAuthReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const localLogin = () => {
    sessionStorage.setItem('silos:local-login', '1')
    setUser(LOCAL_USER)
  }

  const logout = async () => {
    if (isLocalMode) sessionStorage.removeItem('silos:local-login')
    else await supabase.auth.signOut()
    setUser(null)
    setAllowed(null)
    setRows([])
  }

  // ---- dados ----
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await store.fetchAll())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    store
      .isAllowed()
      .then((ok) => {
        setAllowed(ok)
        if (ok) reload()
      })
      .catch((e) => {
        setAllowed(false)
        setError(e.message)
      })
  }, [user, reload])

  useEffect(() => {
    window.location.hash = view === 'geral' ? '' : `silo-${view}`
  }, [view])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!dateFrom && !dateTo) return true
        if (!r.dtv_date) return false
        if (dateFrom && r.dtv_date < dateFrom) return false
        if (dateTo && r.dtv_date > dateTo) return false
        return true
      }),
    [rows, dateFrom, dateTo],
  )

  const setStatus = async (ids, concluida) => {
    const patch = concluida
      ? { concluida: true, concluida_em: new Date().toISOString(), concluida_por: user.email, origem: 'manual' }
      : { concluida: false, concluida_em: null, concluida_por: null, origem: null }
    const idSet = new Set(ids)
    const before = rows
    setRows((rs) => rs.map((r) => (idSet.has(r.id) ? { ...r, ...patch } : r)))
    try {
      await store.update(ids, patch)
    } catch (e) {
      setRows(before)
      setError('Não foi possível salvar: ' + e.message)
    }
  }

  // Base: insere as NFs como "não concluídas" (as que já existem são mantidas como estão).
  const importBase = async (csvRows) => {
    const existing = new Set(rows.map((r) => [r.nf, r.silo, r.lote, r.material].join('|')))
    const fresh = csvRows.filter((r) => !existing.has([r.nf, r.silo, r.lote, r.material].join('|')))
    await store.insert(fresh.map((r) => ({ ...r, concluida: false })))
    await reload()
    return `${fresh.length} NF(s) adicionadas como pendentes · ${csvRows.length - fresh.length} já existiam.`
  }

  // Lançadas no SAP: toda NF do CSV fica concluída. Se ela não existia na base, é criada já concluída.
  const importLancadas = async (csvRows) => {
    const nfs = new Set(csvRows.map((r) => r.nf))
    const knownNfs = new Set(rows.map((r) => r.nf))
    const toConclude = rows.filter((r) => nfs.has(r.nf) && !r.concluida).map((r) => r.id)
    const now = new Date().toISOString()
    const meta = { concluida: true, concluida_em: now, concluida_por: user.email, origem: 'csv' }
    const newRows = csvRows.filter((r) => !knownNfs.has(r.nf)).map((r) => ({ ...r, ...meta }))
    await store.update(toConclude, meta)
    await store.insert(newRows)
    await reload()
    const already = [...nfs].filter((nf) => knownNfs.has(nf)).length
    return `${toConclude.length} item(ns) marcados como OK · ${newRows.length} NF(s) novas criadas já concluídas · ${already} NF(s) do arquivo encontradas na base.`
  }

  const clearAll = async () => {
    await store.clear()
    await reload()
  }

  if (!authReady) return <div className="center-screen">Carregando…</div>
  if (!user) return <Login onLocalLogin={localLogin} />
  if (allowed === false)
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>Acesso não autorizado</h2>
          <p>
            O e-mail <b>{user.email}</b> não está na lista de usuários permitidos.
          </p>
          {error && <p className="error">{error}</p>}
          <button className="btn" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    )

  const siloRows = SILOS.includes(view) ? filtered.filter((r) => r.silo === view) : null

  return (
    <div className="layout">
      <Sidebar rows={filtered} view={view} onSelect={setView} user={user} onLogout={logout} />
      <main className="main">
        <header className="topbar">
          <div className="title">
            <h1>{siloRows ? `Silo ${view}` : 'Visão geral'}</h1>
            {isLocalMode && <span className="badge warn">modo local</span>}
          </div>
          <div className="toolbar">
            <label className="date">
              De
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="date">
              Até
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            {(dateFrom || dateTo) && (
              <button
                className="btn ghost"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Limpar datas
              </button>
            )}
            <button className="btn ghost" onClick={reload} disabled={loading} title="Recarregar dados">
              {loading ? 'Carregando…' : '↻ Atualizar'}
            </button>
            <button className="btn primary" onClick={() => setImportOpen(true)}>
              ⬆ Importar CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="alert error" onClick={() => setError('')}>
            {error}
          </div>
        )}

        {siloRows ? (
          <SiloView silo={view} rows={siloRows} onSetStatus={setStatus} />
        ) : (
          <Overview rows={filtered} onSelect={setView} />
        )}
      </main>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImportBase={importBase}
          onImportLancadas={importLancadas}
          onClearAll={clearAll}
          onDone={setToast}
          totalRows={rows.length}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
