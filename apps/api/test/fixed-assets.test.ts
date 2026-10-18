import { afterAll, beforeAll, expect, test } from 'bun:test'
import t5 from '../../../docs/reports/fixtures/fixed-asset-t5.json'
import { createFixedAsset, monthlyDepreciation, runPeriodEnd } from '../src/fixed-assets/service'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as F from '../src/reports/fixed-assets'
import { loadFixedAssets, queryGeneralLedger } from '../src/reports/queries'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('fa')
  for (const a of t5.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  await createFixedAsset(f.db, { idempotencyKey: 't5-asset', ...t5.asset })
  for (const p of t5.monthEnds) await runPeriodEnd(f.db, { idempotencyKey: `t5-pe-${p}`, period: p })
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2034-01-01', to: '2034-03-31' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t5.reports as any)[p].rows)
const asset = async () => (await loadFixedAssets(f.db)).find(a => a.number === t5.asset.number)!

test('acquisition and month-end journals (GL history Jan–Mar 2034)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport'))
})
test('FixedAssetHistoryReport', async () => expect(F.fixedAssetHistory(await asset(), W.from, W.to)).toEqual(rep('FixedAssetHistoryReport')))
test('FixedAssetJournalReport', async () => expect(F.fixedAssetJournal(await asset())).toEqual(rep('FixedAssetJournalReport')))
test('FixedAssetDetailReport', async () => expect(F.fixedAssetDetail(await asset())).toEqual(rep('FixedAssetDetailReport')))
test('FixedAssetListReport and FixedAssetByCategoryReport (header + NL-T5 category block)', async () => {
  const pick = (rows: string[][], heading: string) => [rows[0]!, rows.find(r => r[0] === heading)!, rows.find(r => r[0] === t5.asset.number)!]
  const list = F.fixedAssetList([await asset()], '2034-03-31'), cat = F.fixedAssetByCategory([await asset()], '2034-03-31')
  expect([list[0]!, list[1]!, list[2]!]).toEqual(pick(rep('FixedAssetListReport'), 'Berwujud'))
  expect([cat[0]!, cat[1]!, cat[2]!]).toEqual(pick(rep('FixedAssetByCategoryReport'), t5.asset.category))
})
test('month-end runs once per period; straight line ends at zero book value', async () => {
  await expect(runPeriodEnd(f.db, { idempotencyKey: 't5-pe-again', period: '2034-01' })).rejects.toThrow('sudah dijalankan')
  const total = Array.from({ length: 7 }, (_, i) => monthlyDepreciation(100, 7, i)).reduce((s, x) => s + x, 0)
  expect(total).toBe(100)
})
