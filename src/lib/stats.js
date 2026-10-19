// meta: quantidade de itens desejada para o silo (opcional). Com meta, a porcentagem é lançadas ÷ meta.
export function stats(rows, meta) {
  const total = rows.length
  const done = rows.filter((r) => r.concluida).length
  const qtdTotal = rows.reduce((s, r) => s + (Number(r.qtd) || 0), 0)
  const qtdPend = rows.filter((r) => !r.concluida).reduce((s, r) => s + (Number(r.qtd) || 0), 0)
  const m = Number(meta) > 0 ? Number(meta) : null
  const base = m ?? total
  return {
    total,
    done,
    pending: total - done,
    meta: m,
    base,
    pct: base ? Math.round((done / base) * 100) : 0, // pode passar de 100% quando a meta é superada
    missing: m ? Math.max(0, m - done) : null,
    qtdTotal,
    qtdPend,
  }
}

// Progresso geral: cada silo conta pela sua meta (ou pelo total de NFs, se não tiver meta).
// O excedente de um silo não esconde o atraso de outro (conta no máximo a meta de cada um).
export function overall(rows, metas) {
  const all = stats(rows)
  if (!SILOS.some((s) => Number(metas[s]) > 0)) return { ...all, hasMeta: false, counted: all.done }
  let base = 0
  let counted = 0
  for (const s of SILOS) {
    const st = stats(
      rows.filter((r) => r.silo === s),
      metas[s],
    )
    base += st.base
    counted += Math.min(st.done, st.base)
  }
  return { ...all, hasMeta: true, base, counted, pct: base ? Math.round((counted / base) * 100) : 0 }
}

export const fmtNum = (n) =>
  n == null || n === '' ? '' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export const SILOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
