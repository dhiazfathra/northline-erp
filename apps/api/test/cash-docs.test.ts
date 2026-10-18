import { afterAll, beforeAll, expect, test } from 'bun:test'
import t18 from '../../../docs/reports/fixtures/cash-bank-t18.json'
import { createCashDocument } from '../src/cash-bank/service'
import { catchUp, ledgerProjection } from '../src/projections'
import * as C from '../src/reports/cash-bank'
import { loadCashDocs, queryGeneralLedger } from '../src/reports/queries'
import { sql } from 'drizzle-orm'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('cash')
  for (const d of t18.documents) await createCashDocument(f.db, { idempotencyKey: `t18-${d.number}`, ...(d as any) })
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())
const W = { from: '2035-01-01', to: '2035-01-31' }, B = ['NL-T1-1101']
const rep = (p: string) => (t18.reports as any)[p].rows.slice(1).filter((r: string[]) => !/^(Dari |Cabang :|Bank :)/.test(r[0]!))

test('Pembayaran/Penerimaan journals', async () =>
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport')))
test('bank lists, summaries, details, payment load, unreconciled, statement', async () => {
  const ds = await loadCashDocs(f.db)
  const accounts = (await f.db.execute(sql`SELECT no, name, type, parent_no FROM accounts`)).map(r => ({ no: r.no as string, name: r.name as string, type: r.type as any, parentNo: null }))
  expect(C.cashDocList(ds, 'PAY', W.from, W.to)).toEqual(rep('PaymentListReport'))
  expect(C.cashDocList(ds, 'DEP', W.from, W.to)).toEqual(rep('DepositListReport'))
  expect(C.cashByBankSummary(ds, 'PAY', B, W.from, W.to)).toEqual(rep('PaymentByBankSummaryReport'))
  expect(C.cashByBankSummary(ds, 'DEP', B, W.from, W.to)).toEqual(rep('DepositByBankSummaryReport'))
  expect(C.cashByBankDetail(ds, 'PAY', B, W.from, W.to)).toEqual(rep('PaymentByBankDetailReport'))
  expect(C.cashByBankDetail(ds, 'DEP', B, W.from, W.to)).toEqual(rep('DepositByBankDetailReport'))
  expect(C.paymentLoad(ds, B, W.from, W.to)).toEqual(rep('PaymentLoadReport'))
  expect(C.unreconciledBank(ds, accounts, B, W.from, W.to)).toEqual(rep('UnreconciledBankReport'))
  expect(C.bankStatement()).toEqual(rep('BankStatementReport'))
})
