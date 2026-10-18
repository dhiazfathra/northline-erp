import { fmtDate, fmtHeaderDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Piutang / Penjualan reports over the sales tables; rules in docs/reports/<planId>.md (fixture: fixtures/sales-t2.json).

export interface InvoiceLine { item: string; itemName: string; unit: string; qty: number; price: number; total: number; /** item type (SERVICE / INVENTORY / NON_INVENTORY) */ type?: string }
export interface Invoice { number: string; customer: string; date: string; dueDate: string; description: string; total: number; /** invoice discount (cents) */ discount?: number; lines?: InvoiceLine[]; /** vendor's own number (purchases) */ bill?: string
  /** 'DP' = down-payment invoice */ kind?: 'SI' | 'DP'; /** linked delivery / order */ delivery?: string; order?: string; exchange?: string; /** down payments deducted on this invoice */ dpUses?: { dp: string; amount: number }[] }
export interface Receipt { number: string; customer: string; bankName?: string; date: string; description: string; amount: number; payments: { invoice: string; amount: number }[] }
export interface Return { number: string; customer: string; invoice: string; date: string; description: string; total: number; lines: InvoiceLine[] }
export interface SalesData { customers: Map<string, string>; invoices: Invoice[]; receipts: Receipt[]; returns?: Return[]; labels?: Labels }

/** Words that differ between the receivable (Piutang) and payable (Utang) versions of the same report. */
export interface Labels { party: string; partyName: string; balance: string; invoice: string; payment: string; docNo: string; sales: string; historyValue: string; ret: string; dp: string }
export const AR: Labels = { party: 'Pelanggan', partyName: 'Nama Pelanggan', balance: 'Piutang', invoice: 'Faktur Penjualan', payment: 'Penerimaan Penjualan', docNo: 'Nomor #', sales: 'Penjualan', historyValue: 'Nilai', ret: 'Retur Penjualan', dp: 'Uang Muka Penjualan' }
export const AP: Labels = { party: 'Pemasok', partyName: 'Nama Pemasok', balance: 'Utang', invoice: 'Faktur Pembelian', payment: 'Pembayaran Pembelian', docNo: 'No Form #', sales: 'Pembelian', historyValue: 'Utang', ret: 'Retur Pembelian', dp: 'Uang Muka Pembelian' }
const L = (d: SalesData) => d.labels ?? AR

const CURRENCY = 'Indonesian Rupiah'
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const byName = (d: SalesData) => (a: string, b: string) => (d.customers.get(a)! < d.customers.get(b)! ? -1 : 1)
const inRange = (x: { date: string }, from: string, to: string) => x.date >= from && x.date <= to

/** Receivable movements of one customer: invoices +, receipts − (one entry per receipt). */
function movements(d: SalesData, customer: string) {
  return [
    // A DP invoice shows +total and −total (the down-payment entry); an invoice using DP shows its net and the DP used.
    ...d.invoices.filter(i => i.customer === customer).flatMap(i => {
      const m = (amount: number) => ({ number: i.number, date: i.date, description: i.description, amount })
      if (i.kind === 'DP') return d.labels ? [m(-i.total), m(i.total)] : [m(i.total), m(-i.total)]
      const used = dpUsed(i)
      return used ? [m(i.total - used), m(used)] : [m(i.total)]
    }),
    ...d.receipts.filter(r => r.customer === customer).map(r => ({ number: r.number, date: r.date, description: r.description, amount: -r.amount })),
    ...(d.returns ?? []).filter(r => r.customer === customer).map(r => ({ number: r.number, date: r.date, description: r.description, amount: -r.total })),
  ].sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
}
const dpUsed = (i: Invoice) => (i.dpUses ?? []).reduce((s, u) => s + u.amount, 0)
const regular = (d: SalesData) => d.invoices.filter(i => i.kind !== 'DP')
const balanceBefore = (d: SalesData, c: string, date: string) => movements(d, c).filter(m => m.date < date).reduce((s, m) => s + m.amount, 0)
const activeCustomers = (d: SalesData, from: string, to: string) =>
  [...d.customers.keys()].filter(c => movements(d, c).some(m => inRange(m, from, to))).sort(byName(d))

/** Daftar Faktur Penjualan */
export function salesInvoiceList(d: SalesData, from: string, to: string): string[][] {
  return [['Nomor #', 'Tanggal', L(d).party, 'Total'],
    ...regular(d).filter(i => inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
      .map(i => [i.number, fmtDate(i.date), d.customers.get(i.customer)!, formatIdr(i.total)])]
}

/** Penjualan per Pelanggan */
export function salesByCustomer(d: SalesData, from: string, to: string): string[][] {
  const rows = activeCustomers(d, from, to).map(c => [c, regular(d).filter(i => i.customer === c && inRange(i, from, to)).reduce((s, i) => s + i.total, 0)] as const).filter(([, v]) => v)
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
    const ret = (d.returns ?? []).filter(r => r.customer === c && inRange(r, from, to)).reduce((s, r) => s + r.total, 0)
    const dp = d.invoices.filter(i => i.customer === c && i.kind === 'DP' && inRange(i, from, to)).reduce((s, i) => s + i.total, 0)
    return [d.customers.get(c)!, open, inv, pay, ret, dp, 0, open + inv - pay - ret - dp] as const
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
  const out: string[][] = [[CURRENCY]]
  let gt = 0, go = 0
  for (const c of [...d.customers.keys()].sort(byName(d))) {
    const open = openInvoices(d, asOf, c) // net of payments, returns and down payments used
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
  const ret = (n: string) => (d.returns ?? []).filter(r => r.invoice === n && r.date <= asOf).reduce((s, r) => s + r.total, 0)
  return regular(d).filter(i => i.customer === customer && i.date <= asOf).map(i => ({ ...i, owing: i.total - dpUsed(i) - paid(i.number) - ret(i.number), age: days(i.dueDate, asOf) }))
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
      [L(d).invoice, d.invoices.filter(i => i.customer === c && inRange(i, from, to)).flatMap(i => {
        const m = (amount: number) => ({ number: i.number, date: i.date, description: i.description, amount })
        return i.kind === 'DP' || !dpUsed(i) ? [m(i.total)] : [m(i.total - dpUsed(i)), m(dpUsed(i))]
      })],
      [L(d).payment, d.receipts.filter(r => r.customer === c && inRange(r, from, to)).map(r => ({ number: r.number, date: r.date, description: r.description, amount: -r.amount }))],
      [L(d).ret, (d.returns ?? []).filter(r => r.customer === c && inRange(r, from, to)).map(r => ({ number: r.number, date: r.date, description: r.description, amount: -r.total }))],
      [L(d).dp, d.invoices.filter(i => i.customer === c && i.kind === 'DP' && inRange(i, from, to)).map(i => ({ number: i.number, date: i.date, description: i.description, amount: -i.total }))],
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

// ---- lists and flows ----
const CATEGORY = 'Umum' // default customer/vendor category; categories are not modelled yet

/** Daftar Pelanggan / Daftar Pemasok: by number under the category; balance as "IDR <amount>" at asOf.
 *  The customer list also prints the creation timestamp (`createdAt`, formatted `dd Mon yyyy HH:mm:ss`). */
export function partyList(d: SalesData, asOf: string, createdAt?: Map<string, string>): string[][] {
  const bal = (c: string) => movements(d, c).filter(m => m.date <= asOf).reduce((s, m) => s + m.amount, 0)
  const head = createdAt ? ['ID Pelanggan', 'Nama', 'Tgl/Jam Pembuatan', 'Saldo (Mata Uang)', 'Alamat lainnya'] : ['ID Pemasok', 'Nama', 'Saldo (Mata Uang)']
  return [head, [CATEGORY], ...[...d.customers.keys()].sort().map(c => [c, d.customers.get(c)!, ...(createdAt ? [createdAt.get(c) ?? ''] : []), `IDR ${formatIdr(bal(c))}`])]
}

/** Histori Proses Penjualan / Pembelian: one row per invoice in range with the payment documents that settle it ("-" when none). */
/** `extra`: unlinked purchase receipts and orders, printed after the invoices (receipts, then orders) in their own stage column. */
export function flowHistory(d: SalesData, from: string, to: string, sales: boolean, extra: { receipts: string[]; orders: string[] } = { receipts: [], orders: [] }): string[][] {
  const head = sales
    ? ['Penawaran Penjualan', 'Pesanan Penjualan', 'Pengiriman Pesanan', 'Uang Muka Penjualan', 'Faktur Penjualan', 'Retur Penjualan', 'Penerimaan Penjualan', 'Tukar Faktur']
    : ['Permintaan Barang', 'Pesanan Pembelian', 'Penerimaan Barang', 'Uang Muka Pembelian', 'Faktur Pembelian', 'Retur Pembelian', 'Pembayaran Pembelian']
  const rows = d.invoices.filter(i => inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).flatMap(i => {
    const pays = d.receipts.filter(r => r.payments.some(p => p.invoice === i.number)).sort((a, b) => (a.date < b.date ? -1 : 1))
    return (pays.length ? pays.map(p => p.number) : ['-']).map(p => sales ? ['-', i.order ?? '-', i.delivery ?? '-', '-', i.number, '-', p, i.exchange ?? '-'] : ['-', '-', '-', '-', i.number, '-', p])
  })
  const dash = (k: number, n: string) => head.map((_, i) => (i === k ? n : '-'))
  return [head, ...rows, ...extra.receipts.map(n => dash(2, n)), ...extra.orders.map(n => dash(1, n))]
}

/** Barang Paling Laku: per item, number of invoices containing it, quantity and value. */
export function sellingItemFrequency(d: SalesData, from: string, to: string): string[][] {
  const ls = linesIn(d, from, to)
  return [['Kode Barang', 'Nama Barang', 'Frekuensi (x Terjual)', 'Kuantitas', 'Nilai Total'],
    ...[...group(ls, l => l.item).values()].sort((a, b) => tv(b) - tv(a)).map(xs => [xs[0]!.item, xs[0]!.itemName, String(new Set(xs.map(x => x.inv.number)).size), qty(tq(xs)), formatIdr(tv(xs))])]
}

/** Profitabilitas per Faktur: sales − cost of goods (0 for services) − extra costs. */
export function profitabilityByInvoice(d: SalesData, from: string, to: string, cogs: (invoice: string) => number = () => 0): string[][] {
  return [['Nomor #', 'Tanggal', 'Pelanggan', 'Penjualan', 'BPP', 'Biaya Tambahan', 'Biaya Penerimaan', 'Laba setelah Biaya'],
    ...d.invoices.filter(i => inRange(i, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
      .map(i => [i.number, fmtDate(i.date), d.customers.get(i.customer)!, formatIdr(i.total), formatIdr(cogs(i.number)), '0', '0', formatIdr(i.total - cogs(i.number))])]
}

/** Profitabilitas per Pelanggan: per customer with invoices in range: sales, cost of goods, margin; total. */
export function profitabilityByCustomer(d: SalesData, from: string, to: string, cogs: (invoice: string) => number = () => 0): string[][] {
  const rows = activeCustomers(d, from, to).map(c => {
    const inv = d.invoices.filter(i => i.customer === c && inRange(i, from, to))
    return { c, s: inv.reduce((t, i) => t + i.total, 0), k: inv.reduce((t, i) => t + cogs(i.number), 0) }
  }).filter(r => r.s)
  const line = (n: string, s: number, k: number) => [n, formatIdr(s), formatIdr(k), '0', '0', formatIdr(s - k)]
  const t = rows.reduce((a, r) => ({ s: a.s + r.s, k: a.k + r.k }), { s: 0, k: 0 })
  return [['Pelanggan', 'Penjualan', 'BPP', 'Biaya Tambahan', 'Biaya Penerimaan', 'Laba setelah Biaya'], ...rows.map(r => line(d.customers.get(r.c)!, r.s, r.k)), line('Total Pelanggan', t.s, t.k)]
}

// ---- returns ----
/** Daftar Retur Penjualan / Pembelian */
export function returnList(d: SalesData, from: string, to: string): string[][] {
  return [['Nomor #', 'Tanggal', L(d).party, 'Total'], ...(d.returns ?? []).filter(r => inRange(r, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
    .map(r => [r.number, fmtDate(r.date), d.customers.get(r.customer)!, formatIdr(r.total)])]
}

/** Rincian Retur: one block per return. The sales version adds an empty "Nama Biaya :" line; the purchase version does not. */
export function returnDetail(d: SalesData, from: string, to: string): string[][] {
  return (d.returns ?? []).filter(r => inRange(r, from, to)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).flatMap(r => [
    ['Nomor #', ':', r.number, 'Mata Uang', ':', CURRENCY], ['Tanggal', ':', fmtDate(r.date), 'Sub Total', ':', formatIdr(r.total)],
    [L(d).party, ':', d.customers.get(r.customer)!, 'Total', ':', formatIdr(r.total)], ...(d.labels ? [] : [['Nama Biaya', ':']]),
    ['Kode #', 'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga'], ...r.lines.map(l => [l.item, l.itemName, qty(l.qty), formatIdr(l.price), formatIdr(l.total)]),
    [qty(r.lines.reduce((s, l) => s + l.qty, 0)), formatIdr(r.total)],
  ])
}

/** Retur Penjualan/Pembelian per Barang */
export function returnByItem(d: SalesData, from: string, to: string): string[][] {
  const ls = (d.returns ?? []).filter(r => inRange(r, from, to)).flatMap(r => r.lines)
  const label = d.labels ? ['Nama Barang Barang & Jasa', 'Nilai Retur'] : ['Nama Barang & Jasa', 'Nilai Retur (Faktur)']
  return [label, ...sortBy([...group(ls, l => l.item).values()], xs => xs[0]!.itemName).map(xs => [xs[0]!.itemName, formatIdr(tv(xs))]), [`Total ${label[0]}`, formatIdr(tv(ls))]]
}

// ---- charts: Accurate renders these as images; the ERP returns the series and the labels printed on them ----
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

/** Grafik Penjualan Bulanan: one bar per month with invoices in range, labelled "<Mon yyyy>" and the amount. */
export function monthlySalesChart(d: SalesData, from: string, to: string): [string, string][] {
  const m = new Map<string, number>()
  for (const i of d.invoices.filter(i => inRange(i, from, to))) m.set(i.date.slice(0, 7), (m.get(i.date.slice(0, 7)) ?? 0) + i.total)
  return [...m].sort().map(([k, v]) => [`${MON_SHORT[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`, formatIdr(v)])
}

/** Pie legend lines "<name> - <amount> (<pct>%)", largest first, whole-number percentages. */
function shareLegend(xs: [string, number][]) {
  const total = xs.reduce((s, [, v]) => s + v, 0)
  return xs.filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} - ${formatIdr(v)} (${Math.round((v / total) * 100)}%)`)
}
/** Porsi Penjualan per Pelanggan */
export const customerShareChart = (d: SalesData, from: string, to: string) =>
  shareLegend([...d.customers.keys()].map(c => [d.customers.get(c)!, d.invoices.filter(i => i.customer === c && inRange(i, from, to)).reduce((s, i) => s + i.total, 0)]))
/** Porsi Penjualan per Barang */
export const itemShareChart = (d: SalesData, from: string, to: string) =>
  shareLegend([...group(linesIn(d, from, to), l => l.item).values()].map(xs => [xs[0]!.itemName, tv(xs)]))

/** Grafik Umur Piutang/Utang: one bar per non-empty age bucket (open balance at asOf). */
export function agingChart(d: SalesData, asOf: string): [string, string][] {
  const all = [...d.customers.keys()].flatMap(c => openInvoices(d, asOf, c))
  return spread(all).map((v, i) => [BUCKETS[i]!, v] as const).filter(([, v]) => v).map(([b, v]) => [b, formatIdr(v)])
}

/** Grafik Rata-rata Pembayaran Pelanggan: per month in range, average days from invoice date to each receipt dated that month
 *  (partial payments count); months without receipts show 0. */
export function collectionDaysChart(d: SalesData, from: string, to: string): [string, string][] {
  const out: [string, string][] = []
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 1)).toISOString().slice(0, 7)) {
    const ds = d.receipts.filter(r => r.date.startsWith(m)).flatMap(r => r.payments.map(p => days(d.invoices.find(i => i.number === p.invoice)!.date, r.date)))
    out.push([`${MON_SHORT[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`, String(ds.length ? Math.round(ds.reduce((s, x) => s + x, 0) / ds.length) : 0)])
  }
  return out
}

// ---- down payments ----
const dpUsedBy = (d: SalesData, dp: string, asOf: string) =>
  regular(d).filter(i => i.date <= asOf).flatMap(i => (i.dpUses ?? []).filter(u => u.dp === dp).map(u => ({ i, amount: u.amount })))

/** Uang Muka Penjualan per customer: DP invoices in range, used (as of the end date) and remaining. */
export function downPaymentsByCustomer(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Total', 'Terpakai/Retur (per Tgl)', 'Sisa Uang Muka (per Tgl)', 'No Pesanan #']]
  for (const c of [...d.customers.keys()].sort(byName(d))) {
    const dps = d.invoices.filter(i => i.customer === c && i.kind === 'DP' && inRange(i, from, to))
    if (!dps.length) continue
    out.push([d.customers.get(c)!], ...dps.map(i => { const used = dpUsedBy(d, i.number, to).reduce((s, u) => s + u.amount, 0); return [i.number, fmtDate(i.date), formatIdr(i.total), formatIdr(used), formatIdr(i.total - used)] }))
  }
  return out
}

/** Penggunaan Uang Muka Penjualan: per DP invoice in range, the invoices that used it. */
export function downPaymentUsage(d: SalesData, from: string, to: string): string[][] {
  return d.invoices.filter(i => i.kind === 'DP' && inRange(i, from, to)).flatMap(dp => {
    const uses = dpUsedBy(d, dp.number, to), used = uses.reduce((s, u) => s + u.amount, 0)
    return [['Nomor #', ':', dp.number, 'Uang Muka', ':', formatIdr(dp.total)], ['Tanggal', ':', fmtDate(dp.date), 'Terpakai/Retur (per Tgl)', ':', formatIdr(used)],
      ['Sisa Uang Muka (per Tgl)', ':', formatIdr(dp.total - used)], ['Nomor Transaksi', 'Tgl Transaksi', 'Tipe Transaksi', 'Pakai Uang Muka (per Tgl)'],
      ...uses.map(u => [u.i.number, fmtDate(u.i.date), L(d).invoice, formatIdr(u.amount)]), [formatIdr(used)]]
  })
}

// ---- deliveries ----
export interface Delivery { number: string; customer: string; date: string; lines: { item: string; itemName: string; unit: string; qty: number }[] }
const dlvIn = (ds: Delivery[], f: string, t: string) => ds.filter(x => inRange(x, f, t)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
/** Daftar Pengiriman Pesanan; "Pengiriman" (shipment) prints nothing when unset. */
export const deliveryList = (d: SalesData, ds: Delivery[], f: string, t: string) =>
  [['Nomor #', 'Tanggal', 'Pelanggan', 'Pengiriman'], ...dlvIn(ds, f, t).map(x => [x.number, fmtDate(x.date), d.customers.get(x.customer)!])]
export const deliveryDetail = (d: SalesData, ds: Delivery[], f: string, t: string) => dlvIn(ds, f, t).flatMap(x => [
  ['Nomor #', ':', x.number, 'Pelanggan', ':', d.customers.get(x.customer)!], ['Tanggal', ':', fmtDate(x.date)], ['Kode #', 'Nama Barang', 'Kuantitas', 'Satuan'],
  ...x.lines.map(l => [l.item, l.itemName, qty(l.qty), l.unit]), [qty(x.lines.reduce((s, l) => s + l.qty, 0))]])
/** Status Pengiriman Pesanan: per customer, each delivery with the invoice that billed it. */
export function deliveryHistory(d: SalesData, ds: Delivery[], f: string, t: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Status', 'No Faktur #', 'Tgl Faktur', 'Total Faktur']]
  for (const c of [...d.customers.keys()].sort(byName(d))) {
    const xs = dlvIn(ds, f, t).filter(x => x.customer === c)
    if (!xs.length) continue
    out.push([d.customers.get(c)!], ...xs.map(x => { const i = d.invoices.find(i => i.delivery === x.number)
      return i ? [x.number, fmtDate(x.date), 'Difaktur', i.number, fmtDate(i.date), formatIdr(i.total)] : [x.number, fmtDate(x.date), 'Belum difaktur'] }))
  }
  return out
}

/** Rincian Tukar Faktur. Umur is days from the invoice due date to `today` (Accurate uses the current date, not the report range). */
export function exchangeDetail(d: SalesData, xs: { number: string; date: string; collectDate: string; dueDate: string; invoices: string[] }[], from: string, to: string, today: string): string[][] {
  const owing = (i: Invoice) => openInvoices(d, today < i.date ? i.date : today, i.customer).find(o => o.number === i.number)?.owing ?? 0
  return xs.filter(x => inRange(x, from, to)).sort((a, b) => (a.number < b.number ? -1 : 1)).flatMap(x => {
    const invs = x.invoices.map(n => d.invoices.find(i => i.number === n)!)
    return [['Nomor #', ':', x.number, 'Jatuh Tempo', ':', fmtDate(x.dueDate)], ['Tanggal', ':', fmtDate(x.date), 'Tenaga Penjual', ':'], ['Tgl Tukar', ':', fmtDate(x.collectDate)],
      ['No Faktur', 'Tgl Faktur', 'Pelanggan', 'Jatuh Tempo', 'Total Faktur', 'Terutang', 'Umur (hr)'],
      ...invs.map(i => [i.number, fmtDate(i.date), d.customers.get(i.customer)!, fmtDate(i.dueDate), formatIdr(i.total), formatIdr(owing(i)), formatIdr(days(i.dueDate, today) * 100)]),
      [formatIdr(invs.reduce((s, i) => s + i.total, 0))]]
  })
}

/**
 * Sales lines for the item views: invoice lines at DPP (line total less its pro-rata share of the invoice discount, no PPN)
 * and sales-return lines negative, dated in [from, to] (fixtures/sales-views.json: T19 Penjualan 2.041.250 = sum of DPPs).
 */
export function itemSales(d: SalesData, from: string, to: string) {
  const out: { line: InvoiceLine; qty: number; value: number }[] = []
  for (const i of regular(d).filter(i => inRange(i, from, to))) {
    const sub = (i.lines ?? []).reduce((s, l) => s + l.total, 0)
    for (const l of i.lines ?? []) out.push({ line: l, qty: l.qty, value: l.total - (sub && i.discount ? Math.round(i.discount * l.total / sub) : 0) })
  }
  for (const r of (d.returns ?? []).filter(r => inRange(r, from, to))) for (const l of r.lines) out.push({ line: l, qty: -l.qty, value: -l.total })
  return out
}
const groupSales = (xs: { line: InvoiceLine; qty: number; value: number }[]) => {
  const m = new Map<string, { line: InvoiceLine; qty: number; value: number }>()
  for (const x of xs) { const g = m.get(x.line.item); if (g) { g.qty += x.qty; g.value += x.value } else m.set(x.line.item, { ...x }) }
  return [...m.values()].sort((a, b) => a.line.itemName.localeCompare(b.line.itemName))
}
const qtyFmt = (q: number) => formatIdr(Math.round(q * 100))
const viewHead = (title: string, from: string, to: string) => [[title], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`], ['Cabang : [Semua Cabang]']]

/** Penjualan Barang per Gudang: stock items only (services have no warehouse); every line from the default warehouse. */
// shortcut: the ERP does not store a warehouse per invoice line; all fixture sales ship from Utama. Store it when sales from other warehouses exist.
export function salesItemByWarehouse(d: SalesData, from: string, to: string): string[][] {
  const gs = groupSales(itemSales(d, from, to).filter(x => x.line.type === 'INVENTORY'))
  // no rows → Accurate prints no column header either
  const rows = [...viewHead('Penjualan Barang per Gudang', from, to), ...(gs.length ? [['Nama Barang', 'Gudang', 'Kuantitas', 'Penjualan']] : [])]
  for (const g of gs) rows.push([g.line.itemName, 'Utama', qtyFmt(g.qty), formatIdr(g.value)], ['Total Gudang', qtyFmt(g.qty), formatIdr(g.value)])
  if (gs.length) rows.push(['Total Nama Barang', qtyFmt(gs.reduce((s, g) => s + g.qty, 0)), formatIdr(gs.reduce((s, g) => s + g.value, 0))])
  return rows
}

/** Penjualan Barang per Cabang: every item incl. services, one branch column (Kantor Pusat) plus the all-branch total. */
export function salesItemByBranch(d: SalesData, from: string, to: string): string[][] {
  const gs = groupSales(itemSales(d, from, to))
  const rows = [...viewHead('Penjualan Barang per Cabang', from, to), ['Barang & Jasa', 'Satuan', 'Kantor Pusat', 'Total Nama Cabang'], ['Kuantitas', 'Penjualan', 'Kuantitas', 'Penjualan']]
  for (const g of gs) rows.push([g.line.itemName, g.line.unit, qtyFmt(g.qty), formatIdr(g.value), qtyFmt(g.qty), formatIdr(g.value)])
  if (gs.length) { const q = qtyFmt(gs.reduce((s, g) => s + g.qty, 0)), v = formatIdr(gs.reduce((s, g) => s + g.value, 0)); rows.push(['Total Barang & Jasa', q, v, q, v]) }
  return rows
}

/** Penjualan per Merek: one row per brand; the ERP has no brands, so all sales fall in the blank brand (its name cell drops out). */
export function salesByBrand(d: SalesData, from: string, to: string): string[][] {
  const xs = itemSales(d, from, to)
  const rows = [...viewHead('Penjualan per Merek', from, to), ['Merk Barang', 'Kuantitas', 'Penjualan']]
  if (xs.length) rows.push([qtyFmt(xs.reduce((s, x) => s + x.qty, 0)), formatIdr(xs.reduce((s, x) => s + x.value, 0))])
  return rows
}

/**
 * Limit Piutang Pelanggan (docs/reports/CustomerLimitReport.md): customers with a credit limit, in the default category
 * block "Umum". Saldo = current receivable over all dates (a cheque receipt already reduces it), printed per currency
 * ("IDR 444.000, USD 0"; a zero balance prints only "IDR 0"). Giro Mundur = the customer's cheques not yet due.
 * Sisa Limit = limit - saldo - open orders - giro mundur.
 */
// shortcut: open sales orders are not modelled (0); the currency-list rule is inferred from two captures.
export function customerLimit(d: SalesData, limits: Map<string, number>, currencies: string[], giro: Map<string, number> = new Map()): string[][] {
  const rows: string[][] = [['Limit Piutang Pelanggan'], ['Cabang : [Semua Cabang], Filter berdasarkan : Limit Piutang'], ['Nama', 'Saldo (Mata Uang)', 'Pesanan', 'Giro Mundur', 'Limit Piutang', 'Sisa Limit']]
  const custs = [...limits.keys()].sort(byName(d))
  if (custs.length) rows.push(['Umum'])
  for (const c of custs) {
    const saldo = movements(d, c).reduce((s, m) => s + m.amount, 0), limit = limits.get(c)!
    const g = giro.get(c) ?? 0
    const saldoText = saldo ? currencies.map((cur, i) => `${cur} ${formatIdr(i === 0 ? saldo : 0)}`).join(', ') : `${currencies[0]} 0`
    rows.push([d.customers.get(c)!, saldoText, '0', formatIdr(g), formatIdr(limit), formatIdr(limit - saldo - g)])
  }
  return rows
}

/**
 * Sisa Kredit Pelanggan (docs/reports/CustomerExistingCreditListReport.md): customers with unused credit as of the date.
 * Credit = receipts above the invoices they pay (kelebihan bayar); nothing in the ERP consumes credit yet.
 */
export function customerCredit(d: SalesData, asOf: string): string[][] {
  const credit = new Map<string, number>()
  for (const r of d.receipts.filter(r => r.date <= asOf)) {
    const excess = r.amount - r.payments.reduce((s, p) => s + p.amount, 0)
    if (excess > 0) credit.set(r.customer, (credit.get(r.customer) ?? 0) + excess)
  }
  const custs = [...credit.keys()].sort(byName(d))
  const rows: string[][] = [['Sisa Kredit Pelanggan'], [`Per Tgl. ${fmtHeaderDate(asOf)}`], ['Cabang : [Semua Cabang]']]
  if (!custs.length) return rows
  rows.push(['Mata Uang', 'Pelanggan', 'ID Pelanggan Pelang', 'Sisa Kredit'])
  for (const c of custs) rows.push([CURRENCY, d.customers.get(c)!, c, formatIdr(credit.get(c)!)])
  rows.push(['Total Pelanggan', formatIdr([...credit.values()].reduce((s, v) => s + v, 0))])
  return rows
}
