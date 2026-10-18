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
