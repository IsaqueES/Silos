export function stats(rows) {
  const total = rows.length
  const done = rows.filter((r) => r.concluida).length
  const qtdTotal = rows.reduce((s, r) => s + (Number(r.qtd) || 0), 0)
  const qtdPend = rows.filter((r) => !r.concluida).reduce((s, r) => s + (Number(r.qtd) || 0), 0)
  return { total, done, pending: total - done, pct: total ? Math.round((done / total) * 100) : 0, qtdTotal, qtdPend }
}

export const fmtNum = (n) =>
  n == null || n === '' ? '' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export const SILOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
