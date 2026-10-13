import { createClient } from '@supabase/supabase-js'

// Aceita a URL com caminho extra (ex.: .../rest/v1/ ou .../auth/v1/callback): usa só a origem.
function projectUrl(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  try {
    return new URL(s.includes('://') ? s : `https://${s}`).origin
  } catch {
    return s
  }
}

const url = projectUrl(import.meta.env.VITE_SUPABASE_URL)
const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const supabase = url && key ? createClient(url, key) : null
export const isLocalMode = !supabase

const CHUNK = 500
const chunks = (arr, size = CHUNK) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---------- Supabase ----------
const remote = {
  async fetchAll() {
    const all = []
    const page = 1000 // limite padrão do Supabase por requisição
    for (let from = 0; ; from += page) {
      const { data, error } = await supabase
        .from('nfs')
        .select('*')
        .order('id')
        .range(from, from + page - 1)
      if (error) throw error
      all.push(...data)
      if (data.length < page) return all
    }
  },
  async insert(rows) {
    for (const part of chunks(rows)) {
      const { error } = await supabase
        .from('nfs')
        .upsert(part, { onConflict: 'nf,silo,lote,material', ignoreDuplicates: true })
      if (error) throw error
    }
  },
  async update(ids, patch) {
    for (const part of chunks(ids)) {
      const { error } = await supabase.from('nfs').update(patch).in('id', part)
      if (error) throw error
    }
  },
  async remove(ids) {
    for (const part of chunks(ids)) {
      const { error } = await supabase.from('nfs').delete().in('id', part)
      if (error) throw error
    }
  },
  async clear() {
    const { error } = await supabase.from('nfs').delete().gte('id', 0)
    if (error) throw error
  },
  async isAllowed() {
    const { data, error } = await supabase.rpc('usuario_permitido')
    if (error) throw error
    return data === true
  },
}

// ---------- Modo local (localStorage) ----------
const LS_KEY = 'silos:nfs'
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? []
  } catch {
    return []
  }
}
const save = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows))

const local = {
  async fetchAll() {
    return load()
  },
  async insert(rows) {
    const current = load()
    const keys = new Set(current.map((r) => [r.nf, r.silo, r.lote, r.material].join('|')))
    let nextId = current.reduce((m, r) => Math.max(m, r.id), 0) + 1
    for (const r of rows) {
      const k = [r.nf, r.silo, r.lote, r.material].join('|')
      if (keys.has(k)) continue
      keys.add(k)
      current.push({ concluida: false, ...r, id: nextId++, criado_em: new Date().toISOString() })
    }
    save(current)
  },
  async update(ids, patch) {
    const set = new Set(ids)
    save(load().map((r) => (set.has(r.id) ? { ...r, ...patch } : r)))
  },
  async remove(ids) {
    const set = new Set(ids)
    save(load().filter((r) => !set.has(r.id)))
  },
  async clear() {
    save([])
  },
  async isAllowed() {
    return true
  },
}

export const store = isLocalMode ? local : remote

// Todos entram com o mesmo usuário do Supabase; a "senha geral" é a senha dele.
export const SHARED_EMAIL = (import.meta.env.VITE_LOGIN_EMAIL || 'acesso@silos.app').trim()

export const auth = {
  async getSession() {
    if (isLocalMode) return sessionStorage.getItem('silos:local-login') ? { local: true } : null
    const { data } = await supabase.auth.getSession()
    return data.session
  },
  onChange(cb) {
    if (isLocalMode) return () => {}
    const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session))
    return () => data.subscription.unsubscribe()
  },
  async login(password) {
    if (isLocalMode) {
      sessionStorage.setItem('silos:local-login', '1')
      return { local: true }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: SHARED_EMAIL, password })
    if (error) throw new Error(/invalid login credentials/i.test(error.message) ? 'Senha incorreta.' : error.message)
    return data.session
  },
  async logout() {
    if (isLocalMode) sessionStorage.removeItem('silos:local-login')
    else await supabase.auth.signOut()
  },
  async changePassword(password) {
    if (isLocalMode) return
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },
}
