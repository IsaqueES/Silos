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

// decimalComma: true  -> vírgula é o decimal e o ponto é milhar ("32.450,5")
//               false -> ponto decimal, a menos que haja vírgula
//               'auto' -> (planilhas) texto com vírgula ou com milhar ("28.100") é pt-BR; o resto é número comum
export function parseNumber(value, decimalComma) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  let s = String(value).trim().replace(/\s/g, '')
  if (!s) return null
  const ptBr = decimalComma === 'auto' ? /,/.test(s) || /^\d{1,3}(\.\d{3})+$/.test(s) : decimalComma
  if (ptBr || s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
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

// Procura, nas primeiras linhas, a que tem o cabeçalho (coluna NF). Planilhas costumam ter títulos acima.
export function findHeaderRow(data) {
  for (let i = 0; i < Math.min(15, data.length); i++) {
    if (data[i].some((c) => ALIASES[headerKey(c)] === 'nf')) return i
  }
  return -1
}

// Número de série do Excel (dias desde 30/12/1899) -> 'dd/mm/aaaa'
function serialToDmy(n) {
  const d = new Date(Math.round((n - 25569) * 86400000))
  return dmy(d)
}
function dmy(d) {
  // as datas lidas do Excel vêm em UTC (meia-noite), então usamos os getters UTC
  const p = (x) => String(x).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

// data: matriz de células (linhas x colunas), vinda de CSV ou de planilha
function parseTable(data, { decimalComma }) {
  if (!data.length) return { rows: [], errors: ['Arquivo vazio.'] }

  const headerIdx = findHeaderRow(data)
  const hasHeader = headerIdx >= 0
  // Sem cabeçalho: assume a ordem NF;NOR;QTD;DEP;SILO;LOTE;MATERIAL;DTV
  const map = hasHeader ? data[headerIdx].map((h) => ALIASES[headerKey(h)]) : COLUMNS
  const start = hasHeader ? headerIdx + 1 : 0

  const rows = []
  const errors = []
  const seen = new Set()
  data.slice(start).forEach((cells, i) => {
    if (cells.every((c) => c == null || String(c).trim() === '')) return // linha em branco
    const raw = {}
    map.forEach((col, idx) => {
      if (col) raw[col] = cells[idx]
    })
    const nf = normalizeNf(raw.nf)
    if (!nf) {
      errors.push(`Linha ${start + i + 1}: NF vazia, ignorada.`)
      return
    }
    // DTV numérica = data em formato "Geral" no Excel (número de série)
    if (typeof raw.dtv === 'number' && raw.dtv > 20000 && raw.dtv < 80000) raw.dtv = serialToDmy(raw.dtv)
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

export function parseCsv(text) {
  const parsed = Papa.parse(text, { skipEmptyLines: 'greedy' })
  return parseTable(parsed.data, { decimalComma: parsed.meta.delimiter === ';' })
}

// data: linhas da planilha (células como número, texto, Date ou vazio), como devolve o read-excel-file
export function parseSheet(data) {
  const cells = data.map((row) => row.map((c) => (c instanceof Date ? dmy(c) : typeof c === 'boolean' ? '' : c)))
  return parseTable(cells, { decimalComma: 'auto' })
}

export function toCsv(rows) {
  const header = ['NF', 'NOR', 'QTD', 'DEP', 'SILO', 'LOTE', 'MATERIAL', 'DTV', 'STATUS', 'ADICIONADO POR', 'LANCADO POR']
  const fmt = (n) => (n == null ? '' : String(n).replace('.', ','))
  const lines = rows.map((r) =>
    [r.nf, fmt(r.nor), fmt(r.qtd), r.dep, r.silo, r.lote, r.material, r.dtv, r.concluida ? 'OK' : 'PENDENTE', r.adicionado_por ?? '',
      r.concluida ? (r.lancado_por ?? r.concluida_por ?? '') : ''].join(';'),
  )
  return '﻿' + [header.join(';'), ...lines].join('\r\n')
}
