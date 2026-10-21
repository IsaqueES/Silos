import { findHeaderRow } from './csv.js'

export const isExcelFile = (file) => /\.(xlsx|xlsm|xls)$/i.test(file.name)

// Lê todas as abas: [{ sheet: 'Nome', data: [[...], ...] }]. A biblioteca só é baixada quando alguém envia uma planilha.
export async function readSheets(file) {
  if (/\.xls$/i.test(file.name))
    throw new Error(
      'Este é um Excel antigo (.xls). No Excel, use Arquivo > Salvar como > "Pasta de Trabalho do Excel (.xlsx)" e envie de novo.',
    )
  const { default: readExcelFile } = await import('read-excel-file/browser')
  try {
    return await readExcelFile(file)
  } catch (e) {
    throw new Error(`Não foi possível ler a planilha (${e.message || e}). Confira se é um arquivo .xlsx válido.`)
  }
}

// Aba padrão: a primeira que tiver a coluna NF no cabeçalho (senão, a primeira)
export function defaultSheet(sheets) {
  const i = sheets.findIndex((s) => findHeaderRow(s.data) >= 0)
  return i >= 0 ? i : 0
}
