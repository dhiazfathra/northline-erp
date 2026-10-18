import { fmtDate } from './general-ledger'

export interface SerialMove { item: string; itemName: string; serial: string; date: string; docType: string; quantity: number; warehouse: string }

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
