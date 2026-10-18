import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Piutang / Penjualan reports over the sales tables; rules in docs/reports/<planId>.md (fixture: fixtures/sales-t2.json).

export interface Invoice { number: string; customer: string; date: string; dueDate: string; description: string; total: number }
export interface Receipt { number: string; customer: string; date: string; description: string; amount: number; payments: { invoice: string; amount: number }[] }
export interface SalesData { customers: Map<string, string>; invoices: Invoice[]; receipts: Receipt[] }

const CURRENCY = 'Indonesian Rupiah'
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const byName = (d: SalesData) => (a: string, b: string) => (d.customers.get(a)! < d.customers.get(b)! ? -1 : 1)
const inRange = (x: { date: string }, from: string, to: string) => x.date >= from && x.date <= to

/** Receivable movements of one customer: invoices +, receipts − (one entry per receipt). */
function movements(d: SalesData, customer: string) {
  return [
    ...d.invoices.filter(i => i.customer === customer).map(i => ({ number: i.number, date: i.date, description: i.description, amount: i.total })),
    ...d.receipts.filter(r => r.customer === customer).map(r => ({ number: r.number, date: r.date, description: r.description, amount: -r.amount })),
  ].sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
}
const balanceBefore = (d: SalesData, c: string, date: string) => movements(d, c).filter(m => m.date < date).reduce((s, m) => s + m.amount, 0)
const activeCustomers = (d: SalesData, from: string, to: string) =>
  [...d.customers.keys()].filter(c => movements(d, c).some(m => inRange(m, from, to))).sort(byName(d))

/** Daftar Faktur Penjualan */
export function salesInvoiceList(d: SalesData, from: string, to: string): string[][] {
  return [['Nomor #', 'Tanggal', 'Pelanggan', 'Total'],
    ...d.invoices.filter(i => inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
      .map(i => [i.number, fmtDate(i.date), d.customers.get(i.customer)!, formatIdr(i.total)])]
}

/** Penjualan per Pelanggan */
export function salesByCustomer(d: SalesData, from: string, to: string): string[][] {
  const rows = activeCustomers(d, from, to).map(c => [c, d.invoices.filter(i => i.customer === c && inRange(i, from, to)).reduce((s, i) => s + i.total, 0)] as const).filter(([, v]) => v)
  return [['Pelanggan', 'Penjualan'], ...rows.map(([c, v]) => [d.customers.get(c)!, formatIdr(v)]), ['Total Pelanggan', formatIdr(rows.reduce((s, [, v]) => s + v, 0))]]
}

/** Penerimaan Penjualan: newest first; cheque date = receipt date (no cheque number printed when empty). */
export function salesReceiptList(d: SalesData, from: string, to: string): string[][] {
  const rs = d.receipts.filter(r => inRange(r, from, to)).sort((a, b) => (a.date + a.number > b.date + b.number ? -1 : 1))
  return [['Nomor #', 'Tanggal', 'No. Cek', 'Tanggal Cek', 'Pelanggan', 'Nilai Pembayaran'], [CURRENCY],
    ...rs.map(r => [r.number, fmtDate(r.date), fmtDate(r.date), d.customers.get(r.customer)!, formatIdr(r.amount)]),
    [formatIdr(rs.reduce((s, r) => s + r.amount, 0))]]
}

/** Buku Besar Pembantu Piutang: customers with movements in the range. */
export function arLedger(d: SalesData, from: string, to: string): string[][] {
  const rows = activeCustomers(d, from, to).map(c => {
    const open = balanceBefore(d, c, from)
    const inv = d.invoices.filter(i => i.customer === c && inRange(i, from, to)).reduce((s, i) => s + i.total, 0)
    const pay = d.receipts.filter(r => r.customer === c && inRange(r, from, to)).reduce((s, r) => s + r.amount, 0)
    return [d.customers.get(c)!, open, inv, pay, 0, 0, 0, open + inv - pay] as const
  })
  const sum = (i: number) => rows.reduce((s, r) => s + (r[i] as number), 0)
  return [['Nama Pelanggan', 'Saldo Awal', 'Faktur', 'Pembayaran', 'Retur', 'Uang Muka', 'Jurnal Umum', 'Saldo Akhir'], [CURRENCY],
    ...rows.map(([n, ...v]) => [n, ...v.map(x => formatIdr(x as number))]), [1, 2, 3, 4, 5, 6, 7].map(i => formatIdr(sum(i)))]
}

/** Histori Piutang */
export function arHistory(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Deskripsi', 'Nilai'], [CURRENCY]]
  let grand = 0
  for (const c of activeCustomers(d, from, to)) {
    let bal = balanceBefore(d, c, from)
    out.push([d.customers.get(c)!], [`Saldo Piutang per ${fmtDate(dayBefore(from))}`, formatIdr(bal)])
    for (const m of movements(d, c).filter(m => inRange(m, from, to))) { bal += m.amount; out.push([m.number, fmtDate(m.date), m.description, formatIdr(m.amount)]) }
    out.push([formatIdr(bal)]); grand += bal
  }
  out.push([formatIdr(grand)])
  return out
}

/** Pernyataan Piutang: one statement per customer (contact fields print empty). */
export function customerStatement(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = []
  for (const c of activeCustomers(d, from, to)) {
    let bal = balanceBefore(d, c, from), inc = 0, dec = 0
    out.push(['Pelanggan', ':', d.customers.get(c)!, 'Email', ':'], ['Handphone', ':', 'Alamat', ':'], ['Faximili', ':'],
      ['Nomor #', 'Tanggal', 'Deskripsi', 'Bertambah', 'Berkurang', 'Saldo'], [CURRENCY],
      [`Saldo Piutang per ${fmtDate(dayBefore(from))}`, '0', '0', formatIdr(bal)])
    for (const m of movements(d, c).filter(m => inRange(m, from, to))) {
      const up = Math.max(m.amount, 0), down = Math.max(-m.amount, 0)
      bal += m.amount; inc += up; dec += down
      out.push([m.number, fmtDate(m.date), m.description, formatIdr(up), formatIdr(down), formatIdr(bal)])
    }
    out.push([formatIdr(inc), formatIdr(dec)])
  }
  return out
}

/** Faktur Belum Lunas: per customer (by name), unpaid invoices at `asOf` with age in days from the due date. */
export function outstandingInvoices(d: SalesData, asOf: string): string[][] {
  const paid = (n: string) => d.receipts.filter(r => r.date <= asOf).flatMap(r => r.payments).filter(p => p.invoice === n).reduce((s, p) => s + p.amount, 0)
  const out: string[][] = [[CURRENCY]]
  let gt = 0, go = 0
  for (const c of [...d.customers.keys()].sort(byName(d))) {
    const open = d.invoices.filter(i => i.customer === c && i.date <= asOf).map(i => ({ ...i, owing: i.total - paid(i.number) })).filter(i => i.owing > 0)
      .sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
    if (!open.length) continue
    out.push([d.customers.get(c)!, 'Sisa Kredit', ':', '0'], ['Nomor #', 'Tanggal', 'Jatuh Tempo', 'Total', 'Piutang', 'Piutang Pajak', 'Umur (hr)'],
      ...open.map(i => [i.number, fmtDate(i.date), fmtDate(i.dueDate), formatIdr(i.total), formatIdr(i.owing), '0', formatIdr(days(i.dueDate, asOf) * 100)]))
    const t = open.reduce((s, i) => s + i.total, 0), o = open.reduce((s, i) => s + i.owing, 0)
    out.push([formatIdr(t), formatIdr(o), '0']); gt += t; go += o
  }
  out.push([formatIdr(gt), formatIdr(go), '0'])
  return out
}
