import type { DocKind, DocRecord, DocRow, DocType, DocValues, ItemDocInput, ItemLine, PayLine, PaymentDocInput } from '@northline/schemas/docs'
import { customers, items, journals, type SourceType, vendors } from '@northline/schemas/fixtures'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

interface Meta {
  kind: DocKind
  /** Number series; auto-number = max existing + 1. */
  prefix: string
  party: 'customer' | 'vendor' | null
  /** Fixture source types listed under this doc type. */
  sources: SourceType[]
}
const bank = '1101.2026.10.'
export const docMeta: Record<DocType, Meta> = {
  'sales-quotation': { kind: 'items', prefix: 'SQ.2026.10.', party: 'customer', sources: [] },
  'sales-order': { kind: 'items', prefix: 'SO.2026.10.', party: 'customer', sources: [] },
  'sales-down-payment': { kind: 'items', prefix: 'SI.2026.10.', party: 'customer', sources: ['Uang Muka Penjualan'] },
  'sales-invoice': { kind: 'items', prefix: 'SI.2026.10.', party: 'customer', sources: ['Faktur Penjualan', 'Uang Muka Penjualan'] },
  'sales-receipt': { kind: 'payment', prefix: bank, party: 'customer', sources: ['Penerimaan Penjualan'] },
  'sales-return': { kind: 'items', prefix: 'SRT.2026.10.', party: 'customer', sources: ['Retur Penjualan'] },
  'purchase-order': { kind: 'items', prefix: 'PO.2026.10.', party: 'vendor', sources: [] },
  'purchase-invoice': { kind: 'items', prefix: 'PI.2026.10.', party: 'vendor', sources: ['Faktur Pembelian'] },
  'purchase-payment': { kind: 'payment', prefix: bank, party: 'vendor', sources: ['Pembayaran Pembelian'] },
  'purchase-return': { kind: 'items', prefix: 'PRT.2026.10.', party: 'vendor', sources: ['Retur Pembelian'] },
  'cash-receipt': { kind: 'journal', prefix: bank, party: null, sources: [] },
  'cash-payment': { kind: 'journal', prefix: bank, party: null, sources: ['Pembayaran'] },
  journal: { kind: 'journal', prefix: 'JV.2026.10.', party: null, sources: [] },
  'stock-adjustment': { kind: 'items', prefix: 'IA.2026.10.', party: null, sources: ['Penyesuaian Persediaan'] },
}
const typeOfSource: Partial<Record<SourceType, DocType>> = {
  'Jurnal Umum': 'journal',
  'Penyesuaian Persediaan': 'stock-adjustment',
  'Faktur Penjualan': 'sales-invoice',
  'Uang Muka Penjualan': 'sales-down-payment',
  'Penerimaan Penjualan': 'sales-receipt',
  'Faktur Pembelian': 'purchase-invoice',
  'Pembayaran Pembelian': 'purchase-payment',
  'Retur Pembelian': 'purchase-return',
  'Retur Penjualan': 'sales-return',
  Pembayaran: 'cash-payment',
}
export const invoiceTypes: DocType[] = ['sales-invoice', 'sales-down-payment', 'purchase-invoice']
export const partiesFor = (t: DocType) => (docMeta[t].party === 'vendor' ? vendors : docMeta[t].party === 'customer' ? customers : []).map((p) => p.name)
export { items as catalog, vendors }

// ---- totals ----

export const PPN = 0.11
export const PPH23 = 0.04

export function itemTotals(v: Pick<ItemDocInput, 'items' | 'discPct' | 'taxable' | 'inclusive' | 'dp'>, dpTotal = 0) {
  const sub = v.items.reduce((s, i) => s + Math.round(i.qty * i.price * (1 - i.discPct / 100)), 0)
  const disc = Math.round((sub * v.discPct) / 100)
  const base = sub - disc
  const tax = !v.taxable ? 0 : v.inclusive ? Math.round((base * 11) / 111) : Math.round(base * PPN)
  const total = v.inclusive ? base : base + tax
  return { sub, disc, tax, total, dp: dpTotal, owing: total - dpTotal }
}

export const pphOf = (l: PayLine) => (l.pph ? Math.round(l.dpp * PPH23) : 0)
export function payTotals(lines: PayLine[]) {
  const pay = lines.reduce((s, l) => s + l.pay, 0)
  const discount = lines.reduce((s, l) => s + l.discount, 0)
  const pph = lines.reduce((s, l) => s + pphOf(l), 0)
  return { pay, discount, pph, net: pay - discount - pph }
}

// ---- seed: fixture journals plus the document detail the journals imply ----

const item = (code: string, qty: number, price: number, discPct = 0): ItemLine => {
  const i = items.find((x) => x.code === code)!
  return { code, name: i.name, unit: i.unit, qty, price, discPct }
}
const itemDoc = (party: string, lines: ItemLine[], o: Partial<ItemDocInput> = {}): Partial<ItemDocInput> & { party: string } => ({
  party,
  items: lines,
  discPct: 0,
  taxable: false,
  inclusive: false,
  terms: 'Net 30',
  poNo: '',
  supplierNo: '',
  dp: [],
  invoice: '',
  ...o,
})
const seedValues: Record<string, ReturnType<typeof itemDoc> | (Partial<PaymentDocInput> & { party: string })> = {
  'IA.2026.10.00001': itemDoc('', [item('BRG-B', 5, 120_000)]),
  'IA.2026.10.00002': itemDoc('', [item('BRG-A', 5, 120_000)]),
  'SI.2026.10.00001': itemDoc('PT Pelanggan Uji', [item('BRG-A', 5, 200_000, 10)], { discPct: 5, taxable: true, poNo: 'PO-PU-0912' }),
  'SI.2026.10.00002': itemDoc('PT Pelanggan Uji', [item('BRG-B', 7, 200_000)]),
  'SI.2026.10.00003': itemDoc('CV Jasa Mandiri', [{ code: 'JSA-01', name: 'Uang Muka Jasa', unit: 'JAM', qty: 1, price: 1_110_000, discPct: 0 }], { taxable: true, inclusive: true, terms: 'Net 14' }),
  'SI.2026.10.00004': itemDoc('CV Jasa Mandiri', [item('JSA-01', 2, 1_000_000)], { taxable: true, terms: 'Net 14', dp: ['SI.2026.10.00003'] }),
  // shortcut: USD invoice shown in IDR at the 15,000 booking rate; no currency field on the form.
  'SI.2026.10.00005': itemDoc('Global Trade Ltd', [{ code: 'BRG-A', name: 'Barang A (USD 100)', unit: 'PCS', qty: 1, price: 1_500_000, discPct: 0 }]),
  'SI.2026.10.00006': itemDoc('PT Pelanggan Uji', [item('BRG-B', 1, 200_000)]),
  'PI.2026.10.00001': itemDoc('PT Konsultan Uji', [item('JSA-KNS', 1, 1_000_000)], { taxable: true, supplierNo: 'INV/KU/2026/118' }),
  'PI.2026.10.00002': itemDoc('PT Pemasok Barang', [item('BRG-B', 5, 150_000)], { supplierNo: 'PB-2026-0457' }),
  'PRT.2026.10.00001': itemDoc('PT Pemasok Barang', [item('BRG-B', 1, 150_000)], { invoice: 'PI.2026.10.00002' }),
  'SRT.2026.10.00001': itemDoc('PT Pelanggan Uji', [item('BRG-B', 1, 200_000)], { invoice: 'SI.2026.10.00006' }),
}
const payLine = (invoice: string, date: string, total: number, dpp: number, pay: number, pph = false): PayLine => ({ invoice, date, total, owing: total, dpp, pay, discount: 0, pph })
const paySeed = (party: string, b: string, amount: number, lines: PayLine[]) => ({ party, bank: b, amount, lines })
Object.assign(seedValues, {
  '1101.2026.10.00001': paySeed('PT Pelanggan Uji', '1101 Bank Uji', 949_050, [payLine('SI.2026.10.00001', '06/10/2026', 949_050, 855_000, 949_050)]),
  '1101.2026.10.00002': paySeed('PT Konsultan Uji', '1101 Bank Uji', 1_070_000, [payLine('PI.2026.10.00001', '07/10/2026', 1_110_000, 1_000_000, 1_110_000, true)]),
  '1101.2026.10.00003': paySeed('CV Jasa Mandiri', '1101 Bank Uji', 1_110_000, [payLine('SI.2026.10.00003', '12/10/2026', 1_110_000, 1_000_000, 1_110_000)]),
  '1103.2026.10.00001': paySeed('Global Trade Ltd', '1103 Bank USD', 1_500_000, [payLine('SI.2026.10.00005', '14/10/2026', 1_500_000, 1_500_000, 1_500_000)]),
})

const cash = (a: string) => ['1101', '1102', '1103'].includes(a)
function seedTotal(src: SourceType, lines: DocRecord['lines']) {
  const sum = (f: (l: DocRecord['lines'][number]) => number) => lines.reduce((s, l) => s + f(l), 0)
  switch (src) {
    case 'Faktur Penjualan':
    case 'Uang Muka Penjualan':
      return lines.find((l) => l.account === '110301' && l.debit)!.debit
    case 'Faktur Pembelian':
      return sum((l) => (l.account === '210101' ? l.credit : 0))
    case 'Penerimaan Penjualan':
      return sum((l) => (cash(l.account) ? l.debit : 0))
    case 'Pembayaran Pembelian':
    case 'Pembayaran':
      return sum((l) => (cash(l.account) ? l.credit : 0))
    default:
      return sum((l) => l.debit)
  }
}

let records: DocRecord[] = journals.map((j) => {
  const v = seedValues[j.no]
  const type = typeOfSource[j.source] ?? null
  const values =
    type === 'journal' || type === 'cash-payment'
      ? { date: j.date, autoNo: true, number: j.no, description: j.description, lines: j.lines.map((l) => ({ ...l, memo: l.memo ?? '' })) }
      : v && { date: j.date, autoNo: true, number: j.no, description: j.description, ...v }
  return {
    id: j.jv,
    type,
    no: j.no,
    jv: j.jv,
    date: j.date,
    party: v?.party ?? '',
    description: j.description,
    source: j.source,
    total: seedTotal(j.source, j.lines),
    lines: j.lines,
    values: values as DocValues | undefined,
  }
})

/** Amount settled on an invoice: payment lines plus down payments applied to it. */
function paidOf(no: string, except?: string) {
  let paid = 0
  for (const r of records) {
    if (r.id === except || !r.values) continue
    const v = r.values as Partial<PaymentDocInput & ItemDocInput>
    if (r.type && docMeta[r.type].kind === 'payment') for (const l of v.lines ?? []) if (l.invoice === no) paid += l.pay
    if (r.no === no && v.dp?.length) paid += v.dp.reduce((s, d) => s + (records.find((x) => x.no === d)?.total ?? 0), 0)
  }
  return paid
}

function toRow(r: DocRecord): DocRow {
  const paid = r.type && invoiceTypes.includes(r.type) ? paidOf(r.no) : 0
  const status = r.type && invoiceTypes.includes(r.type) ? (paid >= r.total ? 'paid' : paid > 0 ? 'partial' : 'unpaid') : undefined
  return { ...r, paid, status }
}

const byDateDesc = (a: DocRecord, b: DocRecord) => {
  const k = (d: string) => d.split('/').reverse().join('')
  return k(b.date).localeCompare(k(a.date)) || b.jv.localeCompare(a.jv)
}
function rowsFor(t: DocType) {
  const m = docMeta[t]
  const list = t === 'journal' ? records : records.filter((r) => r.type === t || (r.type && m.sources.length && m.sources.includes(r.source as SourceType)))
  return [...list].sort(byDateDesc).map(toRow)
}

export const docsQuery = (t: DocType) => queryOptions({ queryKey: ['docs', t], queryFn: () => mock(rowsFor(t)) })

export function nextNumber(prefix: string) {
  const max = records.flatMap((r) => [r.no, r.jv]).filter((n) => n.startsWith(prefix)).reduce((m, n) => Math.max(m, Number(n.slice(prefix.length))), 0)
  return prefix + String(max + 1).padStart(5, '0')
}

/** Invoices of this party still owed, for a new receipt/payment (excluding the doc being edited). */
export function openInvoices(t: DocType, party: string, except?: string): PayLine[] {
  const src: SourceType[] = t === 'sales-receipt' ? ['Faktur Penjualan', 'Uang Muka Penjualan'] : ['Faktur Pembelian']
  return records
    .filter((r) => r.party === party && src.includes(r.source as SourceType))
    .map((r) => {
      const v = r.values as ItemDocInput | undefined
      const tt = v ? itemTotals(v) : { total: r.total, tax: 0 }
      return { invoice: r.no, date: r.date, total: r.total, owing: r.total - paidOf(r.no, except), dpp: tt.total - tt.tax, pay: 0, discount: 0, pph: false }
    })
    .filter((l) => l.owing > 0)
}

export const downPaymentsFor = (party: string) => records.filter((r) => r.source === 'Uang Muka Penjualan' && r.party === party).map((r) => ({ no: r.no, total: r.total, date: r.date }))
export const invoicesFor = (party: string, src: SourceType) => records.filter((r) => r.party === party && r.source === src).map((r) => r.no)
export const recordValues = (no: string) => records.find((r) => r.no === no)?.values

export interface SaveDoc {
  id?: string
  type: DocType
  source: string
  no: string
  date: string
  party: string
  description: string
  total: number
  values: DocValues
}

export function useSaveDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: SaveDoc) => {
      const old = d.id && records.find((r) => r.id === d.id)
      const lines = 'lines' in d.values && d.values.lines.length && 'account' in d.values.lines[0] ? (d.values.lines as DocRecord['lines']) : []
      if (old) Object.assign(old, { ...d, id: old.id, lines: lines.length ? lines : old.lines })
      else records.push({ ...d, id: d.no, jv: d.type === 'journal' ? d.no : nextNumber('JV.2026.10.'), lines })
      return mock(d, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  })
}

export class PaidInvoiceError extends Error {}

export function useDeleteDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = records.find((x) => x.id === id)
      if (r && r.type && invoiceTypes.includes(r.type) && paidOf(r.no) > 0) throw new PaidInvoiceError(r.no)
      records = records.filter((x) => x.id !== id)
      return mock(id, 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  })
}
