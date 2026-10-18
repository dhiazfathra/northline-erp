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

test('disposal: journal, Daftar Disposisi, history of a disposed asset (asset-disposal-t11.json)', async () => {
  const t11 = (await import('../../../docs/reports/fixtures/asset-disposal-t11.json')).default
  const { disposeFixedAsset } = await import('../src/fixed-assets/service')
  for (const a of t11.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  await disposeFixedAsset(f.db, { idempotencyKey: 't11-dispose', ...t11.disposal, price: t11.disposal.price })
  await catchUp(f.db, ledgerProjection)
  const r = (p: string) => body((t11.reports as any)[p].rows)
  const h = await queryGeneralLedger(f.db, 'history', { from: '2034-04-01', to: '2034-04-30', showZeroBalance: false, showParentAccount: true })
  expect(h.filter(x => x[1] === t11.disposal.number)).toEqual((t11.reports as any).GeneralLedgerHistoryReport.rows)
  const all = await loadFixedAssets(f.db)
  expect(F.disposedList(all, '2034-01-01', '2034-04-30')).toEqual(r('FixedAssetDisposedListReport'))
  expect(F.fixedAssetHistory(all.find(a => a.number === t11.disposal.asset)!, '2034-01-01', '2034-04-30')).toEqual(r('FixedAssetHistoryReport'))
  const disposed = all.find(a => a.number === t11.disposal.asset)!
  expect(F.assetLocationHistory(disposed)).toEqual(r('AssetLocationHistoryReport'))
  expect(F.fixedAssetEditedHistory(disposed, '2034-01-01', '2034-12-31')).toEqual(r('FixedAssetEditedHistoryReport'))
})

test('asset edit (T34): no journal, Daftar Perubahan Aset Tetap, Histori Perubahan Aset, Histori Lokasi Aset', async () => {
  const t34 = (await import('../../../docs/reports/fixtures/asset-edit-t34.json')).default
  const { editFixedAsset } = await import('../src/fixed-assets/service')
  await createFixedAsset(f.db, { idempotencyKey: 't34-asset', ...t34.asset })
  await editFixedAsset(f.db, t34.edit)
  await catchUp(f.db, ledgerProjection)
  const h = await queryGeneralLedger(f.db, 'history', { from: '2036-12-01', to: '2036-12-31', showZeroBalance: false, showParentAccount: true })
  expect(h).toEqual(body(t34.GeneralLedgerHistoryReport))
  const all = await loadFixedAssets(f.db), a = all.find(x => x.number === t34.asset.number)!
  for (const c of t34.FixedAssetEditedListReport) expect(F.fixedAssetEditedList(all, c.from, c.to)).toEqual(body(c.rows))
  expect(F.fixedAssetEditedHistory(a, t34.FixedAssetEditedHistoryReport.from, t34.FixedAssetEditedHistoryReport.to)).toEqual(body(t34.FixedAssetEditedHistoryReport.rows))
  expect(F.assetLocationHistory(a)).toEqual(body(t34.AssetLocationHistoryReport.rows))
})
