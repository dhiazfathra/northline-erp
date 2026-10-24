import type { DocKind, DocRow, DocType, DocValues, ItemDocInput, PayLine } from '@northline/schemas/docs'
import { vendors } from '@northline/schemas/fixtures'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { moduleListQuery } from './overview'

interface Meta {
  kind: DocKind
  /** Number series shown before saving; the API assigns the real number from the document date. */
  prefix: string
  party: 'customer' | 'vendor' | null
}
const bank = '1101.2026.10.'
export const docMeta: Record<DocType, Meta> = {
  'sales-quotation': { kind: 'items', prefix: 'SQ.2026.10.', party: 'customer' },
  'sales-order': { kind: 'items', prefix: 'SO.2026.10.', party: 'customer' },
  'sales-down-payment': { kind: 'items', prefix: 'SI.2026.10.', party: 'customer' },
  'sales-invoice': { kind: 'items', prefix: 'SI.2026.10.', party: 'customer' },
  'sales-receipt': { kind: 'payment', prefix: bank, party: 'customer' },
  'sales-return': { kind: 'items', prefix: 'SRT.2026.10.', party: 'customer' },
  'purchase-order': { kind: 'items', prefix: 'PO.2026.10.', party: 'vendor' },
  'purchase-invoice': { kind: 'items', prefix: 'PI.2026.10.', party: 'vendor' },
  'purchase-payment': { kind: 'payment', prefix: bank, party: 'vendor' },
  'purchase-return': { kind: 'items', prefix: 'PRT.2026.10.', party: 'vendor' },
  'cash-receipt': { kind: 'journal', prefix: bank, party: null },
  'cash-payment': { kind: 'journal', prefix: bank, party: null },
  journal: { kind: 'journal', prefix: 'JV.2026.10.', party: null },
  'stock-adjustment': { kind: 'items', prefix: 'IA.2026.10.', party: null },
}
/** Picker names: the API resolves a party by name, so they come from the same master list as the module screens. */
export function useParties(t: DocType) {
  const party = docMeta[t].party
  const { data } = useQuery({ ...moduleListQuery(party === 'vendor' ? 'vendors' : 'customers'), enabled: party !== null })
  return party ? (data ?? []).map((p) => p.name) : []
}
/** Items for the picker; the item list row carries "TYPE · UNIT" in `contact`. shortcut: no price list yet, lines start at 0 — add prices when the API exposes them. */
export function useCatalog() {
  const { data } = useQuery(moduleListQuery('items'))
  return (data ?? []).map((r) => ({ code: r.id, name: r.name, unit: r.contact.split(' · ')[1] ?? '', sellPrice: 0, buyPrice: 0 }))
}
// shortcut: PPh 23 flag per vendor still comes from fixtures; the vendors table has no such column yet.
export { vendors }

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

// ---- API (/api/web/docs, plain fetch: the routes sit outside the typed client) ----

export class PaidInvoiceError extends Error {}

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/web/docs/${path}`, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (res.ok) return data as T
  if (data.code === 'paid') throw new PaidInvoiceError(path)
  throw new Error(data.error === 'validation' ? data.issues.map((i: { message: string }) => i.message).join('; ') : (data.error ?? `Permintaan gagal (${res.status})`))
}

/** Rows newest first, amounts in rupiah, invoices with paid/status. */
export const docsQuery = (t: DocType) => queryOptions({ queryKey: ['docs', t], queryFn: () => call<DocRow[]>(t) })

/** Invoices of this party still owed, from the invoice list of the receipt/payment's side. */
export const openInvoices = (invoices: DocRow[] | undefined, party: string): PayLine[] =>
  (invoices ?? [])
    .filter((r) => r.party === party)
    .map((r) => {
      const tt = r.values ? itemTotals(r.values as ItemDocInput) : { total: r.total, tax: 0 }
      return { invoice: r.no, date: r.date, total: r.total, owing: r.total - r.paid, dpp: tt.total - tt.tax, pay: 0, discount: 0, pph: false }
    })
    .filter((l) => l.owing > 0)

export const downPaymentsFor = (rows: DocRow[] | undefined, party: string) => (rows ?? []).filter((r) => r.type === 'sales-down-payment' && r.party === party).map((r) => ({ no: r.no, total: r.total, date: r.date }))
export const invoicesFor = (rows: DocRow[] | undefined, party: string) => (rows ?? []).filter((r) => r.party === party && r.type !== 'sales-down-payment').map((r) => r.no)
export const recordValues = (rows: DocRow[] | undefined, no: string) => rows?.find((r) => r.no === no)?.values

export interface SaveDoc {
  /** Record id when editing (document number, or journal id for Jurnal Umum). */
  id?: string
  type: DocType
  values: DocValues
}

export function useSaveDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: SaveDoc) =>
      call<{ number: string }>(d.id ? `${d.type}/${encodeURIComponent(d.id)}` : d.type, d.id ? 'PUT' : 'POST', { idempotencyKey: crypto.randomUUID(), values: d.values }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  })
}

export function useDeleteDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: { type: DocType; id: string }) => call<unknown>(`${d.type}/${encodeURIComponent(d.id)}`, 'DELETE', { idempotencyKey: crypto.randomUUID() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  })
}
