import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { trialBalanceQuery } from '@northline/schemas/ledger-es'
import type { ListRow, Overview } from '@northline/schemas/overview'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { plTotals } from '../reports/financial-ratios'
import { loadPurchases, loadSales, queryProfitLoss } from '../reports/queries'
import { openInvoices, type SalesData } from '../reports/receivables'
import { formatIdr } from '../reports/trial-balance'

const t = (id: string, en: string) => ({ id, en })
const dayBefore = (iso: string, n = 1) => new Date(Date.parse(iso) - n * 864e5).toISOString().slice(0, 10)

/** Open (unpaid) invoices of every party as of `asOf`, net of payments, returns and down payments; age > 0 = past due. */
const open = (d: SalesData, asOf: string) => [...d.customers.keys()].flatMap(c => openInvoices(d, asOf, c))

// shortcut: dot-matrix and bar heights are a flat baseline; derive them from daily figures once the dashboard needs trends.
const cols = Array.from({ length: 24 }, () => 1)
const bars = Array.from({ length: 12 }, () => 4)

/** Documents dated in [from, to]; table names are fixed literals, never input. */
const count = async (db: Db, table: string, from: string, to: string, where = sql``) =>
  Number((await db.execute(sql`SELECT count(*) AS n FROM ${sql.raw(table)} WHERE date BETWEEN ${from} AND ${to} ${where}`))[0]!.n)

/** Overview dashboard and module lists for the web app (ADR-0049), computed from the same projections as the reports. */
export function webOverviewRoutes(db: Db) {
  return new Hono<AuthEnv>()
    .get('/overview', async c => {
      const { from, to } = trialBalanceQuery.pick({ from: true, to: true }).parse(c.req.query())
      const span = Math.round((Date.parse(to) - Date.parse(from)) / 864e5)
      const [pFrom, pTo] = [dayBefore(from, span + 1), dayBefore(from)]
      const [pl, sales, buys] = await Promise.all([queryProfitLoss(db, trialBalanceQuery.parse({ from, to })), loadSales(db), loadPurchases(db)])
      const p = plTotals(pl) // rupiah
      const ar = open(sales, to), ap = open(buys, to)
      const overdue = ar.filter(i => i.age > 0)
      const sum = (xs: { owing: number }[]) => xs.reduce((s, i) => s + i.owing, 0)
      const tile = async (label: [string, string], table: string, to_: string, where = sql``) => {
        const [now, before] = await Promise.all([count(db, table, from, to, where), count(db, table, pFrom, pTo, where)])
        const d = now - before
        return { label: t(...label), v: String(now), d: d > 0 ? `+${d}` : String(d), bars, to: to_ }
      }
      const oldest = overdue.sort((a, b) => b.age - a.age)[0]
      const body: Overview = {
        kpis: [
          { label: t('Pendapatan periode ini', 'Revenue this period'), value: formatIdr(Math.round(p.revenue * 100)), delta: '—', cols, to: '/reports' },
          { label: t('Piutang jatuh tempo', 'Overdue receivables'), value: formatIdr(sum(overdue)), delta: '—', cols, to: '/docs/sales-invoice' },
          { label: t('Laba kotor', 'Gross profit'), value: formatIdr(Math.round((p.revenue - p.cogs) * 100)), delta: '—', cols, to: '/reports' },
          { label: t('Utang berjalan', 'Open payables'), value: formatIdr(sum(ap)), delta: '—', cols, to: '/docs/purchase-invoice' },
        ],
        cards: oldest ? [{
          id: oldest.number,
          title: t('Sinyal', 'Signals'),
          text: t(`${oldest.number} senilai ${formatIdr(oldest.owing)} lewat jatuh tempo ${oldest.age} hari`, `${oldest.number} for ${formatIdr(oldest.owing)} is ${oldest.age} days overdue`),
          bg: 'radial-gradient(60% 70% at 20% 20%,#ec4899,transparent 70%),radial-gradient(60% 70% at 90% 80%,#a855f7,transparent 70%),#3b0764',
          record: {
            kind: t('Faktur Penjualan', 'Sales Invoice'), title: oldest.number, value: formatIdr(oldest.owing), note: t('Belum lunas', 'Unpaid'),
            lines: [
              { a: t('Pelanggan', 'Customer'), b: sales.customers.get(oldest.customer) ?? oldest.customer },
              { a: t('Tanggal', 'Date'), b: oldest.date },
              { a: t('Jatuh tempo', 'Due'), b: oldest.dueDate },
              { a: t('Keterangan', 'Description'), b: oldest.description },
            ],
            cta: t('Buka faktur', 'Open invoice'),
          },
        }] : [],
        lowTabs: [{ name: t('Asisten', 'Assistant') }],
        groups: [
          { title: t('Penjualan', 'Selling'), sub: t('Dokumen penjualan pada periode ini', 'Sales documents in the period'), to: '/modules/customers', tiles: await Promise.all([
            tile(['Penawaran', 'Quotes'], 'sales_quotations', '/docs/sales-quotation'),
            tile(['Pesanan', 'Orders'], 'sales_orders', '/docs/sales-order'),
            tile(['Faktur', 'Invoices'], 'sales_invoices', '/docs/sales-invoice', sql`AND kind <> 'DP'`),
          ]) },
          { title: t('Pembelian', 'Buying'), sub: t('Dokumen pembelian pada periode ini', 'Purchase documents in the period'), to: '/modules/vendors', tiles: await Promise.all([
            tile(['Pesanan pembelian', 'Purchase orders'], 'purchase_orders', '/docs/purchase-order'),
            tile(['Faktur pembelian', 'Purchase invoices'], 'purchase_invoices', '/docs/purchase-invoice'),
          ]) },
          { title: t('Pembayaran', 'Payments'), sub: t('Kas masuk dan keluar', 'Incoming and outgoing cash'), to: '/reports', tiles: await Promise.all([
            tile(['Diterima', 'Received'], 'sales_receipts', '/docs/sales-receipt'),
            tile(['Dibayar', 'Paid'], 'purchase_payments', '/docs/purchase-payment'),
          ]) },
        ],
      }
      return c.json(body)
    })
    .get('/modules/:module{customers|vendors|items|taxes}', async c => {
      const m = c.req.param('module'), today = new Date().toISOString().slice(0, 10)
      const parties = async (d: SalesData, extra: Map<string, string>): Promise<ListRow[]> => {
        const inv = open(d, today)
        return [...d.customers].map(([no, name]) => {
          const mine = inv.filter(i => i.customer === no)
          return { id: no, name, contact: extra.get(no) ?? '', bal: formatIdr(mine.reduce((s, i) => s + i.owing, 0)), status: mine.some(i => i.age > 0) ? 'overdue' : 'active' }
        })
      }
      const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)) as Record<string, unknown>[]
      if (m === 'customers') return c.json(await parties(await loadSales(db), new Map((await rows(sql`SELECT no, currency FROM customers`)).map(r => [r.no as string, r.currency as string]))))
      if (m === 'vendors') return c.json(await parties(await loadPurchases(db), new Map()))
      if (m === 'items') return c.json((await rows(sql`SELECT no, name, type, unit FROM items ORDER BY no`)).map((r): ListRow =>
        // shortcut: stock on hand is in the inventory valuation report; shown as '—' here until the list needs it.
        ({ id: r.no as string, name: r.name as string, contact: `${r.type} · ${r.unit}`, bal: '—', status: 'active' })))
      return c.json((await rows(sql`SELECT name, rate FROM taxes ORDER BY seq`)).map((r): ListRow =>
        ({ id: r.name as string, name: r.name as string, contact: '', bal: `${Number(r.rate)}%`, status: 'active' })))
    })
}
