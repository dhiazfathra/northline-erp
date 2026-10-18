import { customers, idr, items, journals, profitAndLoss, taxes, vendors } from '@northline/schemas/fixtures'
import type { DrawerRecord, ListRow, NewTxInput, Overview } from '@northline/schemas/overview'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { modules } from '@/lib/nav'
import { mock } from './mock'

// Dashboard scope per design board: scenarios S0+S1+S3.
const scope = journals.filter((j) => ['S0', 'S1', 'S3'].includes(j.scenario))
const bal = new Map<string, number>()
for (const j of scope) for (const l of j.lines) bal.set(l.account, (bal.get(l.account) ?? 0) + l.debit - l.credit)
const pl = profitAndLoss(bal)
const receivable = bal.get('110301') ?? 0
const payable = -(bal.get('210101') ?? 0)

// No prior month in the fixtures: previous half of the dot matrix stays at the 1-dot baseline.
const cols = (seed: number) => Array.from({ length: 24 }, (_, i) => (i < 12 ? 1 : 1 + ((i * 7 + seed * 3 + (i % 5)) % 4)))
const bars = (seed: number) => Array.from({ length: 12 }, (_, i) => 4 + ((i * 5 + seed * 7) % 13))
const NO_DELTA = '—'

const rec = (kind: [string, string], title: string, value: string, note: [string, string], lines: [string, string, string][], cta: [string, string]): DrawerRecord => ({
  kind: { id: kind[0], en: kind[1] },
  title,
  value,
  note: { id: note[0], en: note[1] },
  lines: lines.map(([id, en, b]) => ({ a: { id, en }, b })),
  cta: { id: cta[0], en: cta[1] },
})

const si2 = journals.find((j) => j.no === 'SI.2026.10.00002')!

const overview: Overview = {
  kpis: [
    { label: { id: 'Pendapatan', en: 'Revenue' }, value: idr(pl.revenue), delta: NO_DELTA, cols: cols(1), to: '/reports' },
    { label: { id: 'Piutang jatuh tempo', en: 'Receivables due' }, value: idr(receivable), delta: NO_DELTA, cols: cols(2), to: '/docs/sales-invoice' },
    { label: { id: 'Laba Kotor', en: 'Gross profit' }, value: idr(pl.grossProfit), delta: NO_DELTA, cols: cols(3), to: '/reports' },
    { label: { id: 'Utang', en: 'Payables' }, value: idr(payable), delta: NO_DELTA, cols: cols(4), to: '/docs/purchase-invoice' },
  ],
  cards: [
    {
      id: 'si2',
      title: { id: 'Faktur belum lunas', en: 'Unpaid invoice' },
      text: { id: `${si2.no} senilai ${idr(1_400_000)} belum lunas`, en: `${si2.no} for ${idr(1_400_000)} is unpaid` },
      bg: 'radial-gradient(60% 70% at 20% 20%,#ec4899,transparent 70%),radial-gradient(60% 70% at 90% 80%,#a855f7,transparent 70%),#3b0764',
      record: rec(['Faktur Penjualan', 'Sales Invoice'], si2.no, idr(1_400_000), ['Belum lunas', 'Unpaid'], [
        ['Tanggal', 'Date', si2.date],
        ['Keterangan', 'Description', si2.description],
        ['No. Jurnal', 'Journal No.', si2.jv],
        ['Status', 'Status', 'Belum lunas'],
      ], ['Buka faktur', 'Open invoice']),
    },
    {
      id: 'recon',
      title: { id: 'Rekonsiliasi bank', en: 'Bank reconciliation' },
      text: { id: 'Rekonsiliasi Bank Uji Oktober 2026 belum dilakukan', en: 'Bank Uji reconciliation for October 2026 is pending' },
      bg: 'radial-gradient(60% 70% at 80% 20%,#38bdf8,transparent 70%),radial-gradient(60% 70% at 10% 90%,#f59e0b,transparent 70%),#0c4a6e',
      record: rec(['Kas & Bank', 'Cash & Bank'], '1101 · Bank Uji', idr(bal.get('1101') ?? 0), ['Saldo buku · rekonsiliasi tertunda', 'Book balance · reconciliation pending'], [
        ['Akun', 'Account', '1101 Bank Uji'],
        ['Periode', 'Period', '01/10/2026 – 17/10/2026'],
        ['Saldo buku', 'Book balance', idr(bal.get('1101') ?? 0)],
        ['Status', 'Status', 'Tertunda'],
      ], ['Mulai rekonsiliasi', 'Start reconciling']),
    },
  ],
  lowTabs: [
    { name: { id: 'Modul', en: 'Modules' }, count: modules.length },
    { name: { id: 'Perlu ditinjau', en: 'Needs review' }, count: 2 },
  ],
  // Reference overview groups (Selling / Buying / Payments) with its tile values.
  groups: (
    [
      [['Penjualan', 'Selling'], ['Aktivitas penjualan terbuka pada periode ini', 'Open sales activity for the period'], '/modules/customers', [
        [['Penawaran', 'Quotes'], '2', '+2', '/docs/sales-quotation'],
        [['Pesanan', 'Orders'], '4', '-1', '/docs/sales-order'],
        [['Faktur', 'Invoices'], '7', '+3', '/docs/sales-invoice'],
      ]],
      [['Pembelian', 'Buying'], ['Aktivitas pembelian terbuka dan pembayaran mendatang', 'Open purchase activity and upcoming payments'], '/modules/vendors', [
        [['Pesanan pembelian', 'Purchase orders'], '5', '+2', '/docs/purchase-order'],
        [['Tagihan belum dibayar', 'Unpaid bills'], '0', '0', '/docs/purchase-invoice'],
        [['Jatuh tempo minggu depan', 'Due next week'], '5', '-1', '/docs/purchase-payment'],
      ]],
      [['Pembayaran', 'Payments'], ['Kas masuk dan keluar', 'Incoming and outgoing cash'], '/reports', [
        [['Diterima', 'Received'], '5', '+2', '/docs/cash-receipt'],
        [['Terjadwal', 'Scheduled'], '6', '+1', '/docs/cash-payment'],
      ]],
    ] as const
  ).map(([title, sub, to, tiles], gi) => ({
    title: { id: title[0], en: title[1] },
    sub: { id: sub[0], en: sub[1] },
    to,
    tiles: tiles.map(([l, v, d, tt], ti) => ({ label: { id: l[0], en: l[1] }, v, d, bars: bars(gi * 7 + ti), to: tt })),
  })),
}

// shortcut: per-partner balances need a customer/vendor on each journal; fixtures don't carry one, so balances show "—".
// shortcut: remaining stock from the S1+S3 FIFO layers in design-boards.md, not recomputed.
const stock: Record<string, string> = { 'BRG-A': '0', 'BRG-B': `3 @ ${idr(150_000)}` }

const lists: Record<string, ListRow[]> = {
  customers: customers.map((c) => ({ id: c.id, name: c.name, contact: [c.npwp || 'Tanpa NPWP', c.currency, c.terms].join(' · '), bal: '—', status: 'active' })),
  vendors: vendors.map((v) => ({ id: v.id, name: v.name, contact: [v.npwp || 'Tanpa NPWP', v.currency, v.terms, v.pph23 ? 'PPh 23' : ''].filter(Boolean).join(' · '), bal: '—', status: 'active' })),
  items: items.map((i) => ({
    id: i.code,
    name: i.name,
    contact: `${i.kind} · ${i.unit} · Jual ${idr(i.sellPrice)} · Beli ${idr(i.buyPrice)}`,
    bal: stock[i.code] ?? '—',
    status: 'active',
  })),
  taxes: taxes.map((x) => ({ id: x.code, name: x.name, contact: `Penjualan ${x.salesAccount || '—'} · Pembelian ${x.purchaseAccount || '—'}`, bal: `${x.rate}%`, status: 'active' })),
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
