import { afterAll, beforeAll, expect, test } from 'bun:test'
import t31 from '../../../docs/reports/fixtures/fx-t31.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { loadRealizedReceipts, queryGeneralLedger } from '../src/reports/queries'
import { realizedGainLoss } from '../src/reports/receivables'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('fx')
  for (const a of t31.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  await upsertCustomer(f.db, t31.customer)
  await upsertItem(f.db, t31.item as any)
  await createSalesInvoice(f.db, { idempotencyKey: 't31-si-0001', ...t31.invoice })
  await createSalesReceipt(f.db, { idempotencyKey: 't31-sr-0001', ...t31.receipt })
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))

test('USD invoice journals at the invoice rate; receipt books the realized gain (T31)', async () => {
  for (const [i, d] of ['2036-10-01', '2036-10-15'].entries())
    expect(await queryGeneralLedger(f.db, 'history', { from: d, to: d, showZeroBalance: false, showParentAccount: true })).toEqual(body(t31.GeneralLedgerHistoryReport[i]!))
})

test('RealizeGainLossReport (2 windows)', async () => {
  const ls = await loadRealizedReceipts(f.db)
  for (const c of t31.RealizeGainLossReport) expect(realizedGainLoss(ls, c.from, c.to)).toEqual(body(c.rows))
})

test('CSV downloads: Keseluruhan Jurnal, Histori Buku Besar, Rincian Buku Besar, Rincian Jurnal Akun (T31, Oct 2036)', async () => {
  const G = await import('../src/reports/general-ledger'), Q = await import('../src/reports/queries')
  const W = { from: '2036-10-01', to: '2036-10-31' }, d = t31.downloads as any
  const js = await Q.loadJournals(f.db, W.from, W.to), { accounts, balances, settings } = await Q.loadLedger(f.db, W.to)
  expect(G.allJournalsCsv(js, accounts)).toEqual(d.AllJournalDownloadReport.rows)
  expect(G.glHistoryCsv(js, accounts)).toEqual(d.GeneralLedgerHistoryDownloadReport.rows)
  expect(G.journalDetailListCsv(accounts, balances, settings, js, W.from, W.to)).toEqual(d.JournalDetailListDownloadReport.rows)
  // Kas carries other history in both databases: compare its balances relative to each side's opening row.
  const rel = (rows: string[][]) => { const c = (v: string) => Math.round(Number(v.replace(',', '.')) * 100), o = c(rows.find(r => r[0] === 'NL-T1-1101')![8]!)
    return rows.map(r => r[0] === 'NL-T1-1101' ? [...r.slice(0, 8), String(c(r[8]!) - o)] : r) }
  expect(rel(G.glDetailCsv(accounts, balances, settings, js, W.from, W.to))).toEqual(rel(d.GeneralLedgerDetailDownloadReport.rows))
})

test('UnRealizeGainLossReport: open USD receivable revalued at the month-end rate (T36)', async () => {
  const t36 = (t31 as any).t36, R = await import('../src/reports/receivables'), Q = await import('../src/reports/queries')
  await handle(f.db, { type: 'OpenAccount', idempotencyKey: 'acct-720202', no: '720202', name: 'Laba/Rugi Belum Terealisasi USD', accountType: 'OTHER_EXPENSE' })
  await createSalesInvoice(f.db, { idempotencyKey: 't36-si-0001', ...t36.invoice })
  const open = R.foreignOpenReceivables(await Q.loadForeignOwing(f.db, '2037-01-31'))
  const got = R.unrealizedGainLoss([{ month: t36.monthEnd.month, rates: t36.monthEnd.rates, open }])
  // The sandbox also revalues two demo USD bank accounts the ERP does not hold: compare the header, currency and receivable rows.
  const want = body(t36.UnRealizeGainLossReport[1].rows).filter((r: string[]) => r.length !== 7 || r[0] === 'Piutang Usaha USD' || r[0] === 'Nama Akun Perkiraan').filter((r: string[]) => !/^Dari Periode/.test(r[0]!) && r.length !== 4)
  expect(got.slice(0, -1)).toEqual(want)
  expect(got.at(-1)).toEqual(['200', '3.000.000', '3.080.000', '80.000'])
})
