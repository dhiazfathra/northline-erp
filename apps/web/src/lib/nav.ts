import type { Lang } from './i18n'

type T = Record<Lang, string>
export type SubKind = 'tx' | 'data' | 'report' | 'setting'

export interface NavSub {
  label: T
  kind: SubKind
  icon: string
  to?: string
  /** Preferensi feature id; the entry is locked (lock + note) while that switch is off. */
  feature?: string
  offNote?: T
}

export interface NavModule {
  id: string
  name: T
  icon: string
  subs: NavSub[]
}

// Reference `cat` legend: order, colors and names.
export const kindColor: Record<SubKind, string> = {
  tx: '#22c55e',
  data: '#3b82f6',
  setting: '#ef4444',
  report: '#eab308',
}

export const kindLabel: Record<SubKind, T> = {
  tx: { id: 'Transaksi', en: 'Transactions' },
  data: { id: 'Data master', en: 'Master data' },
  setting: { id: 'Pengaturan', en: 'Setup' },
  report: { id: 'Laporan & alat', en: 'Reports & tools' },
}

const locked = (feature: string): T => ({ id: `Aktifkan "${feature}" di Preferensi`, en: `Turn on "${feature}" in Preferences` })

type K = 't' | 'm' | 's' | 'r'
const kindOf: Record<K, SubKind> = { t: 'tx', m: 'data', s: 'setting', r: 'report' }
const gen = (en: string) => '/modules/' + en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/** One reference menu entry; no `to` = generic list screen at /modules/<slug>. */
const sub = (k: K, id: string, en: string, icon: string, to?: string, lock?: [feature: string, name: string]): NavSub => ({
  label: { id, en },
  kind: kindOf[k],
  icon: 'ph-light ph-' + icon,
  to: to ?? gen(en),
  ...(lock && { feature: lock[0], offNote: locked(lock[1]) }),
})
const mod = (id: string, name: T, icon: string, subs: NavSub[]): NavModule => ({ id, name, icon: 'ph-light ph-' + icon, subs })

// The 10 rail modules, set/order/names/icons as in the Ops Dashboard v30 reference (MODS).
export const modules: NavModule[] = [
  mod('settings', { id: 'Pengaturan', en: 'Settings' }, 'gear-six', [
    sub('s', 'Preferensi', 'Preferences', 'sliders-horizontal', '/settings/preferences'),
    sub('s', 'Akses Grup', 'Group Access', 'users-three'),
    sub('s', 'Pengguna', 'Users', 'user'),
    sub('s', 'Penomoran', 'Numbering', 'hash'),
    sub('s', 'Desain Cetakan', 'Print Templates', 'printer'),
    sub('r', 'Northline Store', 'Northline Store', 'storefront'),
  ]),
  mod('company', { id: 'Perusahaan', en: 'Company' }, 'buildings', [
    sub('m', 'Pajak', 'Taxes', 'percent', '/modules/taxes'),
    sub('m', 'Syarat Pembayaran', 'Payment Terms', 'money'),
    sub('m', 'Pengiriman', 'Shipping', 'truck'),
    sub('m', 'FOB', 'FOB', 'anchor'),
    sub('m', 'Gaji/Tunjangan', 'Salary/Allowances', 'wallet'),
    sub('m', 'Karyawan', 'Employees', 'user'),
    sub('t', 'Transaksi Berulang', 'Recurring Transactions', 'repeat'),
    sub('t', 'Proses Akhir Bulan', 'Month-End Process', 'calendar-x', '/ledger/month-end'),
    sub('m', 'Kontak', 'Contacts', 'address-book'),
    sub('r', 'Transaksi Favorit', 'Favorite Transactions', 'star'),
    sub('r', 'Kalender', 'Calendar', 'chart-line'),
    sub('r', 'Log Aktifitas', 'Activity Log', 'clock-counter-clockwise'),
    sub('m', 'Mata Uang', 'Currencies', 'currency-dollar', undefined, ['fx', 'Multi Mata Uang']),
  ]),
  mod('ledger', { id: 'Buku Besar', en: 'General Ledger' }, 'book-open-text', [
    sub('m', 'Akun Perkiraan', 'Chart of Accounts', 'notebook', '/accounts'),
    sub('t', 'Pencatatan Beban', 'Expense Entry', 'trend-down'),
    sub('t', 'Pencatatan Gaji', 'Payroll Entry', 'wallet'),
    sub('t', 'Jurnal Umum', 'General Journal', 'notebook', '/docs/journal'),
    sub('r', 'Histori Akun', 'Account History', 'notebook'),
    sub('r', 'Log Aktifitas Jurnal', 'Journal Activity Log', 'notebook'),
    sub('s', 'Anggaran', 'Budget', 'chart-pie-slice', undefined, ['budget', 'Anggaran dan Target']),
  ]),
  mod('cash', { id: 'Kas & Bank', en: 'Cash & Bank' }, 'bank', [
    sub('t', 'Pembayaran', 'Payments', 'money', '/docs/cash-payment'),
    sub('t', 'Penerimaan', 'Receipts', 'money', '/docs/cash-receipt'),
    sub('t', 'Transfer Bank', 'Bank Transfer', 'arrows-left-right'),
    sub('s', 'SmartLink e-Banking', 'SmartLink e-Banking', 'bank'),
    sub('r', 'Rekening Koran', 'Bank Statement', 'bank'),
    sub('r', 'Histori Bank', 'Bank History', 'clock-counter-clockwise'),
    sub('t', 'Rekonsiliasi Bank', 'Bank Reconciliation', 'bank', '/cash-bank/reconciliation'),
    sub('s', 'SmartLink Virtual Account', 'SmartLink Virtual Account', 'bank'),
    sub('s', 'SmartLink e-Payment', 'SmartLink e-Payment', 'money'),
  ]),
  mod('sales', { id: 'Penjualan', en: 'Sales' }, 'storefront', [
    sub('t', 'Pengiriman Pesanan', 'Order Delivery', 'clipboard-text'),
    sub('t', 'Uang Muka Penjualan', 'Sales Down Payments', 'hand-coins', '/docs/sales-down-payment'),
    sub('t', 'Faktur Penjualan', 'Sales Invoices', 'receipt', '/docs/sales-invoice'),
    sub('t', 'Penerimaan Penjualan', 'Sales Receipts', 'money', '/docs/sales-receipt'),
    sub('m', 'Kategori Pelanggan', 'Customer Categories', 'squares-four'),
    sub('m', 'Kategori Penjualan', 'Sales Categories', 'squares-four'),
    sub('m', 'Pelanggan', 'Customers', 'address-book', '/modules/customers'),
    sub('s', 'Penyesuaian Harga/Diskon', 'Price/Discount Adjustments', 'currency-circle-dollar'),
    sub('s', 'SmartLink e-Commerce', 'SmartLink e-Commerce', 'gear'),
    // Locked like the reference (its lock note names the entry itself); switches per reference Preferensi defaults.
    sub('t', 'Penawaran Penjualan', 'Sales Quotes', 'tag', '/docs/sales-quotation', ['sqo', 'Penawaran Penjualan']),
    sub('t', 'Pesanan Penjualan', 'Sales Orders', 'clipboard-text', '/docs/sales-order', ['sqo', 'Pesanan Penjualan']),
    sub('t', 'Retur Penjualan', 'Sales Returns', 'arrow-u-up-left', '/docs/sales-return', ['sret', 'Retur Penjualan']),
  ]),
  mod('purchase', { id: 'Pembelian', en: 'Purchasing' }, 'shopping-cart', [
    sub('t', 'Pesanan Pembelian', 'Purchase Orders', 'clipboard-text', '/docs/purchase-order'),
    sub('t', 'Penerimaan Barang', 'Goods Receipts', 'package'),
    sub('t', 'Uang Muka Pembelian', 'Purchase Down Payments', 'hand-coins'),
    sub('t', 'Faktur Pembelian', 'Purchase Invoices', 'receipt', '/docs/purchase-invoice'),
    sub('t', 'Pembayaran Pembelian', 'Purchase Payments', 'money', '/docs/purchase-payment'),
    sub('t', 'Retur Pembelian', 'Purchase Returns', 'arrow-u-up-left', '/docs/purchase-return'),
    sub('m', 'Kategori Pemasok', 'Supplier Categories', 'squares-four'),
    sub('m', 'Pemasok', 'Suppliers', 'handshake', '/modules/vendors'),
    sub('t', 'Perintah Pembayaran', 'Payment Orders', 'clipboard-text'),
    sub('t', 'Transfer Pemasok', 'Supplier Transfers', 'arrows-left-right'),
  ]),
  mod('inventory', { id: 'Persediaan', en: 'Inventory' }, 'package', [
    sub('t', 'Permintaan Barang', 'Item Requests', 'hand'),
    sub('t', 'Penyesuaian Persediaan', 'Inventory Adjustments', 'list-checks', '/docs/stock-adjustment'),
    sub('t', 'Perintah Stok Opname', 'Stock Count Orders', 'clipboard-text'),
    sub('t', 'Hasil Stok Opname', 'Stock Count Results', 'list-checks'),
    sub('m', 'Barang & Jasa', 'Goods & Services', 'cube', '/modules/items'),
    sub('m', 'Satuan Barang', 'Item Units', 'cube'),
    sub('m', 'Kategori Barang', 'Item Categories', 'squares-four'),
    sub('m', 'Merek Barang', 'Item Brands', 'cube'),
    sub('r', 'Barang Stok Minimum', 'Minimum Stock Items', 'cube'),
    sub('t', 'Pemindahan Barang', 'Item Transfers', 'arrows-left-right', undefined, ['wh', 'Multi Gudang']),
    sub('m', 'Gudang', 'Warehouses', 'map-pin', '/modules/warehouses', ['wh', 'Multi Gudang']),
    sub('m', 'Aset Tetap', 'Fixed Assets', 'office-chair', '/fixed-assets', ['fa', 'Pencatatan Aset']),
  ]),
  // English names copied verbatim from the reference (its partial translation).
  mod('manufacturing', { id: 'Manufaktur', en: 'Manufacturing' }, 'factory', [
    sub('m', 'Standar Biaya Produksi', 'Standard Expense Produksi', 'database'),
    sub('m', 'Formula Produksi', 'Formula Produksi', 'database'),
    sub('t', 'Rencana Produksi', 'Rencana Produksi', 'file-text'),
    sub('t', 'Perintah Kerja', 'Perintah Kerja', 'clipboard-text'),
    sub('t', 'Pengambilan Bahan Baku', 'Pengambilan Materials Baku', 'factory'),
    sub('t', 'Persiapan Bahan Baku', 'Persiapan Materials Baku', 'factory'),
    sub('m', 'Tahapan Proses', 'Tahapan Proses', 'database'),
    sub('t', 'Penyelesaian Barang Jadi', 'Penyelesaian Item Jadi', 'factory'),
    sub('t', 'Alokasi Biaya Produksi', 'Alokasi Expense Produksi', 'map-pin'),
    sub('r', 'Jadwal Produksi', 'Jadwal Produksi', 'chart-line'),
    sub('r', 'Pemenuhan Bahan Baku', 'Pemenuhan Materials Baku', 'factory'),
    sub('r', 'Monitor Perintah Kerja', 'Monitor Perintah Kerja', 'clipboard-text'),
  ]),
  mod('tax', { id: 'SmartLink Tax', en: 'SmartLink Tax' }, 'receipt', [
    sub('t', 'e-Faktur CTAS', 'e-Faktur CTAS', 'receipt'),
    sub('t', 'Email Faktur Pajak', 'Tax Invoice Email', 'receipt'),
    sub('t', 'e-Faktur Legacy', 'e-Faktur Legacy', 'receipt'),
  ]),
  mod('reports', { id: 'Daftar Laporan', en: 'Report List' }, 'chart-bar', [
    sub('r', 'Daftar Laporan', 'Report List', 'chart-bar', '/reports'),
    sub('r', 'SPT PPN / PPNBM', 'VAT / LGST Return', 'percent'),
    sub('r', 'Analisa AI', 'AI Analysis', 'sparkle', '/ai/history'),
    sub('r', 'SPT PPh Ps.21', 'Income Tax Art. 21 Return', 'percent'),
    sub('r', 'Bukti Potong PPh Ps.21', 'Income Tax Art. 21 Withholding Slip', 'percent'),
  ]),
]

// Built screens the reference reaches from inside other screens, not from the menu: tab labels only.
const routeOnly: NavModule[] = [
  mod('ledger', { id: 'Buku Besar', en: 'General Ledger' }, 'book-open-text', [
    sub('r', 'Neraca Percobaan', 'Trial Balance', 'scales', '/ledger/trial-balance'),
    sub('t', 'Pengeluaran Aset', 'Asset Expenditure', 'wrench', '/asset-modules'),
    sub('r', 'Aset per Lokasi', 'Assets by Location', 'map-pin', '/asset-modules/by-location'),
  ]),
  mod('company', { id: 'Perusahaan', en: 'Company' }, 'buildings', [sub('s', 'Ganti Perusahaan', 'Switch Company', 'swap', '/workspaces')]),
]

export const notDesigned: T = { id: 'Layar ini belum tersedia di desain', en: 'This screen is not designed yet' }

/** Locked while its Preferensi switch is off. */
export const isLocked = (s: NavSub, enabled: Set<string>) => !!s.feature && !enabled.has(s.feature)

/** Lookup for tab labels: longest matching nav path wins. */
export function navFor(path: string): { sub: NavSub; mod: NavModule } | undefined {
  let best: { sub: NavSub; mod: NavModule } | undefined
  for (const mod of [...modules, ...routeOnly])
    for (const sub of mod.subs)
      if (sub.to && (path === sub.to || path.startsWith(sub.to + '/')) && (!best || sub.to.length > best.sub.to!.length))
        best = { sub, mod }
  return best
}
