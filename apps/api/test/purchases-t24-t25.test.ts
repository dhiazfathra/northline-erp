import { afterAll, beforeAll, expect, test } from 'bun:test'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import t24 from '../../../docs/reports/fixtures/unbilled-t24.json'
import t25 from '../../../docs/reports/fixtures/purchase-expense-t25.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, createReceiveItem, upsertVendor } from '../src/purchases/service'
import { loadJournals, loadLedger, loadPurchaseExpenses, queryGeneralLedger } from '../src/reports/queries'
import { purchaseByExpense } from '../src/reports/payables'
import { unbilledDifference } from '../src/reports/unbilled'
import { upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('unbilled')
  const accts = new Map([...t3.accounts, ...t4.accounts, ...t24.accounts, ...t25.accounts, { no: '400001', name: 'Penjualan', type: 'REVENUE' }].map(a => [a.no, a]))
  for (const a of accts.values()) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of t4.items) await upsertItem(f.db, i as any)
  await createReceiveItem(f.db, t24.receipt)
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))

test('priced receipt journals Dr inventory / Cr Hutang Pembelian Belum Ditagih (T24)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { from: '2036-03-10', to: '2036-03-10', showZeroBalance: false, showParentAccount: true })).toEqual(body(t24.GeneralLedgerHistoryReport))
})

test('UnbilledAccountBalanceDifferenceReport: opening, change, unbilled receipts (3 windows)', async () => {
  const { accounts, balances } = await loadLedger(f.db, '2036-12-31'), journals = await loadJournals(f.db, '2000-01-01', '2099-12-31')
  const acc = accounts.find(a => a.no === '210203')!
  for (const c of t24.UnbilledAccountBalanceDifferenceReport) expect(unbilledDifference(acc, balances, journals, c.from, c.to)).toEqual(body(c.rows))
})

test('PurchaseByExpenseReport: Biaya-tab lines summed per account; journals debit each expense line (T25)', async () => {
  for (const [i, inv] of t25.invoices.entries()) await createPurchaseInvoice(f.db, { idempotencyKey: `t25-pi-${i}`, ...inv })
  await catchUp(f.db, ledgerProjection)
  for (const [i, d] of ['2036-05-05', '2036-05-20'].entries())
    expect(await queryGeneralLedger(f.db, 'history', { from: d, to: d, showZeroBalance: false, showParentAccount: true })).toEqual(body(t25.GeneralLedgerHistoryReport[i]!))
  const ex = await loadPurchaseExpenses(f.db)
  for (const c of t25.PurchaseByExpenseReport) expect(purchaseByExpense(ex, c.from, c.to)).toEqual(body(c.rows))
})
