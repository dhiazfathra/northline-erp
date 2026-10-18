import { fmtDate, fmtHeaderDate } from './general-ledger'

export interface SerialMove { item: string; itemName: string; serial: string; date: string; docType: string; quantity: number; warehouse: string
  docNumber?: string; description?: string; expiry?: string }

const DOC = { PI: 'Faktur Pembelian' } as Record<string, string>
const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000
const bucketRow = (n: number, qty: number) => [0, 1, 2, 3, 4].map(i => String(i === (n <= 30 ? 0 : n <= 60 ? 1 : n <= 90 ? 2 : n <= 120 ? 3 : 4) ? qty : 0))
const onHand = (ms: SerialMove[], asOf: string) => {
  const by = new Map<string, { first: SerialMove; qty: number }>()
  for (const m of ms.filter(m => m.date <= asOf).sort((a, b) => a.date.localeCompare(b.date))) {
    const x = by.get(m.serial) ?? { first: m, qty: 0 }; x.qty += m.quantity; by.set(m.serial, x)
  }
  return [...by.values()].filter(x => x.qty > 0).sort((a, b) => a.first.serial.localeCompare(b.first.serial))
}

/** Mutasi Nomor Seri/Produksi (docs/reports/ReceivedDeliveredSerialNumberReport.md): moves of one item in the window. */
// shortcut: only receipts (Terima Barang) are modelled; deliveries print under "Kirim Barang" once sales carry serials.
export function receivedDeliveredSerials(ms: SerialMove[], item: string, from: string, to: string): string[][] {
  const xs = ms.filter(m => m.item === item && m.date >= from && m.date <= to && m.quantity > 0).sort((a, b) => a.date.localeCompare(b.date) || a.serial.localeCompare(b.serial))
  if (!xs.length) return [['Kode Barang', ':'], ['Nama Barang', ':'], ['Tanggal', 'Tipe Transaksi', 'Nomor Seri/Produksi', 'Kuantitas']]
  return [['Kode Barang', ':', item], ['Nama Barang', ':', xs[0]!.itemName], ['Tanggal', 'Tipe Transaksi', 'Nomor Seri/Produksi', 'Kuantitas'], ['Terima Barang'],
    ...xs.map(m => [fmtDate(m.date), DOC[m.docType] ?? m.docType, m.serial, String(m.quantity)]), [String(xs.reduce((s, m) => s + m.quantity, 0))]]
}

/** Umur Nomor Seri/Batch (docs/reports/SerialNumberAgingDetailReport.md): serials on hand in a warehouse, aged from their receipt date. */
export function serialAging(ms: SerialMove[], item: string, warehouse: string, asOf: string): string[][] {
  const head = ['No Seri/Produksi No Seri', 'Tgl Transaksi Rincian Stok', '1 - 30', '31 - 60', '61 - 90', '91 - 120', '> 120']
  const xs = onHand(ms.filter(m => m.item === item && m.warehouse === warehouse), asOf)
  if (!xs.length) return [head]
  return [head, [xs[0]!.first.itemName], ...xs.flatMap(x => [[x.first.serial], [x.first.serial, fmtDate(x.first.date), ...bucketRow(days(x.first.date, asOf), x.qty)]])]
}

/** Sisa Umur Per Nomor Produksi (docs/reports/RemainingAgeSerialNumberDetailReport.md): remaining shelf life to the expiry date. */
// shortcut: no expiry dates are modelled, so every bucket is 0 (as Accurate prints for serials without an expiry date).
export function remainingAgeSerials(ms: SerialMove[], item: string, asOf: string): string[][] {
  const xs = onHand(ms.filter(m => m.item === item), asOf)
  return [['Kode Barang', ':', item], ['Nama Barang', ':', xs[0]?.first.itemName ?? ''], ['No Seri/Produksi', 'Kuantitas', '1 - 30', '31 - 60', '61 - 90', '91 - 120', '> 120'],
    ...xs.map(x => [x.first.serial, String(x.qty), '0', '0', '0', '0', '0'])]
}

// Retail Demo serial/batch reports (ADR-0024; fixture fixtures/retail/inventory-re.json). Quantities print en-US, plain.
const DOC_TYPE: Record<string, string> = { PI: 'Faktur Pembelian', IT: 'Pemindahan Barang' }
const HEAD = ['No Seri/Produksi', 'Kuantitas', 'Tgl Kadaluarsa', 'Sisa Hari(Kadaluarsa)']
const n = (q: number) => q.toLocaleString('en-US', { maximumFractionDigits: 2 })
/** Serial balances (date <= asOf) per key; a serial without expiry prints quantity then 0 (its date cell is blank). */
const balances = (ms: SerialMove[], asOf: string, key: (m: SerialMove) => string) => {
  const by = new Map<string, { m: SerialMove; qty: number }>()
  for (const m of ms.filter(m => m.date <= asOf)) { const k = key(m), x = by.get(k) ?? { m, qty: 0 }; x.qty += m.quantity; by.set(k, x) }
  return [...by.values()].filter(x => x.qty > 0).sort((a, b) => a.m.serial.localeCompare(b.m.serial))
}
const snRow = (m: SerialMove, qty: number, days: (expiry: string) => number) => m.expiry ? [m.serial, n(qty), fmtDate(m.expiry), String(days(m.expiry))] : [m.serial, n(qty), '0']
const daysTo = (asOf: string) => (e: string) => Math.round((Date.parse(e) - Date.parse(asOf)) / 86_400_000)
const itemsOf = (ms: SerialMove[], items: string[]) => [...new Set(ms.filter(m => items.includes(m.item)).map(m => m.item))].sort()
const head = (ms: SerialMove[], item: string) => [['Kode Barang', ':', item], ['Nama Barang', ':', ms.find(m => m.item === item)!.itemName], HEAD]

/** Stok Nomor Seri/Produksi: per selected item, every serial with stock in any warehouse (transit included). Sisa Hari = expiry - as-of. */
export function serialStock(ms: SerialMove[], items: string[], asOf: string): string[][] {
  const rows = [['Stok Nomor Seri/Produksi'], [`Per Tgl. ${fmtHeaderDate(asOf)}`]]
  for (const it of itemsOf(ms, items)) {
    const xs = balances(ms.filter(m => m.item === it), asOf, m => m.serial)
    if (xs.length) rows.push(...head(ms, it), ...xs.map(x => snRow(x.m, x.qty, daysTo(asOf))))
  }
  return rows
}

/** … per Gudang: per item, a warehouse row (name order, transit included), its serials, then a quantity subtotal. */
export function serialStockPerWarehouse(ms: SerialMove[], items: string[], asOf: string): string[][] {
  const rows = [['Stok Nomor Seri/Produksi per Gudang'], [`Per Tgl. ${fmtHeaderDate(asOf)}`]]
  for (const it of itemsOf(ms, items)) {
    const xs = balances(ms.filter(m => m.item === it), asOf, m => m.warehouse + '\0' + m.serial)
    if (!xs.length) continue
    rows.push(...head(ms, it))
    for (const w of [...new Set(xs.map(x => x.m.warehouse))].sort()) {
      const ws = xs.filter(x => x.m.warehouse === w)
      rows.push([w], ...ws.map(x => snRow(x.m, x.qty, daysTo(asOf))), [n(ws.reduce((t, x) => t + x.qty, 0))])
    }
  }
  return rows
}

/** … per Barang: per selected warehouse (name order), per item (name order), its serials, then a quantity subtotal. */
export function serialStockPerItem(ms: SerialMove[], warehouses: string[], asOf: string): string[][] {
  const rows = [['Stok Nomor Seri/Produksi per Barang'], [`Per Tgl. ${fmtHeaderDate(asOf)}`], HEAD]
  for (const w of [...warehouses].sort()) {
    const xs = balances(ms.filter(m => m.warehouse === w), asOf, m => m.item + '\0' + m.serial)
    if (!xs.length) continue
    rows.push([w])
    for (const name of [...new Set(xs.map(x => x.m.itemName))].sort()) {
      const is = xs.filter(x => x.m.itemName === name)
      rows.push([name], ...is.map(x => snRow(x.m, x.qty, daysTo(asOf))), [n(is.reduce((t, x) => t + x.qty, 0))])
    }
  }
  return rows
}

/** Histori Nomor Seri/Produksi: one titled block per selected serial; every warehouse leg is a row (a transfer prints out then in),
 *  Saldo runs over all warehouses, then Masuk/Keluar totals. */
export function serialMutation(ms: SerialMove[], serials: { item: string; serial: string }[]): string[][] {
  const rows: string[][] = []
  for (const s of [...serials].sort((a, b) => a.serial.localeCompare(b.serial))) {
    const xs = ms.filter(m => m.item === s.item && m.serial === s.serial).sort((a, b) => a.date.localeCompare(b.date)) // stable: loader order within a day
    if (!xs.length) continue
    let bal = 0, tin = 0, tout = 0
    rows.push(['Histori Nomor Seri/Produksi'], ['Nomor Seri/Produksi', ':', s.serial, 'Nama Barang', ':', xs[0]!.itemName], ['Kode Barang', ':', s.item],
      ['Tgl Transaksi', 'No. Transaksi Rincian Stok', 'Tipe Transaksi', 'Keterangan Rincian Stok', 'Masuk', 'Keluar', 'Saldo'],
      ...xs.map(m => { const i = Math.max(m.quantity, 0), o = Math.max(-m.quantity, 0); bal += m.quantity; tin += i; tout += o
        return [fmtDate(m.date), m.docNumber ?? '', DOC_TYPE[m.docType] ?? m.docType, m.description ?? '', n(i), n(o), n(bal)] }),
      [n(tin), n(tout)])
  }
  return rows
}

/** Nomor Produksi Segera Kadaluarsa: serials whose expiry falls in [from, to] with stock on hand; Sisa Hari counts whole days from the
 *  print moment `now` (Asia/Jakarta) to the expiry midnight, so a print after 00:00 is one less than the calendar difference. */
export function serialExpiredSoon(ms: SerialMove[], from: string, to: string, now: string): string[][] {
  const rows = [['Nomor Produksi Segera Kadaluarsa'], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`]]
  const xs = balances(ms.filter(m => m.expiry && m.expiry >= from && m.expiry <= to), '9999-12-31', m => m.item + '\0' + m.serial)
  const left = (e: string) => Math.floor((Date.parse(e + 'T00:00:00+07:00') - Date.parse(now)) / 86_400_000)
  for (const it of [...new Set(xs.map(x => x.m.item))].sort())
    rows.push(...head(ms, it), ...xs.filter(x => x.m.item === it).map(x => snRow(x.m, x.qty, left)))
  return rows
}
