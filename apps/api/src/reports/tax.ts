import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Pajak reports over invoice tax lines; rules in docs/reports/TaxationOutReport.md, TaxationInReport.md,
// TaxationInOutReport.md (fixture: fixtures/tax-t19.json).

/** OUT = PPN Keluaran (sales invoices), IN = PPN Masukan (purchase invoices). */
export interface TaxLine { side: 'OUT' | 'IN'; number: string; date: string; taxDate: string; taxNumber: string; tax: string; rate: number; amount: number
  /** party name, tax document code (DIGUNGGUNG / CTAS_INVOICE), transaction type, reported in an SPT Masa */
  party?: string; documentCode?: string; taxType?: string; reported?: boolean }

export async function loadTaxLines(db: Db): Promise<TaxLine[]> {
  const q = (side: 'OUT' | 'IN', rows: Record<string, unknown>[]) => rows.map(r => ({ side, number: r.number as string, date: r.date as string, taxDate: r.tax_date as string,
    taxNumber: r.tax_number as string, tax: r.tax_name as string, rate: Number(r.rate), amount: Number(r.amount),
    party: r.party as string, documentCode: (r.document_code as string) ?? '', taxType: (r.tax_type as string) ?? '', reported: r.spt_masa_id != null }))
  return [
    ...q('OUT', await db.execute(sql`SELECT i.number, to_char(i.date,'YYYY-MM-DD') AS date, to_char(COALESCE(i.tax_date, i.date),'YYYY-MM-DD') AS tax_date,
      COALESCE(i.tax_number, '') AS tax_number, t.tax_name, t.rate, t.amount, c.name AS party, i.document_code, i.tax_type, i.spt_masa_id
      FROM sales_invoice_taxes t JOIN sales_invoices i ON i.number = t.invoice_number JOIN customers c ON c.no = i.customer_no`)),
    ...q('IN', await db.execute(sql`SELECT i.number, to_char(i.date,'YYYY-MM-DD') AS date, to_char(COALESCE(i.tax_date, i.date),'YYYY-MM-DD') AS tax_date,
      COALESCE(i.tax_number, '') AS tax_number, t.tax_name, t.rate, t.amount, v.name AS party, i.document_code, i.tax_type, i.spt_masa_id
      FROM purchase_invoice_taxes t JOIN purchase_invoices i ON i.number = t.invoice_number JOIN vendors v ON v.no = i.vendor_no`)),
  ]
}

const NAME = { OUT: 'PPN Keluaran', IN: 'PPN Masukan' } as const
const GROUP = { OUT: 'Pajak Keluaran', IN: 'Pajak Masukan' } as const
const HEADER = ['Tanggal', 'Tgl Pajak', 'No Referensi', 'No. Faktur Pajak', 'Nilai Pajak']
const range = (from: string, to: string) => [`Dari ${fmtDate(from)} s/d ${fmtDate(to)}`]
const sum = (ls: TaxLine[]) => ls.reduce((s, l) => s + l.amount, 0)
const opening = (lines: TaxLine[], side: 'OUT' | 'IN', from: string) => sum(lines.filter(l => l.side === side && l.taxDate < from))
const period = (lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string) => lines.filter(l => l.side === side && l.taxDate >= from && l.taxDate <= to)
  .sort((a, b) => (a.taxDate + a.number < b.taxDate + b.number ? -1 : 1))
const taxNames = (ls: TaxLine[]) => [...new Set(ls.map(l => l.tax))].sort()
const docRow = (l: TaxLine) => [fmtDate(l.date), fmtDate(l.taxDate), l.number, l.taxNumber, formatIdr(l.amount)].filter(c => c !== '')

/** Daftar PPN/PPnBM Keluaran / Masukan: Saldo Awal = that side's tax dated before `from`; then one block per tax (name order) by tax date, number. */
function taxationList(lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string): string[][] {
  const open = opening(lines, side, from), inRange = period(lines, side, from, to)
  const rows: string[][] = [[side === 'OUT' ? 'Daftar PPN/PPnBM Keluaran' : 'Daftar PPN/PPnBM Masukan'], range(from, to), HEADER,
    [NAME[side]], ['Saldo Awal'], ['-', '-', formatIdr(open)], [formatIdr(open)]]
  for (const tax of taxNames(inRange)) {
    const block = inRange.filter(l => l.tax === tax)
    rows.push([`${tax} (${block[0]!.rate}%)`], ...block.map(docRow), [formatIdr(sum(block))])
  }
  rows.push([`Total dari ${NAME[side]}`, formatIdr(open + sum(inRange))])
  return rows
}
export const taxationOut = (lines: TaxLine[], from: string, to: string) => taxationList(lines, 'OUT', from, to)
export const taxationIn = (lines: TaxLine[], from: string, to: string) => taxationList(lines, 'IN', from, to)

/**
 * Rekonsiliasi PPN Lebih/Kurang Bayar: Keluaran − Masukan. Accurate streams entries ordered by tax name with the openings
 * (no tax name) first — Masukan opening, then Keluaran opening — and each tax's Keluaran block before its Masukan block;
 * a "Pajak …"/"PPN …" heading is printed whenever the side changes. Masukan amounts print positive per row, negative in totals.
 */
// shortcut: entry order inferred from one capture (one tax, both sides); confirm with two taxes before relying on it.
export function taxationInOut(lines: TaxLine[], from: string, to: string): string[][] {
  const rows: string[][] = [['Rekonsiliasi PPN Lebih/Kurang Bayar'], range(from, to), HEADER, ['PPN Lebih/Kurang Bayar']]
  const sign = (side: 'OUT' | 'IN') => (side === 'OUT' ? 1 : -1)
  type Entry = { side: 'OUT' | 'IN'; title: string; rows: string[][]; amount: number }
  const entries: Entry[] = (['IN', 'OUT'] as const).map(side => {
    const v = opening(lines, side, from)
    return { side, title: 'Saldo Awal', rows: [['-', '-', formatIdr(v)]], amount: v }
  })
  const inRange = [...period(lines, 'OUT', from, to), ...period(lines, 'IN', from, to)]
  for (const tax of taxNames(inRange))
    for (const side of ['OUT', 'IN'] as const) {
      const block = period(lines, side, from, to).filter(l => l.tax === tax)
      if (block.length) entries.push({ side, title: `${tax} (${block[0]!.rate}%)`, rows: block.map(docRow), amount: sum(block) })
    }
  let total = 0
  for (let i = 0; i < entries.length; ) {
    const side = entries[i]!.side
    let j = i, groupTotal = 0
    rows.push([GROUP[side]], [NAME[side]])
    for (; j < entries.length && entries[j]!.side === side; j++) {
      const e = entries[j]!
      rows.push([e.title], ...e.rows, [formatIdr(sign(side) * e.amount)])
      groupTotal += sign(side) * e.amount
    }
    rows.push([`Total dari ${NAME[side]}`, formatIdr(groupTotal)], [`Total dari ${GROUP[side]}`, formatIdr(groupTotal)])
    total += groupTotal
    i = j
  }
  rows.push(['Total dari PPN Lebih/Kurang Bayar', formatIdr(total)])
  return rows
}

const TAX_TYPE: Record<string, string> = { CTAS_KEPADA_SELAIN_PEMUNGUT_PPN: '01 - kepada selain Pemungut PPN' }
const DOC_CODE: Record<string, string> = { CTAS_INVOICE: 'CoreTax - Faktur Pajak', DIGUNGGUNG: 'Digunggung' }

/**
 * Faktur Penjualan / Pembelian SPT Masa PPN: invoices reported in an SPT Masa with tax date in range, grouped by
 * transaction type then document code; Digunggung has no transaction-type heading and comes first. Rows within a group
 * sort by No. Faktur Pajak (blank first), then number. Empty cells (no tax number) are dropped like Accurate's HTML.
 */
// shortcut: group/row order inferred from one capture (Digunggung + one CoreTax group); confirm with more tax types.
function sptList(lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string): string[][] {
  const rows: string[][] = [[side === 'OUT' ? 'Faktur Penjualan SPT Masa PPN' : 'Faktur Pembelian SPT Masa PPN'], range(from, to),
    ['Nomor #', 'Tanggal', 'No. Faktur Pajak', 'Tgl Faktur Pajak', side === 'OUT' ? 'Pelanggan' : 'Pemasok', 'Nilai Pajak']]
  const docs = new Map<string, TaxLine>()
  for (const l of lines.filter(l => l.side === side && l.reported && l.taxDate >= from && l.taxDate <= to)) {
    const d = docs.get(l.number)
    docs.set(l.number, d ? { ...d, amount: d.amount + l.amount } : { ...l })
  }
  const key = (l: TaxLine) => (l.documentCode === 'DIGUNGGUNG' ? '' : `${l.taxType}|${l.documentCode}`)
  let lastType: string | undefined
  for (const g of [...new Set([...docs.values()].map(key))].sort()) {
    const block = [...docs.values()].filter(l => key(l) === g).sort((a, b) => a.taxNumber.localeCompare(b.taxNumber) || a.number.localeCompare(b.number))
    const first = block[0]!
    if (g && first.taxType !== lastType) rows.push([TAX_TYPE[first.taxType!] ?? first.taxType!])
    lastType = g ? first.taxType : undefined
    rows.push([DOC_CODE[first.documentCode!] ?? first.documentCode!])
    for (const l of block) rows.push([l.number, fmtDate(l.date), l.taxNumber, fmtDate(l.taxDate), l.party ?? '', formatIdr(l.amount)].filter(c => c !== ''))
    rows.push([formatIdr(sum(block))])
  }
  return rows
}
export const salesInvoiceSpt = (lines: TaxLine[], from: string, to: string) => sptList(lines, 'OUT', from, to)
export const purchaseInvoiceSpt = (lines: TaxLine[], from: string, to: string) => sptList(lines, 'IN', from, to)
