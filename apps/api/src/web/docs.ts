import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { docTypeSchema, itemDocSchema, journalDocSchema, paymentDocSchema, type DocRow, type DocType, type ItemDocInput, type ItemLine, type PayLine } from '@northline/schemas/docs'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { createCashDocument, deleteCashDocument, editCashDocument } from '../cash-bank/service'
import { createItemAdjustment, deleteItemAdjustment, editItemAdjustment } from '../inventory/adjustment'
import { createPurchaseInvoice, createPurchaseOrder, createPurchasePayment, deletePurchaseInvoice, deletePurchasePayment, editPurchaseInvoice, editPurchasePayment } from '../purchases/service'
import { createPurchaseReturn, createSalesReturn, deletePurchaseReturn, deleteSalesReturn, editPurchaseReturn, editSalesReturn } from '../returns/service'
import { createSalesDownPayment, createSalesInvoice, createSalesOrder, createSalesQuotation, createSalesReceipt, deleteSalesDownPayment, deleteSalesInvoice, deleteSalesReceipt, editSalesDownPayment, editSalesInvoice, editSalesReceipt, nextNumber, period } from '../sales/service'

// The web document screens (ADR-0049, N1): one list per DocType in the web's DocRow shape (rupiah, dd/mm/yyyy), and
// save/delete mapped onto the document services. Amounts in the database are cents.

// shortcut: fixed sandbox accounts the web forms have no field for; add the fields when the forms grow them.
const DP_ACCOUNT = '210102' // Uang Muka Penjualan liability
const ADJUST_ACCOUNT = '300001' // offset of Penyesuaian Persediaan (opening balance equity)

const SOURCE: Record<string, string> = {
  JV: 'Jurnal Umum', SI: 'Faktur Penjualan', SDP: 'Uang Muka Penjualan', SR: 'Penerimaan Penjualan', SRT: 'Retur Penjualan', PI: 'Faktur Pembelian',
  PP: 'Pembayaran Pembelian', PRT: 'Retur Pembelian', OP: 'Pembayaran', OD: 'Penerimaan', IA: 'Penyesuaian Persediaan', FA: 'Aset Tetap',
}
const TYPE_OF: Record<string, DocType> = { JV: 'journal', SI: 'sales-invoice', SDP: 'sales-down-payment', SR: 'sales-receipt', SRT: 'sales-return', PI: 'purchase-invoice',
  PP: 'purchase-payment', PRT: 'purchase-return', OP: 'cash-payment', OD: 'cash-receipt', IA: 'stock-adjustment' }
const INVOICE_TYPES: DocType[] = ['sales-invoice', 'sales-down-payment', 'purchase-invoice']

const rp = (cents: unknown) => Number(cents) / 100
const dmy = (iso: string) => iso.split('-').reverse().join('/')
const iso = (d: string) => d.split('/').reverse().join('-')
const addDays = (isoDate: string, n: number) => new Date(Date.parse(isoDate) + n * 864e5).toISOString().slice(0, 10)
type Row = Record<string, unknown>
const group = (rows: Row[], key: string) => {
  const m = new Map<string, Row[]>()
  for (const r of rows) m.set(r[key] as string, [...(m.get(r[key] as string) ?? []), r])
  return m
}

async function journals(db: Db) {
  const rows = await db.execute(sql`SELECT j.journal_id, j.number, j.source_type, to_char(j.date,'YYYY-MM-DD') AS date, j.description, l.account_no, l.debit, l.credit, l.memo
    FROM journals j JOIN journal_lines l USING (journal_id) ORDER BY j.date, j.number, l.line_no`)
  return group(rows, 'journal_id')
}
const jLines = (rows: Row[] = []) => rows.map(l => ({ account: l.account_no as string, debit: rp(l.debit), credit: rp(l.credit), memo: (l.memo as string) ?? '' }))

/** Item lines in the form's shape; price is the unit price in rupiah. */
async function itemLines(db: Db, table: string, docCol: string, extra = sql``) {
  const rows = await db.execute(sql`SELECT l.${sql.identifier(docCol)} AS doc, l.item_no, i.name, i.unit, l.quantity, l.unit_price ${extra}
    FROM ${sql.identifier(table)} l JOIN items i ON i.no = l.item_no ORDER BY l.seq`)
  const m = new Map<string, ItemLine[]>()
  for (const r of rows) m.set(r.doc as string, [...(m.get(r.doc as string) ?? []), { code: r.item_no as string, name: (r.line_name as string) ?? (r.name as string), unit: r.unit as string, qty: Number(r.quantity), price: rp(r.unit_price), discPct: Number(r.disc_pct ?? 0) }])
  return m
}

const itemValues = (h: Row, party: string, items: ItemLine[], o: Partial<ItemDocInput> = {}): ItemDocInput => ({
  date: dmy(h.date as string), autoNo: false, number: h.number as string, description: h.description as string, party, items,
  discPct: 0, taxable: false, inclusive: false, terms: 'COD', poNo: '', supplierNo: '', dp: [], invoice: '', ...o,
})
const terms = (date: string, due: string) => { const d = Math.round((Date.parse(due) - Date.parse(date)) / 864e5); return d > 0 ? `Net ${d}` : 'COD' }

function row(h: Row, type: DocType, party: string, total: number, js: Map<string, Row[]>, values: DocRow['values'], paid = 0): DocRow {
  const lines = jLines(js.get(h.journal_id as string))
  const status = INVOICE_TYPES.includes(type) ? (paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid') : undefined
  return { id: h.number as string, type, no: h.number as string, jv: h.number as string, date: dmy(h.date as string), party, description: h.description as string,
    source: SOURCE[Object.keys(TYPE_OF).find(k => TYPE_OF[k] === type)!] ?? '', total, lines, values, paid, status }
}

async function salesInvoices(db: Db, js: Map<string, Row[]>, kinds: string[]): Promise<DocRow[]> {
  const hs = await db.execute(sql`SELECT s.number, s.kind, c.name AS party, to_char(s.date,'YYYY-MM-DD') AS date, to_char(s.due_date,'YYYY-MM-DD') AS due, s.description, s.total, s.discount, s.journal_id,
    EXISTS (SELECT 1 FROM sales_invoice_taxes t WHERE t.invoice_number = s.number) AS taxable,
    COALESCE((SELECT SUM(amount) FROM sales_receipt_lines r WHERE r.invoice_number = s.number), 0) + COALESCE((SELECT SUM(amount) FROM sales_dp_usages u WHERE u.invoice_number = s.number), 0) AS paid,
    ARRAY(SELECT dp_number FROM sales_dp_usages u WHERE u.invoice_number = s.number) AS dp
    FROM sales_invoices s JOIN customers c ON c.no = s.customer_no WHERE s.kind IN (${sql.join(kinds.map(x => sql`${x}`), sql`, `)})`)
  const ls = await itemLines(db, 'sales_invoice_lines', 'invoice_number', sql`, l.name AS line_name, l.disc_pct`)
  return hs.map(h => {
    const items = ls.get(h.number as string) ?? [{ code: '', name: (h.description as string) || 'Uang Muka', unit: '', qty: 1, price: rp(h.total), discPct: 0 }]
    const sub = items.reduce((s, i) => s + Math.round(i.qty * i.price * (1 - i.discPct / 100)), 0)
    const discPct = sub ? Math.round((rp(h.discount) / sub) * 10000) / 100 : 0
    const type: DocType = h.kind === 'DP' ? 'sales-down-payment' : 'sales-invoice'
    return row(h, type, h.party as string, rp(h.total), js, itemValues(h, h.party as string, items, { discPct, taxable: !!h.taxable, terms: terms(h.date as string, h.due as string), dp: h.dp as string[] }), rp(h.paid))
  })
}

async function purchaseInvoices(db: Db, js: Map<string, Row[]>): Promise<DocRow[]> {
  const hs = await db.execute(sql`SELECT p.number, v.name AS party, p.bill_number, to_char(p.date,'YYYY-MM-DD') AS date, to_char(p.due_date,'YYYY-MM-DD') AS due, p.description, p.total, p.journal_id,
    EXISTS (SELECT 1 FROM purchase_invoice_taxes t WHERE t.invoice_number = p.number) AS taxable,
    COALESCE((SELECT SUM(amount) FROM purchase_payment_lines r WHERE r.invoice_number = p.number), 0) + COALESCE((SELECT SUM(amount) FROM purchase_dp_usages u WHERE u.invoice_number = p.number), 0) AS paid
    FROM purchase_invoices p JOIN vendors v ON v.no = p.vendor_no WHERE p.kind = 'PI'`)
  const ls = await itemLines(db, 'purchase_invoice_lines', 'invoice_number')
  return hs.map(h => row(h, 'purchase-invoice', h.party as string, rp(h.total), js,
    itemValues(h, h.party as string, ls.get(h.number as string) ?? [], { taxable: !!h.taxable, supplierNo: h.bill_number as string, terms: terms(h.date as string, h.due as string) }), rp(h.paid)))
}

/** Receipts/payments: each line carries what was still owed on its invoice before this document. */
async function payments(db: Db, js: Map<string, Row[]>, side: 'sales' | 'purchase'): Promise<DocRow[]> {
  const s = side === 'sales'
  const [doc, lines, inv, party, partyCol, taxes, lineDoc, settled] = s
    ? ['sales_receipts', 'sales_receipt_lines', 'sales_invoices', 'customers', 'customer_no', 'sales_invoice_taxes', 'receipt_number', 'sales_dp_usages']
    : ['purchase_payments', 'purchase_payment_lines', 'purchase_invoices', 'vendors', 'vendor_no', 'purchase_invoice_taxes', 'payment_number', 'purchase_dp_usages']
  const id = sql.identifier
  const hs = await db.execute(sql`SELECT d.number, p.name AS party, d.bank_no || ' ' || a.name AS bank, to_char(d.date,'YYYY-MM-DD') AS date, d.description, d.amount, d.journal_id
    FROM ${id(doc)} d JOIN ${id(party)} p ON p.no = d.${id(partyCol)} JOIN accounts a ON a.no = d.bank_no`)
  const ls = group(await db.execute(sql`SELECT l.${id(lineDoc)} AS doc, l.invoice_number, l.amount, l.pph_amount, to_char(i.date,'YYYY-MM-DD') AS date, i.total,
    i.total - COALESCE((SELECT SUM(amount) FROM ${id(taxes)} t WHERE t.invoice_number = i.number), 0) AS dpp,
    COALESCE((SELECT SUM(amount) FROM ${id(lines)} o WHERE o.invoice_number = i.number AND o.${id(lineDoc)} <> l.${id(lineDoc)}), 0) + COALESCE((SELECT SUM(amount) FROM ${id(settled)} u WHERE u.invoice_number = i.number), 0) AS others
    FROM ${id(lines)} l JOIN ${id(inv)} i ON i.number = l.invoice_number`), 'doc')
  return hs.map(h => {
    const pay: PayLine[] = (ls.get(h.number as string) ?? []).map(l => ({ invoice: l.invoice_number as string, date: dmy(l.date as string), total: rp(l.total), owing: rp(Number(l.total) - Number(l.others)),
      dpp: rp(l.dpp), pay: rp(l.amount), discount: 0, pph: Number(l.pph_amount ?? 0) > 0 }))
    const values = { date: dmy(h.date as string), autoNo: false, number: h.number as string, description: h.description as string, party: h.party as string, bank: h.bank as string, amount: rp(h.amount), lines: pay }
    return row(h, s ? 'sales-receipt' : 'purchase-payment', h.party as string, rp(h.amount), js, values)
  })
}

async function returns(db: Db, js: Map<string, Row[]>, side: 'sales' | 'purchase'): Promise<DocRow[]> {
  const s = side === 'sales', id = sql.identifier
  const hs = await db.execute(sql`SELECT r.number, p.name AS party, r.invoice_number, to_char(r.date,'YYYY-MM-DD') AS date, r.description, r.total, r.journal_id
    FROM ${id(s ? 'sales_returns' : 'purchase_returns')} r JOIN ${id(s ? 'customers' : 'vendors')} p ON p.no = r.${id(s ? 'customer_no' : 'vendor_no')}`)
  const ls = await itemLines(db, s ? 'sales_return_lines' : 'purchase_return_lines', 'return_number')
  return hs.map(h => row(h, s ? 'sales-return' : 'purchase-return', h.party as string, rp(h.total), js, itemValues(h, h.party as string, ls.get(h.number as string) ?? [], { invoice: h.invoice_number as string })))
}

/** Quotations and orders: no journal, prices stored in cents per unit. */
async function orders(db: Db, js: Map<string, Row[]>, type: 'sales-quotation' | 'sales-order' | 'purchase-order'): Promise<DocRow[]> {
  const [doc, lines, docCol, party, partyCol] = {
    'sales-quotation': ['sales_quotations', 'sales_quotation_lines', 'quotation_number', 'customers', 'customer_no'],
    'sales-order': ['sales_orders', 'sales_order_lines', 'order_number', 'customers', 'customer_no'],
    'purchase-order': ['purchase_orders', 'purchase_order_lines', 'order_number', 'vendors', 'vendor_no'],
  }[type]
  const hs = await db.execute(sql`SELECT d.number, p.name AS party, to_char(d.date,'YYYY-MM-DD') AS date, d.description, d.total FROM ${sql.identifier(doc)} d JOIN ${sql.identifier(party)} p ON p.no = d.${sql.identifier(partyCol)}`)
  const ls = await itemLines(db, lines, docCol)
  return hs.map(h => ({ ...row(h, type, h.party as string, rp(h.total), js, itemValues(h, h.party as string, ls.get(h.number as string) ?? [])), source: '' }))
}

async function cashDocs(db: Db, js: Map<string, Row[]>, kind: 'PAY' | 'DEP'): Promise<DocRow[]> {
  const hs = await db.execute(sql`SELECT number, to_char(date,'YYYY-MM-DD') AS date, description, amount, journal_id FROM cash_documents WHERE kind = ${kind}`)
  return hs.map(h => row(h, kind === 'PAY' ? 'cash-payment' : 'cash-receipt', '', rp(h.amount), js,
    { date: dmy(h.date as string), autoNo: false, number: h.number as string, description: h.description as string, lines: jLines(js.get(h.journal_id as string)) }))
}

async function adjustments(db: Db, js: Map<string, Row[]>): Promise<DocRow[]> {
  const hs = await db.execute(sql`SELECT number, to_char(date,'YYYY-MM-DD') AS date, description, journal_id FROM item_adjustments`)
  // cost is the line's total cost in cents; the form shows a unit price
  const ls = group(await db.execute(sql`SELECT l.adjustment_number AS doc, l.item_no, i.name, i.unit, l.quantity, l.cost FROM item_adjustment_lines l JOIN items i ON i.no = l.item_no ORDER BY l.seq`), 'doc')
  return hs.map(h => {
    const items = (ls.get(h.number as string) ?? []).map(l => ({ code: l.item_no as string, name: l.name as string, unit: l.unit as string, qty: Number(l.quantity), price: rp(Number(l.cost) / Number(l.quantity)), discPct: 0 }))
    const lines = jLines(js.get(h.journal_id as string))
    return row(h, 'stock-adjustment', '', lines.reduce((s, l) => s + l.debit, 0), js, itemValues(h, '', items))
  })
}

/** Jurnal Umum lists every journal; documents' journals are tagged with their source and edited from the document. */
function allJournals(js: Map<string, Row[]>): DocRow[] {
  return [...js.entries()].map(([id, ls]) => {
    const h = ls[0]!, lines = jLines(ls)
    return { id, type: TYPE_OF[h.source_type as string] ?? null, no: h.number as string, jv: h.number as string, date: dmy(h.date as string), party: '', description: h.description as string,
      source: SOURCE[h.source_type as string] ?? (h.source_type as string), total: lines.reduce((s, l) => s + l.debit, 0), lines, paid: 0 }
  })
}

export async function docRows(db: Db, type: DocType): Promise<DocRow[]> {
  const js = await journals(db)
  const rows = await {
    'sales-quotation': () => orders(db, js, 'sales-quotation'),
    'sales-order': () => orders(db, js, 'sales-order'),
    'sales-down-payment': () => salesInvoices(db, js, ['DP']),
    'sales-invoice': () => salesInvoices(db, js, ['SI', 'DP']),
    'sales-receipt': () => payments(db, js, 'sales'),
    'sales-return': () => returns(db, js, 'sales'),
    'purchase-order': () => orders(db, js, 'purchase-order'),
    'purchase-invoice': () => purchaseInvoices(db, js),
    'purchase-payment': () => payments(db, js, 'purchase'),
    'purchase-return': () => returns(db, js, 'purchase'),
    'cash-receipt': () => cashDocs(db, js, 'DEP'),
    'cash-payment': () => cashDocs(db, js, 'PAY'),
    journal: async () => allJournals(js),
    'stock-adjustment': () => adjustments(db, js),
  }[type]()
  const key = (d: string) => d.split('/').reverse().join('')
  return rows.sort((a, b) => key(b.date).localeCompare(key(a.date)) || b.jv.localeCompare(a.jv))
}

// ---- save / delete ----

async function partyNo(db: Db, table: 'customers' | 'vendors', name: string) {
  const [p] = await db.execute(sql`SELECT no FROM ${sql.identifier(table)} WHERE name = ${name} OR no = ${name} LIMIT 1`)
  if (!p) throw new DomainError(`${table === 'customers' ? 'Pelanggan' : 'Pemasok'} ${name} tidak ditemukan`)
  return p.no as string
}
const netPrice = (i: ItemLine) => Math.round(i.price * (1 - i.discPct / 100) * 100) / 100
const dueDate = (date: string, t: string) => addDays(date, Number(/\d+/.exec(t)?.[0] ?? 0))
function noUnsupported(v: { inclusive?: boolean; lines?: { discount?: number }[] }) {
  // shortcut: the services have no tax-inclusive price or payment discount yet; refuse instead of saving a different amount
  if (v.inclusive) throw new DomainError('Harga termasuk pajak belum didukung')
  if (v.lines?.some(l => (l.discount ?? 0) > 0)) throw new DomainError('Diskon pembayaran belum didukung')
}

const saveBody = z.object({ idempotencyKey: z.string().min(8), values: z.unknown() })

async function save(db: Db, type: DocType, idempotencyKey: string, raw: unknown, current?: string) {
  const k = idempotencyKey
  const head = (v: { date: string; autoNo: boolean; number: string; description: string }) => ({ idempotencyKey: k, date: iso(v.date), description: v.description, number: current ?? (v.autoNo ? undefined : v.number) })
  const onlyCreate = () => { if (current) throw new DomainError('Dokumen ini belum bisa diubah') }
  switch (type) {
    case 'sales-quotation': case 'sales-order': {
      onlyCreate()
      const v = itemDocSchema.parse(raw), customer = await partyNo(db, 'customers', v.party)
      const o = { number: v.autoNo ? undefined : v.number, customer, date: iso(v.date), description: v.description, lines: v.items.map(i => ({ item: i.code, qty: i.qty, price: netPrice(i) })) }
      return type === 'sales-quotation' ? createSalesQuotation(db, o) : createSalesOrder(db, o)
    }
    case 'purchase-order': {
      onlyCreate()
      const v = itemDocSchema.parse(raw)
      return createPurchaseOrder(db, { number: v.autoNo ? undefined : v.number, vendor: await partyNo(db, 'vendors', v.party), date: iso(v.date), description: v.description, lines: v.items.map(i => ({ item: i.code, qty: i.qty, price: netPrice(i) })) })
    }
    case 'sales-invoice': {
      const v = itemDocSchema.parse(raw); noUnsupported(v)
      const dps = v.dp.length ? await db.execute(sql`SELECT number, total FROM sales_invoices WHERE kind = 'DP' AND number IN (${sql.join(v.dp.map(d => sql`${d}`), sql`, `)})`) : []
      const input = { ...head(v), customer: await partyNo(db, 'customers', v.party), dueDate: dueDate(iso(v.date), v.terms), taxable: v.taxable, discPct: v.discPct,
        lines: v.items.map(i => ({ item: i.code, name: i.name, qty: i.qty, price: i.price, discPct: i.discPct })), downPayments: dps.map(d => ({ invoice: d.number as string, amount: rp(d.total) })) }
      return current ? editSalesInvoice(db, current, input) : createSalesInvoice(db, input)
    }
    case 'sales-down-payment': {
      const v = itemDocSchema.parse(raw); noUnsupported(v)
      const amount = v.items.reduce((s, i) => s + Math.round(i.qty * i.price * (1 - i.discPct / 100)), 0)
      const input = { ...head(v), customer: await partyNo(db, 'customers', v.party), amount, dpAccount: DP_ACCOUNT }
      return current ? editSalesDownPayment(db, current, input) : createSalesDownPayment(db, input)
    }
    case 'purchase-invoice': {
      const v = itemDocSchema.parse(raw); noUnsupported(v)
      const input = { ...head(v), vendor: await partyNo(db, 'vendors', v.party), bill: v.supplierNo, dueDate: dueDate(iso(v.date), v.terms), taxable: v.taxable,
        lines: v.items.map(i => ({ item: i.code, qty: i.qty, price: netPrice(i) })) }
      return current ? editPurchaseInvoice(db, current, input) : createPurchaseInvoice(db, input)
    }
    case 'sales-receipt': {
      const v = paymentDocSchema.parse(raw); noUnsupported(v)
      if (current && (await db.execute(sql`SELECT 1 FROM sales_receipt_lines WHERE receipt_number = ${current} AND pph_amount > 0 LIMIT 1`)).length)
        throw new DomainError('Penerimaan dengan PPh belum bisa diubah dari formulir ini')
      // shortcut: PPh on sales receipts needs a bukti-potong tax the form does not ask for; only purchase payments withhold PPh 23 here
      const input = { ...head(v), customer: await partyNo(db, 'customers', v.party), bank: v.bank.split(' ')[0]!, amount: v.amount,
        payments: v.lines.filter(l => l.pay > 0).map(l => ({ invoice: l.invoice, amount: l.pay })) }
      return current ? editSalesReceipt(db, current, input) : createSalesReceipt(db, input)
    }
    case 'purchase-payment': {
      const v = paymentDocSchema.parse(raw); noUnsupported(v)
      const [pph23] = v.lines.some(l => l.pph) ? await db.execute(sql`SELECT name, rate FROM taxes WHERE pph_type LIKE '%23%' ORDER BY seq LIMIT 1`) : []
      if (v.lines.some(l => l.pph) && !pph23) throw new DomainError('Pajak PPh 23 belum diatur')
      const input = { ...head(v), vendor: await partyNo(db, 'vendors', v.party), bank: v.bank.split(' ')[0]!,
        payments: v.lines.filter(l => l.pay > 0).map(l => ({ invoice: l.invoice, amount: l.pay, ...(l.pph ? { pph: { tax: pph23!.name as string, dpp: l.dpp, rate: Number(pph23!.rate) } } : {}) })) }
      return current ? editPurchasePayment(db, current, input) : createPurchasePayment(db, input)
    }
    case 'sales-return': case 'purchase-return': {
      const v = itemDocSchema.parse(raw)
      const input = { ...head(v), invoice: v.invoice, lines: v.items.map(i => ({ item: i.code, qty: i.qty, price: netPrice(i) })) }
      if (type === 'sales-return') return current ? editSalesReturn(db, current, input) : createSalesReturn(db, input)
      return current ? editPurchaseReturn(db, current, input) : createPurchaseReturn(db, input)
    }
    case 'stock-adjustment': {
      const v = itemDocSchema.parse(raw)
      if (current && (await db.execute(sql`SELECT 1 FROM item_adjustments a WHERE a.number = ${current} AND (a.account <> ${ADJUST_ACCOUNT}
        OR EXISTS (SELECT 1 FROM item_adjustment_lines l WHERE l.adjustment_number = a.number AND l.direction = 'OUT'))`)).length)
        throw new DomainError('Penyesuaian dengan pengurangan atau akun lain belum bisa diubah dari formulir ini')
      // shortcut: the form has no direction or offset account; every line is an increase at its price, offset to ADJUST_ACCOUNT
      const input = { ...head(v), account: ADJUST_ACCOUNT, lines: v.items.map(i => ({ item: i.code, direction: 'IN' as const, qty: i.qty, unitCost: i.price })) }
      return current ? editItemAdjustment(db, current, input) : createItemAdjustment(db, input)
    }
    case 'cash-receipt': case 'cash-payment': {
      const v = journalDocSchema.parse(raw), pay = type === 'cash-payment'
      const banks = new Set((await db.execute(sql`SELECT no FROM accounts WHERE type = 'CASH_BANK'`)).map(r => r.no as string))
      // the bank is the one cash/bank line on the bank's side (credit on a payment, debit on a receipt)
      const bankLines = v.lines.filter(l => banks.has(l.account) && (pay ? l.credit : l.debit) > 0)
      if (bankLines.length !== 1) throw new DomainError('Pilih satu akun Kas & Bank')
      const lines = v.lines.filter(l => l !== bankLines[0]).map(l => ({ account: l.account, amount: pay ? l.debit - l.credit : l.credit - l.debit, notes: l.memo }))
      if (lines.some(l => l.amount <= 0)) throw new DomainError(pay ? 'Rincian pembayaran harus di sisi debit' : 'Rincian penerimaan harus di sisi kredit')
      const input = { ...head(v), kind: pay ? 'PAY' as const : 'DEP' as const, bank: bankLines[0]!.account, lines }
      return current ? editCashDocument(db, current, input) : createCashDocument(db, input)
    }
    case 'journal': {
      const v = journalDocSchema.parse(raw)
      const lines = v.lines.map(l => ({ account: l.account, side: l.debit > 0 ? 'DEBIT' as const : 'CREDIT' as const, amount: l.debit || l.credit, memo: l.memo || undefined }))
      return db.transaction(async tx => {
        if (current) {
          const [j] = await tx.execute(sql`SELECT source_type, number FROM journals WHERE journal_id = ${current}`)
          if (!j) throw new DomainError(`Jurnal ${current} tidak ditemukan`)
          if (j.source_type !== 'JV') throw new DomainError(`Jurnal ${j.number} dibuat oleh ${SOURCE[j.source_type as string] ?? j.source_type}; ubah dari dokumen sumbernya`)
          await handleTx(tx, { type: 'EditJournal', idempotencyKey: k, journalId: current, number: j.number as string, date: iso(v.date), description: v.description, lines })
          return { number: j.number as string }
        }
        const number = v.autoNo ? await nextNumber(tx, `JV.${period(iso(v.date))}`) : v.number
        await handleTx(tx, { type: 'PostJournal', idempotencyKey: k, journalId: crypto.randomUUID(), number, date: iso(v.date), description: v.description, lines })
        return { number }
      })
    }
  }
}

async function remove(db: Db, type: DocType, id: string, k: string) {
  if (INVOICE_TYPES.includes(type)) {
    const [p] = await db.execute(sql`SELECT 1 FROM sales_receipt_lines WHERE invoice_number = ${id} UNION ALL SELECT 1 FROM purchase_payment_lines WHERE invoice_number = ${id} LIMIT 1`)
    if (p) return { paid: true as const }
  }
  const fn = {
    'sales-invoice': deleteSalesInvoice, 'sales-down-payment': deleteSalesDownPayment, 'sales-receipt': deleteSalesReceipt, 'sales-return': deleteSalesReturn,
    'purchase-invoice': deletePurchaseInvoice, 'purchase-payment': deletePurchasePayment, 'purchase-return': deletePurchaseReturn,
    'cash-receipt': deleteCashDocument, 'cash-payment': deleteCashDocument, 'stock-adjustment': deleteItemAdjustment,
  }[type as 'sales-invoice']
  // a sales invoice row may be a down payment (both are listed under Faktur Penjualan)
  if (type === 'sales-invoice' && (await db.execute(sql`SELECT 1 FROM sales_invoices WHERE number = ${id} AND kind = 'DP'`)).length) return deleteSalesDownPayment(db, id, k)
  if (fn) return fn(db, id, k)
  if (type !== 'journal') throw new DomainError('Dokumen ini belum bisa dihapus')
  const [j] = await db.execute(sql`SELECT source_type, number FROM journals WHERE journal_id = ${id}`)
  if (!j) throw new DomainError(`Jurnal ${id} tidak ditemukan`)
  if (j.source_type !== 'JV') throw new DomainError(`Jurnal ${j.number} dibuat oleh ${SOURCE[j.source_type as string] ?? j.source_type}; hapus dari dokumen sumbernya`)
  await handle(db, k, id)
  return { number: j.number as string }
}
const handle = (db: Db, k: string, journalId: string) => db.transaction(tx => handleTx(tx, { type: 'DeleteJournal', idempotencyKey: k, journalId }))

const TYPES = `{${docTypeSchema.options.join('|')}}`
export function webDocRoutes(db: Db) {
  const type = (t: string) => docTypeSchema.parse(t)
  return new Hono<AuthEnv>()
    .get(`/:type${TYPES}`, async c => c.json(await docRows(db, type(c.req.param('type')))))
    .post(`/:type${TYPES}`, async c => { const b = saveBody.parse(await c.req.json()); return c.json(await save(db, type(c.req.param('type')), b.idempotencyKey, b.values), 201) })
    .put(`/:type${TYPES}/:id`, async c => { const b = saveBody.parse(await c.req.json()); return c.json(await save(db, type(c.req.param('type')), b.idempotencyKey, b.values, c.req.param('id'))) })
    .delete(`/:type${TYPES}/:id`, async c => {
      const r = await remove(db, type(c.req.param('type')), c.req.param('id'), z.object({ idempotencyKey: z.string().min(8) }).parse(await c.req.json()).idempotencyKey)
      return 'paid' in r ? c.json({ error: 'paid', code: 'paid' }, 409) : c.json(r)
    })
}
