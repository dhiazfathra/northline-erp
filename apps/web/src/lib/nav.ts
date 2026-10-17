import type { Lang } from './i18n'

type T = Record<Lang, string>
export type SubKind = 'tx' | 'data' | 'report' | 'setting'

export interface NavSub {
  label: T
  kind: SubKind
  icon: string
  to?: string
  /** Locked entries show a lock + note instead of navigating. */
  offNote?: T
}

export interface NavModule {
  id: string
  name: T
  icon: string
  subs: NavSub[]
}

export const kindColor: Record<SubKind, string> = {
  tx: '#ec4899',
  data: '#a855f7',
  report: '#38bdf8',
  setting: '#f59e0b',
}

export const kindLabel: Record<SubKind, T> = {
  tx: { id: 'Transaksi', en: 'Transactions' },
  data: { id: 'Data', en: 'Records' },
  report: { id: 'Laporan', en: 'Reports' },
  setting: { id: 'Pengaturan', en: 'Settings' },
}

const locked: T = { id: 'Aktifkan fitur ini di Preferensi', en: 'Turn this feature on in Preferences' }

export const modules: NavModule[] = [
  {
    id: 'sales',
    name: { id: 'Penjualan', en: 'Sales' },
    icon: 'ph-light ph-shopping-bag',
    subs: [
      { label: { id: 'Penawaran Penjualan', en: 'Sales Quotation' }, kind: 'tx', icon: 'ph-light ph-note-pencil', to: '/docs/sales-quotation' },
      { label: { id: 'Pesanan Penjualan', en: 'Sales Order' }, kind: 'tx', icon: 'ph-light ph-clipboard-text', to: '/docs/sales-order' },
      { label: { id: 'Faktur Penjualan', en: 'Sales Invoice' }, kind: 'tx', icon: 'ph-light ph-receipt', to: '/docs/sales-invoice' },
      { label: { id: 'Penerimaan Penjualan', en: 'Sales Receipt' }, kind: 'tx', icon: 'ph-light ph-hand-coins', to: '/docs/sales-receipt' },
      { label: { id: 'Pelanggan', en: 'Customers' }, kind: 'data', icon: 'ph-light ph-users', to: '/modules/customers' },
    ],
  },
  {
    id: 'purchase',
    name: { id: 'Pembelian', en: 'Purchases' },
    icon: 'ph-light ph-shopping-cart',
    subs: [
      { label: { id: 'Pesanan Pembelian', en: 'Purchase Order' }, kind: 'tx', icon: 'ph-light ph-clipboard-text', to: '/docs/purchase-order' },
      { label: { id: 'Faktur Pembelian', en: 'Purchase Invoice' }, kind: 'tx', icon: 'ph-light ph-receipt', to: '/docs/purchase-invoice' },
      { label: { id: 'Pembayaran Pembelian', en: 'Purchase Payment' }, kind: 'tx', icon: 'ph-light ph-money', to: '/docs/purchase-payment' },
      { label: { id: 'Pemasok', en: 'Vendors' }, kind: 'data', icon: 'ph-light ph-truck', to: '/modules/vendors' },
    ],
  },
  {
    id: 'cash',
    name: { id: 'Kas & Bank', en: 'Cash & Bank' },
    icon: 'ph-light ph-bank',
    subs: [
      { label: { id: 'Penerimaan', en: 'Receipts' }, kind: 'tx', icon: 'ph-light ph-arrow-down-left', to: '/docs/cash-receipt' },
      { label: { id: 'Pembayaran', en: 'Payments' }, kind: 'tx', icon: 'ph-light ph-arrow-up-right', to: '/docs/cash-payment' },
      { label: { id: 'Rekonsiliasi Bank', en: 'Bank Reconciliation' }, kind: 'tx', icon: 'ph-light ph-link', to: '/cash-bank/reconciliation' },
    ],
  },
  {
    id: 'ledger',
    name: { id: 'Buku Besar', en: 'General Ledger' },
    icon: 'ph-light ph-book-open',
    subs: [
      { label: { id: 'Akun Perkiraan', en: 'Chart of Accounts' }, kind: 'data', icon: 'ph-light ph-tree-structure', to: '/accounts' },
      { label: { id: 'Jurnal Umum', en: 'Journal Voucher' }, kind: 'tx', icon: 'ph-light ph-notebook', to: '/docs/journal' },
      { label: { id: 'Neraca Percobaan', en: 'Trial Balance' }, kind: 'report', icon: 'ph-light ph-scales', to: '/ledger/trial-balance' },
      { label: { id: 'Proses Akhir Bulan', en: 'Month-end Close' }, kind: 'tx', icon: 'ph-light ph-calendar-check', to: '/ledger/month-end' },
    ],
  },
  {
    id: 'inventory',
    name: { id: 'Persediaan', en: 'Inventory' },
    icon: 'ph-light ph-package',
    subs: [
      { label: { id: 'Barang & Jasa', en: 'Items & Services' }, kind: 'data', icon: 'ph-light ph-cube', to: '/modules/items' },
      { label: { id: 'Gudang', en: 'Warehouses' }, kind: 'data', icon: 'ph-light ph-warehouse', to: '/modules/warehouses' },
      { label: { id: 'Penyesuaian Persediaan', en: 'Stock Adjustment' }, kind: 'tx', icon: 'ph-light ph-sliders', to: '/docs/stock-adjustment' },
    ],
  },
  {
    id: 'assets',
    name: { id: 'Aset Tetap', en: 'Fixed Assets' },
    icon: 'ph-light ph-buildings',
    subs: [
      { label: { id: 'Aset Tetap', en: 'Fixed Assets' }, kind: 'data', icon: 'ph-light ph-armchair', to: '/fixed-assets' },
      { label: { id: 'Pengeluaran Aset', en: 'Asset Expenditure' }, kind: 'tx', icon: 'ph-light ph-wrench', to: '/asset-modules' },
      { label: { id: 'Aset per Lokasi', en: 'Assets by Location' }, kind: 'report', icon: 'ph-light ph-map-pin', to: '/asset-modules/by-location' },
    ],
  },
  {
    id: 'reports',
    name: { id: 'Daftar Laporan', en: 'Reports' },
    icon: 'ph-light ph-chart-line',
    subs: [
      { label: { id: 'Semua Laporan', en: 'All Reports' }, kind: 'report', icon: 'ph-light ph-files', to: '/reports' },
      { label: { id: 'Riwayat AI', en: 'AI History' }, kind: 'report', icon: 'ph-light ph-sparkle', to: '/ai/history' },
    ],
  },
  {
    id: 'tax',
    name: { id: 'Perpajakan', en: 'Tax' },
    icon: 'ph-light ph-percent',
    subs: [
      { label: { id: 'e-Faktur', en: 'e-Invoice' }, kind: 'tx', icon: 'ph-light ph-file-text', offNote: locked },
      { label: { id: 'e-Bupot', en: 'e-Withholding' }, kind: 'tx', icon: 'ph-light ph-stamp', offNote: locked },
    ],
  },
  {
    id: 'company',
    name: { id: 'Perusahaan', en: 'Company' },
    icon: 'ph-light ph-briefcase',
    subs: [
      { label: { id: 'Preferensi', en: 'Preferences' }, kind: 'setting', icon: 'ph-light ph-gear-six', to: '/settings/preferences' },
      { label: { id: 'Ganti Perusahaan', en: 'Switch Company' }, kind: 'setting', icon: 'ph-light ph-swap', to: '/workspaces' },
    ],
  },
]

/** Lookup for tab labels: longest matching nav path wins. */
export function navFor(path: string): { sub: NavSub; mod: NavModule } | undefined {
  let best: { sub: NavSub; mod: NavModule } | undefined
  for (const mod of modules)
    for (const sub of mod.subs)
      if (sub.to && (path === sub.to || path.startsWith(sub.to + '/')) && (!best || sub.to.length > best.sub.to!.length))
        best = { sub, mod }
  return best
}
