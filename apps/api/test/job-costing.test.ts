import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import fx from '../../../docs/reports/fixtures/retail/jobcosting-rg.json'
import mx from '../../../docs/reports/fixtures/jobcosting-m49.json'
import { createJobOrder, createMaterialAdjustment, createRollOver } from '../src/inventory/job-costing'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as J from '../src/reports/job-costing'
import { upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

// Retail Demo (ADR-0026): the NL-RG documents of 2047 seeded into a fresh schema, every report toEqual the captured Accurate rows.
let f: Awaited<ReturnType<typeof fixtureDb>>
let jobs: J.Job[]
beforeAll(async () => {
  f = await fixtureDb('jobcost')
  for (const a of fx.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const v of fx.vendors) await upsertVendor(f.db, v)
  for (const i of fx.items) await upsertItem(f.db, i as any)
  for (const d of fx.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, { idempotencyKey: `rg-${d.number}`, ...d })
    else if (d.kind === 'JobOrder') await createJobOrder(f.db, { idempotencyKey: `rg-${d.number}`, ...d })
    else await createRollOver(f.db, { idempotencyKey: `rg-${d.number}`, ...d })
  }
  await catchUp(f.db, ledgerProjection)
  jobs = (await J.loadJobs(f.db)).filter(j => j.description.startsWith('NL-RG'))
})
afterAll(() => f.close())

type Cap = { param: any; rows: string[][] }
const caps = (planId: string): Cap[] => { const r = (fx.reports as any)[planId]; return [r, ...(r.variants ?? [])] }
const iso = (d: string) => `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`
const FURNITURE = /^(ACCURATE Accounting System Report|Tercetak pada |Halaman |Dari \d|Cabang : |Bahan dan Biaya Pekerjaan per Bulan$|Penyelesaian Barang\/Biaya per Bulan$|Histori Pekerjaan Pesanan$|Daftar Pekerjaan Pesanan$|Daftar Penambahan Bahan Baku$|Rincian Penambahan Bahan Baku$|Daftar Penyelesaian Pesanan$|Rincian (Barang|Akun) Penyelesaian Pesanan$)/
/** Page titles and footers out. */
const body = (rows: string[][]) => rows.filter(r => !FURNITURE.test(r[0]!))
/** Accurate's order among a job's material lines is not stable (ADR-0026): sorted by code on both sides. */
const settle = (rows: string[][]) => {
  const out = rows.map(r => [...r]), isMat = (r: string[]) => r.at(-1) === 'Pengeluaran Barang' && r.length === 7
  for (let i = 0; i < out.length;) {
    let k = i; while (k < out.length && isMat(out[k]!)) k++
    if (k > i) out.splice(i, k - i, ...out.slice(i, k).sort((a, b) => a[1]!.localeCompare(b[1]!)))
    i = Math.max(k, i + 1)
  }
  return out
}
/** NL-RG blocks only (the report also prints the demo job orders), and a block split by a page break joined back. */
function ourJournals(rows: string[][]): string[][] {
  const out: string[][] = []
  let keep = false, broken = false, header = 0
  for (const r of rows) {
    if (FURNITURE.test(r[0]!)) { broken = true; continue }
    if (r[0] === 'Rincian Jurnal Pekerjaan Pesanan') continue
    if (r[0] === 'Tanggal' && r[1] === ':') { if (broken && keep) { header = 2; continue } keep = r[5]?.startsWith('NL-RG') ?? false }
    broken = false
    if (header) { header--; continue } // Nomor # and Kode Perkiraan rows repeated after the break
    if (keep) out.push(r)
  }
  return out
}

test('Bahan dan Biaya Pekerjaan per Bulan: 2047 and Jan 2047', () => {
  for (const c of caps('JobCostingByMonthReport')) expect(J.jobCostingByMonth(jobs, iso(c.param.startDate), iso(c.param.endDate))).toEqual(body(c.rows))
})

test('Histori Pekerjaan Pesanan: finished JC1, open JC2', () => {
  for (const c of caps('JobCostingHistoryDetailReport')) expect(settle(J.jobCostingHistory(jobs, iso(c.param.startDate), iso(c.param.endDate)))).toEqual(settle(body(c.rows)))
})

test('Penyelesaian Barang/Biaya per Bulan', () => {
  for (const c of caps('FinishedJobCostByMonth')) expect(J.finishedJobCostByMonth(jobs, iso(c.param.startDate), iso(c.param.endDate))).toEqual(body(c.rows))
})

test('Rincian Jurnal Pekerjaan Pesanan: NL-RG job orders', () => {
  for (const c of caps('JobCostingJournalDetailReport')) {
    expect(ourJournals(c.rows)).toHaveLength(18) // 9 rows per job order
    expect(J.jobCostingJournalDetail(jobs)).toEqual(ourJournals(c.rows))
  }
})

test('roll-over clears WIP into the finished item; a job finishes once', async () => {
  const wip = jobs.flatMap(j => j.journal).filter(l => l.account === '115.000-98')
  expect(wip.reduce((s, l) => s + l.debit, 0)).toBe(9_500_000) // both jobs debit WIP 95,000; the RO credit is not a job journal
  await expect(createRollOver(f.db, { idempotencyKey: 'rg-again-RO', job: 'JC.2047.01.00001', date: '2047-03-01', lines: [{ item: 'NL-RG-FG1', qty: 1, portion: 100 }] })).rejects.toThrow('sudah selesai')
})

// Manufaktur Demo (P3.1): the NL-JC49 documents of 2049 (job orders, material pick/return, roll-overs to items and to accounts).
let m: Awaited<ReturnType<typeof fixtureDb>>
let mjobs: J.Job[]
beforeAll(async () => {
  m = await fixtureDb('jobcostm')
  for (const a of mx.accounts) await handle(m.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(m.db, ledgerProjection)
  for (const c of mx.customers) await upsertCustomer(m.db, c)
  for (const v of mx.vendors) await upsertVendor(m.db, v)
  for (const i of mx.items) await upsertItem(m.db, i as any)
  for (const d of mx.documents as any[]) {
    const k = { idempotencyKey: `m49-${d.number}`, ...d }
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(m.db, k)
    else if (d.kind === 'JobOrder') await createJobOrder(m.db, k)
    else if (d.kind === 'MaterialAdjustment') await createMaterialAdjustment(m.db, k)
    else await createRollOver(m.db, k)
  }
  await catchUp(m.db, ledgerProjection)
  mjobs = await J.loadJobs(m.db)
})
afterAll(() => m.close())

const P31: [string, (jobs: J.Job[], from: string, to: string) => string[][]][] = [
  ['JobOrderListReport', J.jobOrderList], ['MaterialAdjustmentListReport', J.materialAdjustmentList], ['MaterialAdjustmentDetailReport', J.materialAdjustmentDetail],
  ['RollOverListReport', J.rollOverList], ['RollOverItemDetailReport', J.rollOverItemDetail], ['RollOverAccountDetailReport', J.rollOverAccountDetail]]
for (const [planId, fn] of P31) test(`${planId}: NL-JC49 2049, and the empty default-param capture`, () => {
  const c = (mx.reports as Record<string, Cap>)[planId]!
  expect(fn(mjobs, iso(c.param.startDate), iso(c.param.endDate))).toEqual(body(c.rows))
  const e: Cap = JSON.parse(readFileSync(`${import.meta.dir}/../../../docs/reports/captures/${planId}.json`, 'utf8'))
  expect(fn(mjobs, iso(e.param.startDate), iso(e.param.endDate))).toEqual(body(e.rows))
})

test('material pick/return and roll-over to accounts clear WIP; job expense accounts are refused', async () => {
  const [wip] = await m.db.execute(sql`SELECT COALESCE(SUM(debit - credit), 0) AS bal FROM journal_lines WHERE account_no = '110403'`)
  expect(Number(wip!.bal)).toBe(750_000) // only the open JC3 (7.500) stays in WIP
  await createJobOrder(m.db, { idempotencyKey: 'm49-x-JC', number: 'JC.2049.03.00001', date: '2049-03-01', wipAccount: '110403', expenses: [{ account: '600001', name: 'x', amount: 1000 }] })
  await expect(createRollOver(m.db, { idempotencyKey: 'm49-bad-RO', job: 'JC.2049.03.00001', date: '2049-03-01', accounts: [{ account: '600001', name: 'x', portion: 100 }] })).rejects.toThrow('akun rincian biaya')
})

test('HTTP: job costing report route serves the same rows', async () => {
  const { createApp } = await import('../src/app')
  const { createUser } = await import('../src/auth')
  const app = createApp(m.db)
  await createUser(m.db, 'nl-jc@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-jc@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const rows = await (await app.request('/api/reports/job-costing/roll-over-list?from=2049-01-01&to=2049-12-31', { headers: { cookie } })).json()
  expect(rows).toEqual(body((mx.reports as Record<string, Cap>).RollOverListReport!.rows))
})
