import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate } from './general-ledger'
import { loadSalesTargets, type SalesTarget } from './targets'

// Tenaga Penjual reports (Retail Demo, en-US numbers); rules in docs/reports/<planId>.md and ADR-0023
// (fixture: fixtures/retail/salesman-rc.json). Amounts are cents IDR; foreign invoices print in their own currency.

export interface SmLine { item: string; itemName: string; qty: number; total: number; salesmen: string[] }
export interface SmInvoice { number: string; customer: string; currency: string; rate: number; date: string; dueDate: string; total: number; lines: SmLine[]; salesman?: string }
export interface SmReceipt { number: string; customer: string; date: string; amount: number; payments: { invoice: string; amount: number }[] }
export interface SmReturn { number: string; customer: string; invoice: string; date: string; total: number; lines: { total: number; salesmen: string[] }[]; salesman?: string }
export interface Commission { name: string; percent: number; levels: number[]; salesmen: string[] | null }
export interface CheckIn { date: string; salesman: string; address: string; customerName: string; phone: string; contact: string; transaction: string }
export interface SalesmanData { salesmen: Map<string, string>; invoices: SmInvoice[]; receipts: SmReceipt[]; returns: SmReturn[]; commissions: Commission[]; targets: SalesTarget[]; checkIns: CheckIn[] }

/** The document's salesman (Accurate's masterSalesman): set only when every line carries the same salesmen. */
const master = (lines: { salesmen: string[] }[]) =>
  lines.length && lines[0]!.salesmen.length && lines.every(l => l.salesmen.join() === lines[0]!.salesmen.join()) ? lines[0]!.salesmen[0] : undefined

export async function loadSalesmanData(db: Db): Promise<SalesmanData> {
  const salesmen = new Map((await db.execute(sql`SELECT no, name FROM salesmen`)).map(r => [r.no as string, r.name as string]))
  const ls = await db.execute(sql`SELECT l.invoice_number, l.seq, l.item_no, i.name AS item_name, l.quantity, l.total, l.salesmen FROM sales_invoice_lines l JOIN items i ON i.no = l.item_no ORDER BY l.invoice_number, l.seq`)
  const invoices = (await db.execute(sql`SELECT s.number, c.name, c.currency, s.rate, to_char(s.date,'YYYY-MM-DD') AS date, to_char(s.due_date,'YYYY-MM-DD') AS due, s.total
    FROM sales_invoices s JOIN customers c ON c.no = s.customer_no WHERE s.kind = 'SI'`)).map(r => {
    const lines = ls.filter(l => l.invoice_number === r.number).map(l => ({ item: l.item_no as string, itemName: l.item_name as string, qty: Number(l.quantity), total: Number(l.total), salesmen: l.salesmen as string[] }))
    return { number: r.number as string, customer: r.name as string, currency: r.currency as string, rate: Number(r.rate), date: r.date as string, dueDate: r.due as string, total: Number(r.total), lines, salesman: master(lines) }
  })
  const pl = await db.execute(sql`SELECT receipt_number, invoice_number, amount FROM sales_receipt_lines`)
  const receipts = (await db.execute(sql`SELECT r.number, c.name, to_char(r.date,'YYYY-MM-DD') AS date, r.amount FROM sales_receipts r JOIN customers c ON c.no = r.customer_no`))
    .map(r => ({ number: r.number as string, customer: r.name as string, date: r.date as string, amount: Number(r.amount),
      payments: pl.filter(p => p.receipt_number === r.number).map(p => ({ invoice: p.invoice_number as string, amount: Number(p.amount) })) }))
  const rl = await db.execute(sql`SELECT l.return_number, l.total, il.salesmen FROM sales_return_lines l JOIN sales_returns r ON r.number = l.return_number
    LEFT JOIN sales_invoice_lines il ON il.invoice_number = r.invoice_number AND il.seq = l.invoice_seq ORDER BY l.return_number, l.seq`)
  const returns = (await db.execute(sql`SELECT r.number, c.name, r.invoice_number, to_char(r.date,'YYYY-MM-DD') AS date, r.total FROM sales_returns r JOIN customers c ON c.no = r.customer_no`)).map(r => {
    const lines = rl.filter(l => l.return_number === r.number).map(l => ({ total: Number(l.total), salesmen: (l.salesmen as string[] | null) ?? [] }))
    return { number: r.number as string, customer: r.name as string, invoice: r.invoice_number as string, date: r.date as string, total: Number(r.total), lines, salesman: master(lines) }
  })
  const commissions = (await db.execute(sql`SELECT name, percent, levels, salesmen FROM salesman_commissions ORDER BY name`))
    .map(r => ({ name: r.name as string, percent: Number(r.percent), levels: (r.levels as number[]).map(Number), salesmen: (r.salesmen as string[] | null) ?? null }))
  const checkIns = (await db.execute(sql`SELECT to_char(date,'YYYY-MM-DD') AS date, salesman_no, address, customer_name, phone, contact, transaction_no FROM sales_check_ins ORDER BY date, id`))
    .map(r => ({ date: r.date as string, salesman: r.salesman_no as string, address: r.address as string, customerName: r.customer_name as string, phone: r.phone as string, contact: r.contact as string, transaction: r.transaction_no as string }))
  return { salesmen, invoices, receipts, returns, commissions, targets: (await loadSalesTargets(db)).filter(t => t.kind === 'SALESMAN'), checkIns }
}

// ---- helpers ----
/** en-US grouping, decimals only when needed (up to 2): Retail Demo's number format. */
export const num = (v: number) => (Math.round(v * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
const amt = (cents: number) => num(cents / 100)
/** In the invoice's own currency (foreign invoices are stored in IDR at the invoice rate, ADR-0012). */
const cur = (cents: number, i: { rate: number }) => cents / 100 / i.rate
const CURRENCY_NAMES: Record<string, string> = { IDR: 'Indonesian Rupiah', USD: 'US Dollar', SGD: 'Singapore Dollar' }
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const name = (d: SalesmanData) => (s: string) => d.salesmen.get(s) ?? s
const byName = (d: SalesmanData) => (a: string, b: string) => (name(d)(a) < name(d)(b) ? -1 : 1)
const inRange = (date: string, from: string, to: string) => date >= from && date <= to
const paid = (d: SalesmanData, n: string, asOf: string) => sum(d.receipts.filter(r => r.date <= asOf).flatMap(r => r.payments).filter(p => p.invoice === n).map(p => p.amount))
const returned = (d: SalesmanData, n: string, asOf: string) => sum(d.returns.filter(r => r.invoice === n && r.date <= asOf).map(r => r.total))
const owing = (d: SalesmanData, i: SmInvoice, asOf: string) => i.total - paid(d, i.number, asOf) - returned(d, i.number, asOf)

// ---- aging / outstanding (as-of) ----
/** Age counts from the invoice date (not the due date); the "> 120" bucket is not printed but stays in Piutang. */
const bucket = (age: number) => (age <= 0 ? 0 : age <= 30 ? 1 : age <= 60 ? 2 : age <= 90 ? 3 : age <= 120 ? 4 : 5)
const BUCKETS = ['Blm Tempo', '1 - 30', '31 - 60', '61 - 90', '91 - 120']
function open(d: SalesmanData, asOf: string) {
  return d.invoices.filter(i => i.salesman && i.date <= asOf).map(i => ({ ...i, owing: cur(owing(d, i, asOf), i), age: days(i.date, asOf) }))
    .filter(i => i.owing > 0).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
}
type Open = ReturnType<typeof open>[number]
const spread = (xs: Open[]) => BUCKETS.map((_, k) => sum(xs.filter(x => bucket(x.age) === k).map(x => x.owing)))
/** currency code → salesman → open invoices, both sorted (codes alphabetically, salesmen by name). */
function grouped(d: SalesmanData, asOf: string) {
  const xs = open(d, asOf)
  return [...new Set(xs.map(x => x.currency))].sort().map(c => ({ c, groups: [...new Set(xs.filter(x => x.currency === c).map(x => x.salesman!))].sort(byName(d))
    .map(s => ({ s, xs: xs.filter(x => x.currency === c && x.salesman === s) })) }))
}

/** Umur Piutang per Penjual: per currency a row per salesman; the grand total adds currencies unconverted. */
export function agingPerSalesman(d: SalesmanData, asOf: string): string[][] {
  const line = (xs: Open[]) => [num(sum(xs.map(x => x.owing))), ...spread(xs).map(num)]
  const out: string[][] = [['Mata Uang', 'Tenaga Penjual', 'Piutang', ...BUCKETS]], all: Open[] = []
  for (const { c, groups } of grouped(d, asOf)) {
    groups.forEach((g, k) => out.push([...(k === 0 ? [c] : []), name(d)(g.s), ...line(g.xs)]))
    const xs = groups.flatMap(g => g.xs); all.push(...xs)
    out.push(['Total Tenaga Penjual', ...line(xs)])
  }
  out.push(['Total Mata Uang', ...line(all)])
  return out
}

/** Rincian Umur Piutang per Penjual */
export function agingDetailPerSalesman(d: SalesmanData, asOf: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Pelanggan', 'Piutang', ...BUCKETS]]
  for (const { c, groups } of grouped(d, asOf)) {
    out.push([CURRENCY_NAMES[c] ?? c])
    for (const g of groups) out.push([name(d)(g.s)], ...g.xs.map(x => [x.number, fmtDate(x.date), x.customer, num(x.owing), ...spread([x]).map(num)]), spread(g.xs).map(num))
  }
  return out
}

/** Faktur Belum Lunas per Penjual: Umur (hr) counts from the invoice date. */
export function outstandingPerSalesman(d: SalesmanData, asOf: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Jatuh Tempo', 'Pelanggan', 'Total', 'Piutang', 'Umur (hr)']]
  for (const { c, groups } of grouped(d, asOf)) {
    out.push([CURRENCY_NAMES[c] ?? c])
    for (const g of groups) out.push([name(d)(g.s)], ...g.xs.map(x => [x.number, fmtDate(x.date), fmtDate(x.dueDate), x.customer, num(cur(x.total, x)), num(x.owing), num(x.age)]),
      [num(sum(g.xs.map(x => cur(x.total, x)))), num(sum(g.xs.map(x => x.owing)))])
  }
  return out
}

// ---- document lists (range) ----
/** Faktur Penjualan per Penjual: by the invoice's salesman, newest first; subtotals add currencies unconverted. */
export function invoiceListBySalesman(d: SalesmanData, from: string, to: string): string[][] {
  const xs = d.invoices.filter(i => i.salesman && inRange(i.date, from, to)).sort((a, b) => (a.date + a.number > b.date + b.number ? -1 : 1))
  const out: string[][] = [['Nomor #', 'Tanggal', 'Pelanggan', 'Total', 'Pembayaran', 'Piutang']]
  for (const s of [...new Set(xs.map(i => i.salesman!))].sort(byName(d))) {
    const mine = xs.filter(i => i.salesman === s).map(i => ({ i, total: cur(i.total, i), pay: cur(paid(d, i.number, to), i), owe: cur(owing(d, i, to), i) }))
    out.push([name(d)(s)], ...mine.map(x => [x.i.number, fmtDate(x.i.date), x.i.customer, num(x.total), num(x.pay), num(x.owe)]), [num(sum(mine.map(x => x.total))), num(sum(mine.map(x => x.pay)))])
  }
  return out
}

/** Retur Penjualan per Penjual: by the return's salesman (that of the invoice lines it takes back). */
export function returnListBySalesman(d: SalesmanData, from: string, to: string): string[][] {
  const xs = d.returns.filter(r => r.salesman && inRange(r.date, from, to)).sort((a, b) => (a.date + a.number > b.date + b.number ? -1 : 1))
  const rate = (r: SmReturn) => d.invoices.find(i => i.number === r.invoice)!
  const out: string[][] = [['Nomor #', 'Tanggal', 'Pelanggan', 'Total']]
  for (const s of [...new Set(xs.map(r => r.salesman!))].sort(byName(d))) {
    const mine = xs.filter(r => r.salesman === s)
    out.push([name(d)(s)], ...mine.map(r => [r.number, fmtDate(r.date), r.customer, num(cur(r.total, rate(r)))]), [num(sum(mine.map(r => cur(r.total, rate(r)))))])
  }
  return out
}

/** Histori Transaksi per Penjual: per date (newest first) and salesman, invoices carrying the salesman on any line and the
 *  receipts paying them (at the receipt's full amount); returns are not listed. */
export function transactionsPerSalesman(d: SalesmanData, from: string, to: string): string[][] {
  const of = (i: SmInvoice) => new Set(i.lines.flatMap(l => l.salesmen))
  const docs = [
    ...d.invoices.filter(i => inRange(i.date, from, to)).flatMap(i => [...of(i)].map(s => ({ s, date: i.date, type: 'Faktur Penjualan', number: i.number, customer: i.customer, value: cur(i.total, i) }))),
    ...d.receipts.filter(r => inRange(r.date, from, to)).flatMap(r => [...new Set(r.payments.flatMap(p => [...of(d.invoices.find(i => i.number === p.invoice)!)]))]
      .map(s => ({ s, date: r.date, type: 'Penerimaan Penjualan', number: r.number, customer: r.customer, value: r.amount / 100 }))),
  ]
  const out: string[][] = [['Nama Pelanggan', 'Alamat', 'No. Transaksi', 'Nilai']]
  for (const date of [...new Set(docs.map(x => x.date))].sort().reverse()) {
    out.push([fmtDate(date)])
    for (const s of [...new Set(docs.filter(x => x.date === date).map(x => x.s))].sort(byName(d))) {
      out.push([name(d)(s)])
      for (const type of ['Faktur Penjualan', 'Penerimaan Penjualan']) {
        const xs = docs.filter(x => x.date === date && x.s === s && x.type === type).sort((a, b) => (a.number < b.number ? -1 : 1))
        if (xs.length) out.push([type], ...xs.map(x => [x.customer, x.number, num(x.value)]), [num(sum(xs.map(x => x.value)))])
      }
    }
  }
  return out
}

/** Penjualan Barang per Penjual: every salesman on a line (any level) is credited the whole line (IDR); returns are not deducted. */
export function salesBySalesmanItem(d: SalesmanData, from: string, to: string, salesmen: string[]): string[][] {
  const ls = d.invoices.filter(i => inRange(i.date, from, to)).flatMap(i => i.lines)
  const out: string[][] = [['Nama Penjual', 'Nama Barang', 'Kts (Unit#1)', 'Penjualan']]
  let tq = 0, tv = 0
  for (const s of [...salesmen].sort(byName(d))) {
    const mine = ls.filter(l => l.salesmen.includes(s))
    if (!mine.length) continue
    const items = [...new Set(mine.map(l => l.itemName))].sort()
    items.forEach((it, k) => {
      const xs = mine.filter(l => l.itemName === it)
      out.push([...(k === 0 ? [name(d)(s)] : []), it, num(sum(xs.map(l => l.qty))), amt(sum(xs.map(l => l.total)))])
    })
    const q = sum(mine.map(l => l.qty)), v = sum(mine.map(l => l.total)); tq += q; tv += v
    out.push(['Total Nama Barang', num(q), amt(v)])
  }
  out.push(['Total Nama Penjual', num(tq), amt(tv)])
  return out
}

/** Target Penjualan Penjual: riil = lines carrying the salesman (any level) in the target range, less returns of such lines in range. */
export function salesmanTargets(d: SalesmanData, year: number): string[][] {
  const rows: string[][] = []
  for (const t of d.targets.filter(t => t.year === year)) {
    const riil = t.lines.map(l => sum(d.invoices.filter(i => inRange(i.date, t.from, t.to)).flatMap(i => i.lines).filter(x => x.salesmen.includes(l.salesman!)).map(x => x.total))
      - sum(d.returns.filter(r => inRange(r.date, t.from, t.to)).flatMap(r => r.lines).filter(x => x.salesmen.includes(l.salesman!)).map(x => x.total)))
    rows.push(['Nama Target', ':', t.name, 'S/d Tanggal', ':', fmtDate(t.to)], ['Dari Tanggal', ':', fmtDate(t.from), 'Penganalisa', ':', t.analyst],
      ['Nama Tenaga Penjual', 'Nilai Target', 'Nilai Riil', 'Pencapaian (%)'],
      ...t.lines.map((l, k) => [name(d)(l.salesman!), amt(l.amount), amt(riil[k]!), l.amount ? num(riil[k]! / l.amount * 100) : '0']),
      [amt(sum(t.lines.map(l => l.amount))), amt(sum(riil))])
  }
  return rows
}

// ---- commissions ----
/** One commission event: rule × salesman × invoice, earned when the invoice is fully settled (dated by the settling receipt),
 *  negative for a return (dated by the return). Base = line totals in IDR before tax where the salesman sits at a paid level. */
interface Earned { salesman: string; invoice: string; rule: string; ret: boolean; date: string; amount: number }
function earned(d: SalesmanData): Earned[] {
  const out: Earned[] = []
  const book = (lines: { total: number; salesmen: string[] }[], invoice: string, date: string, ret: boolean) => {
    for (const c of d.commissions) for (const s of new Set(lines.flatMap(l => l.salesmen))) {
      if (c.salesmen && !c.salesmen.includes(s)) continue
      const base = sum(lines.filter(l => c.levels.includes(l.salesmen.indexOf(s) + 1)).map(l => l.total))
      if (base) out.push({ salesman: s, invoice, rule: c.name, ret, date, amount: Math.round(base * c.percent / 100) * (ret ? -1 : 1) })
    }
  }
  for (const i of d.invoices) {
    const settled = [...d.receipts].sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).find(r => r.payments.some(p => p.invoice === i.number) && owing(d, i, r.date) <= 0)
    if (settled) book(i.lines, i.number, settled.date, false)
  }
  // shortcut: a return counts on its date whether or not its invoice is ever settled (only a settled one was observed).
  for (const r of d.returns) book(r.lines, r.invoice, r.date, true)
  return out
}
const ruleRows = (xs: Earned[]) => [...new Set(xs.map(x => x.rule))].sort().flatMap(rule => [false, true].flatMap(ret => {
  const v = sum(xs.filter(x => x.rule === rule && x.ret === ret).map(x => x.amount))
  return xs.some(x => x.rule === rule && x.ret === ret) ? [[rule, ret ? 'Syarat terpenuhi (Retur)' : 'Syarat terpenuhi', amt(v)]] : []
}))
const salesmenOf = (d: SalesmanData, xs: Earned[]) => [...new Set(xs.map(x => x.salesman))].sort(byName(d))
const periodRange = (year: number, month: number) => {
  const m = String(month).padStart(2, '0')
  return [`${year}-${m}-01`, `${year}-${m}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`] as const
}

/** Rincian Komisi (Dihitung per Faktur) */
export function commissionByInvoiceDetail(d: SalesmanData, from: string, to: string): string[][] {
  const xs = earned(d).filter(x => inRange(x.date, from, to)), out: string[][] = [['Nama Komisi Penjual', 'Permeriksaan syarat', 'Nilai Komisi']]
  for (const s of salesmenOf(d, xs)) {
    const mine = xs.filter(x => x.salesman === s)
    out.push([name(d)(s)])
    for (const inv of [...new Set(mine.map(x => x.invoice))].sort()) {
      const ys = mine.filter(x => x.invoice === inv)
      out.push([inv], ...ruleRows(ys), [amt(sum(ys.map(x => x.amount)))])
    }
    out.push([amt(sum(mine.map(x => x.amount)))])
  }
  return out
}
const summary = (d: SalesmanData, xs: Earned[]) => [['Nama Tenaga Penjual', 'Nilai Komisi'], ...salesmenOf(d, xs).map(s => [name(d)(s), amt(sum(xs.filter(x => x.salesman === s).map(x => x.amount)))])]
/** Ringkasan Komisi (Dihitung per Faktur) */
export const commissionByInvoiceSummary = (d: SalesmanData, from: string, to: string) => summary(d, earned(d).filter(x => inRange(x.date, from, to)))

/** Rincian Komisi Penjual (Dihitung per Periode): the month's events per salesman, summed per rule (returns on their own row). */
export function commissionByPeriodDetail(d: SalesmanData, year: number, month: number): string[][] {
  const [from, to] = periodRange(year, month), xs = earned(d).filter(x => inRange(x.date, from, to))
  return [['Nama Komisi Penjual', 'Permeriksaan syarat', 'Nilai Komisi'], ...salesmenOf(d, xs).flatMap(s => {
    const mine = xs.filter(x => x.salesman === s)
    return [[name(d)(s)], ...ruleRows(mine), [amt(sum(mine.map(x => x.amount)))]]
  })]
}
/** Ringkasan Komisi (Dihitung per Periode) */
export const commissionByPeriodSummary = (d: SalesmanData, year: number, month: number) => {
  const [from, to] = periodRange(year, month)
  return summary(d, earned(d).filter(x => inRange(x.date, from, to)))
}

const LEVELS = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima']
const andList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} dan ${xs.at(-1)}` : xs[0] ?? '')
/** Daftar Komisi Penjual; "(DO NOT SHOW)" is Accurate's own placeholder text, printed verbatim. */
export function commissionList(d: SalesmanData): string[][] {
  return [['Nama', 'Berlaku pada', 'Dengan Syarat', 'Mendapatkan Komisi', 'Berlaku ke Penjual'], ...d.commissions.map(c => [c.name, 'Semua Barang', 'Tanpa batasan dan syarat', `${num(c.percent)} % dari Nilai Penjualan`,
    `${c.salesmen ? `Tenaga Penjual: ${andList(c.salesmen.map(name(d)))}` : ''}Urutan (DO NOT SHOW) ${andList(c.levels.map(l => LEVELS[l - 1]!))}`])]
}

/** Check In per Karyawan */
export function checkInsPerSalesman(d: SalesmanData, from: string, to: string): string[][] {
  const xs = d.checkIns.filter(c => inRange(c.date, from, to))
  // shortcut: row layout per salesman is unobserved (no check-ins can be created outside the mobile app); flat rows under a name line.
  return [['Tanggal', 'Alamat', 'Nama Pelanggan (Saat Check In)', 'Nomor Hp', 'Nama Kontak', 'No. Transaksi'],
    ...[...new Set(xs.map(c => c.salesman))].sort(byName(d)).flatMap(s => [[name(d)(s)], ...xs.filter(c => c.salesman === s).map(c => [fmtDate(c.date), c.address, c.customerName, c.phone, c.contact, c.transaction].filter(Boolean))])]
}
