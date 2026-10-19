import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate, fmtHeaderDate } from './general-ledger'
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
const range = (from: string, to: string) => [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`]
const sum = (ls: TaxLine[]) => ls.reduce((s, l) => s + l.amount, 0)
const opening = (lines: TaxLine[], side: 'OUT' | 'IN', from: string) => sum(lines.filter(l => l.side === side && l.taxDate < from))
const period = (lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string) => lines.filter(l => l.side === side && l.taxDate >= from && l.taxDate <= to)
  .sort((a, b) => (a.taxDate + a.number < b.taxDate + b.number ? -1 : 1))
const taxNames = (ls: TaxLine[]) => [...new Set(ls.map(l => l.tax))].sort()
const docRow = (l: TaxLine) => [fmtDate(l.date), fmtDate(l.taxDate), l.number, l.taxNumber, formatIdr(l.amount)].filter(c => c !== '')

/** A posting on a tax account that is not a tax line of a taxed invoice ("Transaksi Lainnya"); amount on the tax side's sign. */
export interface TaxAccountPosting { date: string; number: string; taxNumber: string; kind: string; amount: number }
/** One section per tax account: its name, balance before `from`, the taxes posting to it, and its other postings. */
export interface TaxSection { title: string; opening: number; taxes: string[]; others: TaxAccountPosting[] }

// shortcut: "Transaksi Lainnya" groups by document kind, sales invoices first, then the rest in kind order; inferred from one
// Trade Portal capture (SI before PI); confirm with more kinds before relying on it.
const KIND_ORDER = ['SI', 'PI']
const kindRank = (k: string) => (KIND_ORDER.includes(k) ? KIND_ORDER.indexOf(k) : KIND_ORDER.length)

/** Daftar PPN/PPnBM Keluaran / Masukan by tax account (rules: docs/reports/TaxationOutReport.md, Trade Portal variation). */
export function taxationListBySection(lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string, sections: TaxSection[]): string[][] {
  const inRange = period(lines, side, from, to)
  const rows: string[][] = [[side === 'OUT' ? 'Daftar PPN/PPnBM Keluaran' : 'Daftar PPN/PPnBM Masukan'], range(from, to), HEADER]
  for (const sec of sections) {
    let total = sec.opening
    rows.push([sec.title], ['Saldo Awal'], ['-', '-', formatIdr(sec.opening)], [formatIdr(sec.opening)])
    for (const tax of taxNames(inRange.filter(l => sec.taxes.includes(l.tax)))) {
      const block = inRange.filter(l => l.tax === tax)
      rows.push([`${tax} (${block[0]!.rate}%)`], ...block.map(docRow), [formatIdr(sum(block))])
      total += sum(block)
    }
    const others = sec.others.filter(o => o.date >= from && o.date <= to)
    for (const kind of [...new Set(others.map(o => o.kind))].sort((a, b) => kindRank(a) - kindRank(b) || (a < b ? -1 : 1))) {
      const g = others.filter(o => o.kind === kind).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
      const sub = g.reduce((t, o) => t + o.amount, 0)
      rows.push(['Transaksi Lainnya'], ...g.map(o => [fmtDate(o.date), fmtDate(o.date), o.number, o.taxNumber, formatIdr(o.amount)].filter(c => c !== '')), [formatIdr(sub)])
      total += sub
    }
    rows.push([`Total dari ${sec.title}`, formatIdr(total)])
  }
  return rows
}

/** Sections from the ledger: each tax's sales (OUT) or purchase (IN) account; opening and other postings signed credit − debit for OUT, debit − credit for IN. */
export async function loadTaxSections(db: Db, side: 'OUT' | 'IN', from: string): Promise<TaxSection[]> {
  const col = side === 'OUT' ? sql.raw('sales_account') : sql.raw('purchase_account')
  const taxes = await db.execute(sql`SELECT t.name, t.${col} AS account, a.name AS account_name FROM taxes t JOIN accounts a ON a.no = t.${col} ORDER BY t.seq`)
  const sgn = side === 'OUT' ? 1 : -1
  const out: TaxSection[] = []
  for (const t of taxes) {
    const acct = t.account as string
    let sec = out.find(x => x.title === t.account_name)
    if (!sec) {
      const [o] = await db.execute(sql`SELECT COALESCE(SUM(credit - debit), 0) AS v FROM journal_lines WHERE account_no = ${acct} AND date < ${from}`)
      // postings not carried as tax lines of a taxed invoice; sales invoices print their tax number, others their own number
      const others = (await db.execute(sql`SELECT to_char(l.date,'YYYY-MM-DD') AS date, j.number, j.source_type AS kind, l.credit - l.debit AS v,
          COALESCE(si.tax_number, '') AS tax_number
        FROM journal_lines l JOIN journals j ON j.journal_id = l.journal_id LEFT JOIN sales_invoices si ON si.number = j.number AND j.source_type = 'SI'
        WHERE l.account_no = ${acct} AND NOT EXISTS (SELECT 1 FROM sales_invoice_taxes x WHERE x.invoice_number = j.number AND j.source_type = 'SI')
          AND NOT EXISTS (SELECT 1 FROM purchase_invoice_taxes x WHERE x.invoice_number = j.number AND j.source_type = 'PI')`))
        .map(r => ({ date: r.date as string, number: r.number as string, kind: r.kind as string, amount: sgn * Number(r.v),
          taxNumber: r.kind === 'SI' ? (r.tax_number as string) : (r.number as string) }))
      sec = { title: t.account_name as string, opening: sgn * Number(o!.v), taxes: [], others }
      out.push(sec)
    }
    sec.taxes.push(t.name as string)
  }
  return out
}

/** Daftar PPN/PPnBM Keluaran / Masukan with one section (the tax account named PPN Keluaran / PPN Masukan) built from tax lines only. */
function taxationList(lines: TaxLine[], side: 'OUT' | 'IN', from: string, to: string): string[][] {
  return taxationListBySection(lines, side, from, to, [{ title: NAME[side], opening: opening(lines, side, from), taxes: taxNames(lines), others: [] }])
}
export const taxationOut = (lines: TaxLine[], from: string, to: string) => taxationList(lines, 'OUT', from, to)
export const taxationIn = (lines: TaxLine[], from: string, to: string) => taxationList(lines, 'IN', from, to)

/**
 * Rekonsiliasi PPN Lebih/Kurang Bayar: Keluaran − Masukan over tax-account sections (Masukan = purchase accounts, Keluaran =
 * sales accounts). Accurate streams entries and prints a side heading ("Pajak Masukan"/"Pajak Keluaran") whenever the side
 * changes and an account heading whenever the account changes, closing each run with its own totals:
 *   1. every account's Saldo Awal (Masukan accounts, then Keluaran), each followed by its sales-invoice Transaksi Lainnya;
 *   2. per tax (name order) its Keluaran block, then its Masukan block;
 *   3. the remaining Transaksi Lainnya, Masukan accounts then Keluaran, in a run of their own (headings repeat).
 * Masukan amounts print positive per row, negative in totals. Verified: Manufaktur Demo (one tax, both sides) and Trade Portal
 * Demo (two accounts per side, JV/PI/SI postings; fixtures/trade/trade-tp.json `tax`).
 */
export function taxationInOutBySection(lines: TaxLine[], from: string, to: string, sections: { IN: TaxSection[]; OUT: TaxSection[] }): string[][] {
  const rows: string[][] = [['Rekonsiliasi PPN Lebih/Kurang Bayar'], range(from, to), HEADER, ['PPN Lebih/Kurang Bayar']]
  const sign = (side: 'OUT' | 'IN') => (side === 'OUT' ? 1 : -1)
  type Entry = { side: 'OUT' | 'IN'; account: string; title: string; rows: string[][]; amount: number; last?: boolean }
  const inRange = (o: TaxAccountPosting) => o.date >= from && o.date <= to
  const otherEntry = (side: 'OUT' | 'IN', sec: TaxSection, g: TaxAccountPosting[]): Entry => ({ side, account: sec.title, title: 'Transaksi Lainnya',
    rows: g.sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).map(o => [fmtDate(o.date), fmtDate(o.date), o.number, o.taxNumber, formatIdr(o.amount)].filter(c => c !== '')),
    amount: g.reduce((t, o) => t + o.amount, 0) })
  const entries: Entry[] = []
  for (const side of ['IN', 'OUT'] as const)
    for (const sec of sections[side]) {
      entries.push({ side, account: sec.title, title: 'Saldo Awal', rows: [['-', '-', formatIdr(sec.opening)]], amount: sec.opening })
      const si = sec.others.filter(o => inRange(o) && o.kind === 'SI')
      if (si.length) entries.push(otherEntry(side, sec, si))
    }
  const taxed = [...period(lines, 'OUT', from, to), ...period(lines, 'IN', from, to)]
  for (const tax of taxNames(taxed))
    for (const side of ['OUT', 'IN'] as const) {
      const block = period(lines, side, from, to).filter(l => l.tax === tax)
      const sec = sections[side].find(x => x.taxes.includes(tax))
      if (block.length) entries.push({ side, account: sec?.title ?? NAME[side], title: `${tax} (${block[0]!.rate}%)`, rows: block.map(docRow), amount: sum(block) })
    }
  for (const side of ['IN', 'OUT'] as const)
    for (const sec of sections[side]) {
      const rest = sec.others.filter(o => inRange(o) && o.kind !== 'SI')
      for (const kind of [...new Set(rest.map(o => o.kind))].sort((a, b) => kindRank(a) - kindRank(b) || (a < b ? -1 : 1)))
        entries.push({ ...otherEntry(side, sec, rest.filter(o => o.kind === kind)), last: true })
    }
  let total = 0
  for (let i = 0; i < entries.length; ) {
    const side = entries[i]!.side, last = !!entries[i]!.last
    let sideTotal = 0
    rows.push([GROUP[side]])
    // step 3 (remaining postings) always opens a new run, even on the same side and account
    while (i < entries.length && entries[i]!.side === side && !!entries[i]!.last === last) {
      const account = entries[i]!.account
      let accTotal = 0
      rows.push([account])
      for (; i < entries.length && entries[i]!.side === side && !!entries[i]!.last === last && entries[i]!.account === account; i++) {
        const e = entries[i]!
        rows.push([e.title], ...e.rows, [formatIdr(sign(side) * e.amount)])
        accTotal += sign(side) * e.amount
      }
      rows.push([`Total dari ${account}`, formatIdr(accTotal)])
      sideTotal += accTotal
    }
    rows.push([`Total dari ${GROUP[side]}`, formatIdr(sideTotal)])
    total += sideTotal
  }
  rows.push(['Total dari PPN Lebih/Kurang Bayar', formatIdr(total)])
  return rows
}

/** One account per side (named PPN Masukan / PPN Keluaran) built from tax lines only. */
export function taxationInOut(lines: TaxLine[], from: string, to: string): string[][] {
  const sec = (side: 'OUT' | 'IN'): TaxSection[] => [{ title: NAME[side], opening: opening(lines, side, from), taxes: taxNames(lines), others: [] }]
  return taxationInOutBySection(lines, from, to, { IN: sec('IN'), OUT: sec('OUT') })
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
