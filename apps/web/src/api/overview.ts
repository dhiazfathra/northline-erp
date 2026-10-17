import type { DrawerRecord, ListRow, NewTxInput, Overview } from '@northline/schemas/overview'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

const cols = (seed: number) => Array.from({ length: 24 }, (_, i) => 1 + ((i * 7 + seed * 3 + (i % 5)) % 4))
const bars = (seed: number) => Array.from({ length: 12 }, (_, i) => 4 + ((i * 5 + seed * 7) % 13))

const rec = (kind: [string, string], title: string, value: string, note: [string, string], lines: [string, string, string][], cta: [string, string]): DrawerRecord => ({
  kind: { id: kind[0], en: kind[1] },
  title,
  value,
  note: { id: note[0], en: note[1] },
  lines: lines.map(([id, en, b]) => ({ a: { id, en }, b })),
  cta: { id: cta[0], en: cta[1] },
})

const overview: Overview = {
  kpis: [
    { label: { id: 'Total pendapatan bulan ini', en: 'Total revenue this month' }, value: '1.284.500.000', delta: '+12,4%', cols: cols(1), to: '/docs/sales-invoice' },
    { label: { id: 'Total pengeluaran bulan ini', en: 'Total spend this month' }, value: '742.180.000', delta: '−3,1%', cols: cols(2), to: '/docs/purchase-invoice' },
    { label: { id: 'Piutang belum tertagih', en: 'Outstanding receivables' }, value: '418.950.000', delta: '+5,8%', cols: cols(3), to: '/modules/customers' },
    { label: { id: 'Saldo kas & bank', en: 'Cash & bank balance' }, value: '2.067.300.000', delta: '+2,2%', cols: cols(4), to: '/cash-bank/reconciliation' },
  ],
  cards: [
    {
      id: 'c1',
      title: { id: 'Faktur jatuh tempo', en: 'Invoices due' },
      text: { id: '7 faktur senilai 186,4 jt jatuh tempo minggu ini', en: '7 invoices worth 186.4M fall due this week' },
      bg: 'radial-gradient(60% 70% at 20% 20%,#ec4899,transparent 70%),radial-gradient(60% 70% at 90% 80%,#a855f7,transparent 70%),#3b0764',
      record: rec(['Faktur Penjualan', 'Sales Invoice'], 'SI/2026/10/0142', '186.400.000', ['7 faktur · jatuh tempo 24/10/2026', '7 invoices · due 24/10/2026'], [
        ['Pelanggan', 'Customer', 'PT Sinar Pesisir'],
        ['Tanggal', 'Date', '10/10/2026'],
        ['Jatuh tempo', 'Due', '24/10/2026'],
        ['Status', 'Status', 'Belum lunas'],
      ], ['Kirim pengingat', 'Send reminder']),
    },
    {
      id: 'c2',
      title: { id: 'Rekonsiliasi bank', en: 'Bank reconciliation' },
      text: { id: '23 mutasi BCA belum dicocokkan sejak 10/10', en: '23 BCA transactions unmatched since 10/10' },
      bg: 'radial-gradient(60% 70% at 80% 20%,#38bdf8,transparent 70%),radial-gradient(60% 70% at 10% 90%,#f59e0b,transparent 70%),#0c4a6e',
      record: rec(['Kas & Bank', 'Cash & Bank'], 'BCA 012-345-6789', '64.250.000', ['23 mutasi belum cocok', '23 unmatched lines'], [
        ['Rekening', 'Account', 'BCA Operasional'],
        ['Periode', 'Period', '01/10/2026 – 17/10/2026'],
        ['Saldo bank', 'Bank balance', '1.512.800.000'],
        ['Saldo buku', 'Book balance', '1.448.550.000'],
      ], ['Mulai rekonsiliasi', 'Start reconciling']),
    },
  ],
  lowTabs: [
    { name: { id: 'Modul aktif', en: 'Active modules' }, count: 9 },
    { name: { id: 'Perlu ditinjau', en: 'Needs review' }, count: 14 },
  ],
  groups: [
    {
      title: { id: 'Penjualan', en: 'Sales' },
      sub: { id: 'Faktur, pesanan, penerimaan', en: 'Invoices, orders, receipts' },
      to: '/docs/sales-invoice',
      tiles: [
        { label: { id: 'Faktur Penjualan', en: 'Sales Invoice' }, v: '128', d: '+8', up: true, bars: bars(1), to: '/docs/sales-invoice' },
        { label: { id: 'Pesanan Penjualan', en: 'Sales Order' }, v: '46', d: '+3', up: true, bars: bars(2), to: '/docs/sales-order' },
        { label: { id: 'Pelanggan', en: 'Customers' }, v: '312', d: '+12', up: true, bars: bars(3), to: '/modules/customers' },
      ],
    },
    {
      title: { id: 'Pembelian', en: 'Purchases' },
      sub: { id: 'Pesanan, faktur, pembayaran', en: 'Orders, bills, payments' },
      to: '/docs/purchase-invoice',
      tiles: [
        { label: { id: 'Faktur Pembelian', en: 'Purchase Invoice' }, v: '74', d: '−4', up: false, bars: bars(4), to: '/docs/purchase-invoice' },
        { label: { id: 'Pesanan Pembelian', en: 'Purchase Order' }, v: '31', d: '+2', up: true, bars: bars(5), to: '/docs/purchase-order' },
        { label: { id: 'Pemasok', en: 'Vendors' }, v: '88', d: '+1', up: true, bars: bars(6), to: '/modules/vendors' },
      ],
    },
    {
      title: { id: 'Persediaan', en: 'Inventory' },
      sub: { id: 'Barang, gudang, penyesuaian', en: 'Items, warehouses, adjustments' },
      to: '/modules/items',
      tiles: [
        { label: { id: 'Barang & Jasa', en: 'Items & Services' }, v: '1.204', d: '+26', up: true, bars: bars(7), to: '/modules/items' },
        { label: { id: 'Gudang', en: 'Warehouses' }, v: '4', d: '0', up: true, bars: bars(8), to: '/modules/warehouses' },
        { label: { id: 'Penyesuaian', en: 'Adjustments' }, v: '9', d: '−2', up: false, bars: bars(9), to: '/docs/stock-adjustment' },
      ],
    },
  ],
}

const lists: Record<string, ListRow[]> = {
  customers: [
    { id: 'C-0012', name: 'PT Sinar Pesisir', contact: 'Rina Wulandari · 0812-3344-5566', bal: '186.400.000', status: 'overdue' },
    { id: 'C-0018', name: 'CV Maju Bersama', contact: 'Budi Hartono · 0813-2211-9087', bal: '42.750.000', status: 'active' },
    { id: 'C-0021', name: 'PT Arunika Retail', contact: 'Dewi Lestari · 0821-7788-1200', bal: '96.120.000', status: 'active' },
    { id: 'C-0027', name: 'Toko Sentosa Jaya', contact: 'Hendra Gunawan · 0857-1100-4433', bal: '0', status: 'inactive' },
    { id: 'C-0033', name: 'PT Lautan Biru Logistik', contact: 'Sari Anggraini · 0811-9090-2323', bal: '58.300.000', status: 'active' },
    { id: 'C-0040', name: 'UD Berkah Tani', contact: 'Agus Salim · 0896-5544-7788', bal: '35.380.000', status: 'overdue' },
  ],
  vendors: [
    { id: 'V-0004', name: 'PT Kertas Nusantara', contact: 'Yudi Prasetyo · 021-555-0192', bal: '74.500.000', status: 'active' },
    { id: 'V-0009', name: 'PT Mitra Kemasan', contact: 'Lina Marlina · 021-555-8820', bal: '21.900.000', status: 'overdue' },
    { id: 'V-0011', name: 'CV Logam Prima', contact: 'Fajar Nugroho · 031-845-1100', bal: '0', status: 'inactive' },
    { id: 'V-0015', name: 'PT Energi Andalan', contact: 'Ratna Sari · 021-770-4455', bal: '12.600.000', status: 'active' },
  ],
  items: [
    { id: 'BRG-001', name: 'Kertas HVS A4 80gsm', contact: 'Gudang Utama · RIM', bal: '1.250.000', status: 'active' },
    { id: 'BRG-002', name: 'Kardus Box 40×30×30', contact: 'Gudang Utama · PCS', bal: '8.400.000', status: 'active' },
    { id: 'BRG-003', name: 'Tinta Printer Hitam', contact: 'Gudang Cikarang · BTL', bal: '0', status: 'inactive' },
    { id: 'JSA-001', name: 'Jasa Pengiriman Jabodetabek', contact: 'Jasa · TRIP', bal: '450.000', status: 'active' },
    { id: 'BRG-004', name: 'Plastik Wrap 50cm', contact: 'Gudang Surabaya · ROL', bal: '3.150.000', status: 'overdue' },
  ],
  warehouses: [
    { id: 'GDG-01', name: 'Gudang Utama', contact: 'Jl. Pluit Raya 12, Jakarta Utara', bal: '842.600.000', status: 'active' },
    { id: 'GDG-02', name: 'Gudang Cikarang', contact: 'Kawasan Jababeka Blok C3, Bekasi', bal: '316.900.000', status: 'active' },
    { id: 'GDG-03', name: 'Gudang Surabaya', contact: 'Jl. Rungkut Industri 7, Surabaya', bal: '128.400.000', status: 'active' },
    { id: 'GDG-04', name: 'Gudang Transit', contact: 'Tanjung Priok, Jakarta Utara', bal: '0', status: 'inactive' },
  ],
}

export const overviewQuery = (period: string) => queryOptions({ queryKey: ['overview', period], queryFn: () => mock(overview) })
export const moduleListQuery = (moduleId: string) => queryOptions({ queryKey: ['module-list', moduleId], queryFn: () => mock(lists[moduleId] ?? []) })

export const useOverview = (period: string) => useQuery(overviewQuery(period))
export const useModuleList = (moduleId: string) => useQuery(moduleListQuery(moduleId))

export function useCreateTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NewTxInput) => mock(input, 400),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overview'] }),
  })
}
