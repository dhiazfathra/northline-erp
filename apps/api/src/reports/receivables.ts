import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Piutang / Penjualan reports over the sales tables; rules in docs/reports/<planId>.md (fixture: fixtures/sales-t2.json).

export interface InvoiceLine { item: string; itemName: string; unit: string; qty: number; price: number; total: number }
export interface Invoice { number: string; customer: string; date: string; dueDate: string; description: string; total: number; lines?: InvoiceLine[]; /** vendor's own number (purchases) */ bill?: string }
export interface Receipt { number: string; customer: string; bankName?: string; date: string; description: string; amount: number; payments: { invoice: string; amount: number }[] }
export interface SalesData { customers: Map<string, string>; invoices: Invoice[]; receipts: Receipt[]; labels?: Labels }

/** Words that differ between the receivable (Piutang) and payable (Utang) versions of the same report. */
export interface Labels { party: string; partyName: string; balance: string; invoice: string; payment: string; docNo: string; sales: string; historyValue: string }
export const AR: Labels = { party: 'Pelanggan', partyName: 'Nama Pelanggan', balance: 'Piutang', invoice: 'Faktur Penjualan', payment: 'Penerimaan Penjualan', docNo: 'Nomor #', sales: 'Penjualan', historyValue: 'Nilai' }
export const AP: Labels = { party: 'Pemasok', partyName: 'Nama Pemasok', balance: 'Utang', invoice: 'Faktur Pembelian', payment: 'Pembayaran Pembelian', docNo: 'No Form #', sales: 'Pembelian', historyValue: 'Utang' }
const L = (d: SalesData) => d.labels ?? AR

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
  return [['Nomor #', 'Tanggal', L(d).party, 'Total'],
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
  return [['Nomor #', 'Tanggal', 'No. Cek', 'Tanggal Cek', L(d).party, 'Nilai Pembayaran'], [CURRENCY],
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
  return [[L(d).partyName, 'Saldo Awal', 'Faktur', 'Pembayaran', 'Retur', 'Uang Muka', 'Jurnal Umum', 'Saldo Akhir'], [CURRENCY],
    ...rows.map(([n, ...v]) => [n, ...v.map(x => formatIdr(x as number))]), [1, 2, 3, 4, 5, 6, 7].map(i => formatIdr(sum(i)))]
}

/** Histori Piutang */
export function arHistory(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Deskripsi', L(d).historyValue], [CURRENCY]]
  let grand = 0
  for (const c of activeCustomers(d, from, to)) {
    let bal = balanceBefore(d, c, from)
    out.push([d.customers.get(c)!], [`Saldo ${L(d).balance} per ${fmtDate(dayBefore(from))}`, formatIdr(bal)])
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
    out.push([L(d).party, ':', d.customers.get(c)!, 'Email', ':'], ['Handphone', ':', 'Alamat', ':'], ['Faximili', ':'],
      ['Nomor #', 'Tanggal', 'Deskripsi', 'Bertambah', 'Berkurang', 'Saldo'], [CURRENCY],
      [`Saldo ${L(d).balance} per ${fmtDate(dayBefore(from))}`, '0', '0', formatIdr(bal)])
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

// ---- aging ----
export const BUCKETS = ['Blm Tempo', '1 - 30', '31 - 60', '61 - 90', '91 - 120', '&gt; 120']
/** Bucket index by days past due: not yet due, 1–30, 31–60, 61–90, 91–120, >120. */
const bucket = (age: number) => (age <= 0 ? 0 : age <= 30 ? 1 : age <= 60 ? 2 : age <= 90 ? 3 : age <= 120 ? 4 : 5)

export function openInvoices(d: SalesData, asOf: string, customer: string) {
  const paid = (n: string) => d.receipts.filter(r => r.date <= asOf).flatMap(r => r.payments).filter(p => p.invoice === n).reduce((s, p) => s + p.amount, 0)
  return d.invoices.filter(i => i.customer === customer && i.date <= asOf).map(i => ({ ...i, owing: i.total - paid(i.number), age: days(i.dueDate, asOf) }))
    .filter(i => i.owing > 0).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
}
export const spread = (xs: { owing: number; age: number }[]) => BUCKETS.map((_, k) => xs.filter(x => bucket(x.age) === k).reduce((s, x) => s + x.owing, 0))

/** Umur Piutang: one row per customer with an open balance; totals per customer list and currency. */
export function agingReceivable(d: SalesData, asOf: string): string[][] {
  const rows = [...d.customers.keys()].sort(byName(d)).map(c => ({ c, xs: openInvoices(d, asOf, c) })).filter(r => r.xs.length)
  const all = rows.flatMap(r => r.xs)
  const line = (xs: typeof all) => [formatIdr(xs.reduce((s, x) => s + x.owing, 0)), ...spread(xs).map(formatIdr), '0']
  return [['Mata Uang', 'Pelanggan', 'Piutang', ...BUCKETS, 'Sisa Kredit'],
    ...rows.map((r, i) => [...(i === 0 ? ['IDR'] : []), d.customers.get(r.c)!, ...line(r.xs)]),
    ['Total Pelanggan', ...line(all)], ['Total Mata Uang', ...line(all)]]
}

/** Rincian Umur Piutang */
export function agingReceivableDetail(d: SalesData, asOf: string): string[][] {
  const out: string[][] = [[CURRENCY]]
  for (const c of [...d.customers.keys()].sort(byName(d))) {
    const xs = openInvoices(d, asOf, c)
    if (!xs.length) continue
    out.push([d.customers.get(c)!, 'Sisa Kredit', ':', '0'], ['Nomor #', 'Tanggal', 'Piutang', ...BUCKETS],
      ...xs.map(x => [x.number, fmtDate(x.date), formatIdr(x.owing), ...spread([x]).map(formatIdr)]), spread(xs).map(formatIdr))
  }
  return out
}

/** Rincian Buku Besar Pembantu Piutang: per customer, opening, then documents grouped by type with subtotals. */
export function arLedgerDetail(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [[L(d).docNo, 'Tanggal', 'Deskripsi', L(d).balance], [CURRENCY]]
  let grand = 0
  for (const c of activeCustomers(d, from, to)) {
    const open = balanceBefore(d, c, from), prev = fmtDate(dayBefore(from))
    out.push([d.customers.get(c)!], ['-'], [prev, `Saldo ${L(d).balance} per ${prev}`, formatIdr(open)], [formatIdr(open)])
    let bal = open
    const groups: [string, { number: string; date: string; description: string; amount: number }[]][] = [
      [L(d).invoice, d.invoices.filter(i => i.customer === c && inRange(i, from, to)).map(i => ({ number: i.number, date: i.date, description: i.description, amount: i.total }))],
      [L(d).payment, d.receipts.filter(r => r.customer === c && inRange(r, from, to)).map(r => ({ number: r.number, date: r.date, description: r.description, amount: -r.amount }))],
    ]
    for (const [label, docs] of groups) {
      if (!docs.length) continue
      docs.sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
      const sum = docs.reduce((s, x) => s + x.amount, 0); bal += sum
      out.push([label], ...docs.map(x => [x.number, fmtDate(x.date), x.description, formatIdr(x.amount)]), [formatIdr(sum)])
    }
    out.push([formatIdr(bal)]); grand += bal
  }
  out.push([formatIdr(grand)])
  return out
}

/** Pembayaran Faktur: per customer, per invoice paid in the range, the receipts that paid it. */
export function salesInvoicePaid(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['No. Form', 'Tgl Pembayaran', 'Bank', 'Total Faktur', 'Total pemotongan PPh23', 'Pembayaran'], [CURRENCY]]
  for (const c of activeCustomers(d, from, to)) {
    const pays = d.receipts.filter(r => r.customer === c && inRange(r, from, to)).flatMap(r => r.payments.map(p => ({ r, p })))
    if (!pays.length) continue
    out.push([d.customers.get(c)!])
    for (const inv of [...new Set(pays.map(x => x.p.invoice))].sort()) {
      const ps = pays.filter(x => x.p.invoice === inv), total = d.invoices.find(i => i.number === inv)!.total
      out.push([inv], ...ps.map(({ r, p }) => [r.number, fmtDate(r.date), r.bankName ?? '', formatIdr(total), '0', formatIdr(p.amount)]), [formatIdr(ps.reduce((s, x) => s + x.p.amount, 0))])
    }
  }
  return out
}

/** Rincian Penerimaan Penjualan: one block per receipt (date order); the amount after "Nilai Pembayaran :" is not printed by Accurate. */
export function salesReceiptDetail(d: SalesData, from: string, to: string): string[][] {
  return d.receipts.filter(r => inRange(r, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).flatMap(r => [
    ['No. Form', ':', r.number, 'Bank', ':', r.bankName ?? ''], ['Tgl Pembayaran', ':', fmtDate(r.date), 'Mata Uang', ':', CURRENCY],
    ['Pelanggan', ':', d.customers.get(r.customer)!], ['Nilai Pembayaran'], [':'],
    ['No. Faktur', 'Tgl Faktur', 'Total Faktur', 'Bayar', 'Diskon', 'Pembayaran'],
    ...r.payments.map(p => { const i = d.invoices.find(x => x.number === p.invoice)!; return [i.number, fmtDate(i.date), formatIdr(i.total), formatIdr(p.amount), '0', formatIdr(p.amount)] }),
    [formatIdr(r.amount), '0', formatIdr(r.amount)],
  ])
}

// ---- sales analysis (item lines) ----
const BRANCH = 'Kantor Pusat' // single-branch ledger; branch filter not modelled yet
const qty = (q: number) => formatIdr(Math.round(q * 100))
const linesIn = (d: SalesData, from: string, to: string) =>
  d.invoices.filter(i => inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
    .flatMap(i => (i.lines ?? []).map(l => ({ ...l, inv: i })))
const group = <T, K>(xs: T[], key: (x: T) => K) => { const m = new Map<K, T[]>(); for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]); return m }
const tq = (xs: { qty: number }[]) => xs.reduce((s, x) => s + x.qty, 0)
const tv = (xs: { total: number }[]) => xs.reduce((s, x) => s + x.total, 0)
const sortBy = <T>(xs: T[], k: (x: T) => string) => [...xs].sort((a, b) => (k(a) < k(b) ? -1 : 1))

/** Faktur Belum Lunas per Pelanggan */
export function outstandingPerCustomer(d: SalesData, asOf: string): string[][] {
  const rows = [...d.customers.keys()].sort(byName(d)).map(c => ({ c, xs: openInvoices(d, asOf, c) })).filter(r => r.xs.length)
  const t = (xs: { total: number; owing: number }[]) => [formatIdr(xs.reduce((s, x) => s + x.total, 0)), formatIdr(xs.reduce((s, x) => s + x.owing, 0)), '0']
  const all = rows.flatMap(r => r.xs)
  return [['Mata Uang', 'Pelanggan', 'Total', 'Piutang', 'Piutang Pajak'], ...rows.map((r, i) => [...(i === 0 ? [CURRENCY] : []), d.customers.get(r.c)!, ...t(r.xs)]),
    ['Total Pelanggan', ...t(all)], ['Total Mata Uang', ...t(all)]]
}

/** Rata-rata Pembayaran Pelanggan: invoices settled by a receipt in the range; average days from invoice to settlement. */
export function owingCollection(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nama Pelanggan', 'Bayar (Hari)', 'Syarat Bayar (Hari)', 'Nunggak (Hari)']]
  for (const c of [...d.customers.keys()].sort(byName(d))) {
    const settled = d.invoices.filter(i => i.customer === c).flatMap(i => {
      const ps = d.receipts.flatMap(r => r.payments.filter(p => p.invoice === i.number).map(p => ({ date: r.date, amount: p.amount }))).sort((a, b) => (a.date < b.date ? -1 : 1))
      let paid = 0
      for (const p of ps) { paid += p.amount; if (paid >= i.total) return inRange(p, from, to) ? [{ pay: days(i.date, p.date), term: days(i.date, i.dueDate) }] : [] }
      return []
    })
    if (!settled.length) continue
    const avg = (k: 'pay' | 'term') => Math.round(settled.reduce((s, x) => s + x[k], 0) / settled.length)
    out.push([d.customers.get(c)!, String(avg('pay')), String(avg('term')), String(avg('pay') - avg('term'))])
  }
  return out
}

/** Penjualan per Barang */
export function salesByItem(d: SalesData, from: string, to: string): string[][] {
  const g = group(linesIn(d, from, to), l => l.item), all = linesIn(d, from, to)
  return [['Nama Barang', 'Satuan', 'Kuantitas', 'Penjualan'], ...sortBy([...g.values()], xs => xs[0]!.itemName).map(xs => [xs[0]!.itemName, xs[0]!.unit, qty(tq(xs)), formatIdr(tv(xs))]),
    ['Total Nama Barang', qty(tq(all)), formatIdr(tv(all))]]
}

/** Penjualan Barang per Pelanggan: item, then its customers (item name printed on the first customer row). */
export function salesItemByCustomer(d: SalesData, from: string, to: string): string[][] {
  const all = linesIn(d, from, to), out: string[][] = [['Nama Barang', 'Pelanggan', 'Kuantitas', 'Penjualan']]
  for (const xs of sortBy([...group(all, l => l.item).values()], xs => xs[0]!.itemName)) {
    const byC = sortBy([...group(xs, l => l.inv.customer).values()], ys => d.customers.get(ys[0]!.inv.customer)!)
    byC.forEach((ys, i) => out.push([...(i === 0 ? [xs[0]!.itemName] : []), d.customers.get(ys[0]!.inv.customer)!, qty(tq(ys)), formatIdr(tv(ys))]))
    out.push(['Total Pelanggan', qty(tq(xs)), formatIdr(tv(xs))])
  }
  out.push(['Total Nama Barang', qty(tq(all)), formatIdr(tv(all))])
  return out
}

/** Penjualan Pelanggan per Barang */
export function salesCustomerByItem(d: SalesData, from: string, to: string): string[][] {
  const all = linesIn(d, from, to), out: string[][] = [['Pelanggan', 'Nama Barang', 'Satuan', 'Kuantitas', 'Penjualan']]
  for (const xs of sortBy([...group(all, l => l.inv.customer).values()], xs => d.customers.get(xs[0]!.inv.customer)!)) {
    sortBy([...group(xs, l => l.item).values()], ys => ys[0]!.itemName)
      .forEach((ys, i) => out.push([...(i === 0 ? [d.customers.get(xs[0]!.inv.customer)!] : []), ys[0]!.itemName, ys[0]!.unit, qty(tq(ys)), formatIdr(tv(ys))]))
    out.push(['Total Nama Barang', qty(tq(xs)), formatIdr(tv(xs))])
  }
  out.push(['Total Pelanggan', qty(tq(all)), formatIdr(tv(all))])
  return out
}

/** Rincian Penjualan per Pelanggan */
export function salesByCustomerDetail(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Tipe Transaksi', 'Keterangan', 'Penjualan (Prime)'], [CURRENCY]]
  let grand = 0
  for (const c of activeCustomers(d, from, to)) {
    const inv = d.invoices.filter(i => i.customer === c && inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
    if (!inv.length) continue
    out.push([d.customers.get(c)!], ...inv.map(i => [i.number, fmtDate(i.date), 'Faktur Penjualan', i.description, formatIdr(i.total)]), [formatIdr(tv(inv))]); grand += tv(inv)
  }
  out.push([formatIdr(grand)])
  return out
}

/** Rincian Penjualan per Barang */
export function salesByItemDetail(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Keterangan', 'Kuantitas', 'Satuan', 'Penjualan']]
  for (const xs of sortBy([...group(linesIn(d, from, to), l => l.item).values()], xs => xs[0]!.itemName))
    out.push([xs[0]!.itemName], ...xs.map(l => [l.inv.number, fmtDate(l.inv.date), l.inv.description, qty(l.qty), l.unit, formatIdr(l.total)]), [qty(tq(xs)), formatIdr(tv(xs))])
  return out
}

/** Penjualan per Cabang */
export function salesByBranch(d: SalesData, from: string, to: string): string[][] {
  const t = formatIdr(tv(linesIn(d, from, to)))
  return [['Cabang', 'Penjualan'], [BRANCH, t], ['Total Cabang', t]]
}

/** Rincian Faktur Penjualan: one block per invoice; lines print the item master name. */
export function salesInvoiceDetail(d: SalesData, from: string, to: string): string[][] {
  return d.invoices.filter(i => inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).flatMap(i => [
    ['Nomor #', ':', i.number, 'Nama Biaya', ':'], ['Tanggal', ':', fmtDate(i.date), 'Sub Total', ':', formatIdr(i.total)],
    ['Pelanggan', ':', d.customers.get(i.customer)!, 'Total Biaya', ':', '0'], ['Mata Uang', ':', CURRENCY, 'Total', ':', formatIdr(i.total)],
    ['Kode #', 'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga'],
    ...(i.lines ?? []).map(l => [l.item, l.itemName, qty(l.qty), formatIdr(l.price), formatIdr(l.total)]),
    [qty(tq(i.lines ?? [])), formatIdr(i.total)],
  ])
}
