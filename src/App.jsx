import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { auth, isLocalMode, SHARED_EMAIL, store } from './lib/store.js'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Overview from './components/Overview.jsx'
import SiloView from './components/SiloView.jsx'
import ImportDialog from './components/ImportDialog.jsx'
import NfForm from './components/NfForm.jsx'
import ClearSiloDialog from './components/ClearSiloDialog.jsx'
import { SILOS } from './lib/stats.js'
import { rowKey } from './lib/csv.js'

const NAME_KEY = 'silos:nome'
const SESSAO_ENCERRADA = 'A senha geral foi alterada. Entre novamente com a nova senha.'
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [nome, setNome] = useState(readName)
  const [authReady, setAuthReady] = useState(false)
  const [allowed, setAllowed] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [view, setView] = useState(() => window.location.hash.match(/^#silo-([1-9])$/)?.[1] || 'geral')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState(null) // null | { row?: linha sendo editada }
  const [clearSilo, setClearSilo] = useState(null) // silo com o diálogo de exclusão aberto
  const [notice, setNotice] = useState('') // aviso na tela de login (ex.: senha alterada)
  const wasAllowed = useRef(false)
  const loggingOut = useRef(false)

  // ---- autenticação: nome de cada um + senha geral ----
  const logout = useCallback(async (message = '') => {
    loggingOut.current = true
    await auth.logout()
    loggingOut.current = false
    wasAllowed.current = false
    setNotice(message)
    setSession(null)
    setAllowed(null)
    setRows([])
  }, [])

  useEffect(() => {
    auth.getSession().then((sess) => {
      setSession(sess)
      setAuthReady(true)
    })
    return auth.onChange((sess, event) => {
      // Sessão encerrada pelo servidor (ex.: senha geral trocada) sem o usuário clicar em Sair
      if (event === 'SIGNED_OUT' && !loggingOut.current && wasAllowed.current) logout(SESSAO_ENCERRADA)
      else setSession(sess)
    })
  }, [logout])

  const login = async (name, password) => {
    const sess = await auth.login(password)
    try {
      localStorage.setItem(NAME_KEY, name)
    } catch {
      /* sem localStorage: o nome vale só nesta aba */
    }
    setNotice('')
    setNome(name)
    setSession(sess)
  }

  const loggedIn = !!session && !!nome

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
    if (!loggedIn) return
    store
      .isAllowed()
      .then((ok) => {
        setAllowed(ok)
        wasAllowed.current = ok
        if (ok) reload()
      })
      .catch((e) => {
        setAllowed(false)
        setError(e.message)
      })
  }, [loggedIn, reload])

  // Confere a cada minuto (e ao voltar para a aba) se a sessão ainda vale.
  // Quando a senha geral é trocada no Supabase, todas as sessões são encerradas e cada um volta ao login.
  useEffect(() => {
    if (!loggedIn || isLocalMode || !allowed) return
    const check = () =>
      store
        .isAllowed()
        .then((ok) => {
          if (!ok) logout(SESSAO_ENCERRADA)
        })
        .catch(() => {}) // sem internet: tenta de novo depois
    const onVisible = () => document.visibilityState === 'visible' && check()
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loggedIn, allowed, logout])

  useEffect(() => {
    // Não mexe no hash enquanto o Supabase ainda lê o token do link de login (#access_token=...)
    if (/access_token|error_description/.test(window.location.hash)) return
    const hash = view === 'geral' ? '' : `#silo-${view}`
    history.replaceState(null, '', window.location.pathname + window.location.search + hash)
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
      ? { concluida: true, concluida_em: new Date().toISOString(), lancado_por: nome, origem: 'manual' }
      : { concluida: false, concluida_em: null, lancado_por: null, concluida_por: null, origem: null }
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
    await store.insert(fresh.map((r) => ({ ...r, concluida: false, adicionado_por: nome })))
    await reload()
    return `${fresh.length} NF(s) adicionadas como pendentes · ${csvRows.length - fresh.length} já existiam.`
  }

  // Lançadas no SAP: toda NF do CSV fica concluída. Se ela não existia na base, é criada já concluída.
  const importLancadas = async (csvRows) => {
    const nfs = new Set(csvRows.map((r) => r.nf))
    const knownNfs = new Set(rows.map((r) => r.nf))
    const toConclude = rows.filter((r) => nfs.has(r.nf) && !r.concluida).map((r) => r.id)
    const now = new Date().toISOString()
    const meta = { concluida: true, concluida_em: now, lancado_por: nome, origem: 'csv' }
    const newRows = csvRows
      .filter((r) => !knownNfs.has(r.nf))
      .map((r) => ({ ...r, ...meta, adicionado_por: nome }))
    await store.update(toConclude, meta)
    await store.insert(newRows)
    await reload()
    const already = [...nfs].filter((nf) => knownNfs.has(nf)).length
    return `${toConclude.length} item(ns) marcados como OK · ${newRows.length} NF(s) novas criadas já concluídas · ${already} NF(s) do arquivo encontradas na base.`
  }

  // Inclusão/edição manual de uma NF pelo formulário
  const saveNf = async (data, existing) => {
    const key = rowKey(data)
    if (rows.some((r) => r.id !== existing?.id && rowKey(r) === key))
      throw new Error(`Já existe a NF ${data.nf} no silo ${data.silo} com o mesmo lote e material.`)
    const wasDone = existing?.concluida ?? false
    const status =
      data.concluida === wasDone
        ? {}
        : data.concluida
          ? { concluida_em: new Date().toISOString(), lancado_por: nome, origem: 'manual' }
          : { concluida_em: null, lancado_por: null, concluida_por: null, origem: null }
    if (existing) {
      await store.update([existing.id], { ...data, ...status })
      setToast(`NF ${data.nf} atualizada.`)
    } else {
      await store.insert([{ ...data, ...status, adicionado_por: nome }])
      setToast(`NF ${data.nf} adicionada ao silo ${data.silo}.`)
    }
    await reload()
  }

  const deleteNf = async (row) => {
    await store.remove([row.id])
    setToast(`NF ${row.nf} excluída.`)
    await reload()
  }

  // Apaga todas as NFs do silo no banco (não só as que passam no filtro de datas)
  const deleteSilo = async (silo) => {
    await store.removeSilo(silo)
    setToast(`Todos os dados do Silo ${silo} foram apagados.`)
    await reload()
  }

  const clearAll = async () => {
    await store.clear()
    await reload()
  }

  if (!authReady) return <div className="center-screen">Carregando…</div>
  if (!loggedIn) return <Login initialName={nome} notice={notice} onLogin={login} />
  if (allowed === false)
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>Acesso não autorizado</h2>
          <p>
            O usuário de acesso <b>{SHARED_EMAIL}</b> não está na tabela <code>usuarios_permitidos</code>. Rode o
            script <code>supabase/migracao-senha-geral.sql</code> no SQL Editor do Supabase.
          </p>
          {error && <p className="error">{error}</p>}
          <button className="btn" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </div>
    )

  const siloRows = SILOS.includes(view) ? filtered.filter((r) => r.silo === view) : null

  return (
    <div className="layout">
      <Sidebar
        rows={filtered}
        view={view}
        onSelect={setView}
        nome={nome}
        onLogout={() => logout()}
      />
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
            <button className="btn ghost" onClick={() => setImportOpen(true)}>
              ⬆ Importar CSV
            </button>
            <button className="btn primary" onClick={() => setForm({})}>
              + Nova NF
            </button>
          </div>
        </header>

        {error && (
          <div className="alert error" onClick={() => setError('')}>
            {error}
          </div>
        )}

        {siloRows ? (
          <SiloView
            silo={view}
            rows={siloRows}
            onSetStatus={setStatus}
            onEdit={(row) => setForm({ row })}
            onClearSilo={() => setClearSilo(view)}
          />
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
      {form && (
        <NfForm
          row={form.row}
          defaultSilo={SILOS.includes(view) ? view : '1'}
          onClose={() => setForm(null)}
          onSave={(data) => saveNf(data, form.row)}
          onDelete={deleteNf}
        />
      )}
      {clearSilo && (
        <ClearSiloDialog
          silo={clearSilo}
          total={rows.filter((r) => r.silo === clearSilo).length}
          onClose={() => setClearSilo(null)}
          onConfirm={() => deleteSilo(clearSilo)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
