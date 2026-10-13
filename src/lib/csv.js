import Papa from 'papaparse'

export const COLUMNS = ['nf', 'nor', 'qtd', 'dep', 'silo', 'lote', 'material', 'dtv']

const ALIASES = {
  NF: 'nf', NOTA: 'nf', NOTAFISCAL: 'nf',
  NOR: 'nor',
  QTD: 'qtd', QUANTIDADE: 'qtd', QTDE: 'qtd',
  DEP: 'dep', DEPOSITO: 'dep',
  SILO: 'silo',
  LOTE: 'lote',
  MATERIAL: 'material', MAT: 'material',
  DTV: 'dtv', DATA: 'dtv',
}

const headerKey = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()

// Excel no Brasil costuma salvar CSV em Windows-1252; tenta UTF-8 primeiro.
export async function readFileText(file) {
  const buf = await file.arrayBuffer()
  let text = new TextDecoder('utf-8').decode(buf)
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf)
  return text.replace(/^﻿/, '')
}

export function parseNumber(value, decimalComma) {
  if (value == null) return null
  let s = String(value).trim().replace(/\s/g, '')
  if (!s) return null
  if (decimalComma || s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Aceita dd/mm/aaaa, dd.mm.aaaa, dd-mm-aaaa, dd/mm/aa e aaaa-mm-dd. Retorna 'aaaa-mm-dd' ou null.
export function parseDate(value) {
  const s = String(value ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    let y = +m[3]
    if (y < 100) y += 2000
    return iso(y, +m[2], +m[1])
  }
  return null
}

function iso(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

// "Silo 3", "S03", "3" -> "3"
export function normalizeSilo(value) {
  const s = String(value ?? '').trim()
  const m = s.match(/\d+/)
  return m ? String(Number(m[0])) : s.toUpperCase()
}

// Remove zeros à esquerda de NFs numéricas para que "000123" e "123" sejam a mesma nota.
export function normalizeNf(value) {
  const s = String(value ?? '').trim()
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s.toUpperCase()
}

export const rowKey = (r) => [r.nf, r.silo, r.lote, r.material].join('|')

export function parseCsv(text) {
  const parsed = Papa.parse(text, { skipEmptyLines: 'greedy' })
  const data = parsed.data
  if (!data.length) return { rows: [], errors: ['Arquivo vazio.'] }

  const decimalComma = parsed.meta.delimiter === ';'
  const header = data[0].map((h) => ALIASES[headerKey(h)])
  const hasHeader = header.includes('nf')
  // Sem cabeçalho: assume a ordem NF;NOR;QTD;DEP;SILO;LOTE;MATERIAL;DTV
  const map = hasHeader ? header : COLUMNS
  const body = hasHeader ? data.slice(1) : data

  const rows = []
  const errors = []
  const seen = new Set()
  body.forEach((cells, i) => {
    const raw = {}
    map.forEach((col, idx) => {
      if (col) raw[col] = cells[idx]
    })
    const nf = normalizeNf(raw.nf)
    if (!nf) {
      errors.push(`Linha ${i + (hasHeader ? 2 : 1)}: NF vazia, ignorada.`)
      return
    }
    const row = {
      nf,
      nor: parseNumber(raw.nor, decimalComma),
      qtd: parseNumber(raw.qtd, decimalComma),
      dep: String(raw.dep ?? '').trim(),
      silo: normalizeSilo(raw.silo),
      lote: String(raw.lote ?? '').trim(),
      material: String(raw.material ?? '').trim(),
      dtv: String(raw.dtv ?? '').trim(),
    }
    row.dtv_date = parseDate(row.dtv)
    const key = rowKey(row)
    if (seen.has(key)) return
    seen.add(key)
    rows.push(row)
  })
  return { rows, errors, hasHeader }
}

export function toCsv(rows) {
  const header = ['NF', 'NOR', 'QTD', 'DEP', 'SILO', 'LOTE', 'MATERIAL', 'DTV', 'STATUS']
  const fmt = (n) => (n == null ? '' : String(n).replace('.', ','))
  const lines = rows.map((r) =>
    [r.nf, fmt(r.nor), fmt(r.qtd), r.dep, r.silo, r.lote, r.material, r.dtv, r.concluida ? 'OK' : 'PENDENTE'].join(';'),
  )
  return '﻿' + [header.join(';'), ...lines].join('\r\n')
}
