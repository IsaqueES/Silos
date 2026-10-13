import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

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
  async clear() {
    save([])
  },
  async isAllowed() {
    return true
  },
}

export const store = isLocalMode ? local : remote
