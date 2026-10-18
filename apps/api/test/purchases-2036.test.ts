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

test('Pencatatan Beban: journal, ExpenseAccrualSummaryReport and ExpenseAccrualDetailReport (T26)', async () => {
  const t26 = (await import('../../../docs/reports/fixtures/expense-accrual-t26.json')).default
  const { createExpenseAccrual } = await import('../src/cash-bank/service')
  const { expenseAccrualSummary, expenseAccrualDetail } = await import('../src/reports/expense-accrual')
  for (const a of t26.accounts.filter(a => a.no === '210206')) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const a of t26.accruals) await createExpenseAccrual(f.db, { idempotencyKey: `t26-${a.number}`, ...a })
  await catchUp(f.db, ledgerProjection)
  for (const [i, d] of ['2036-06-01', '2036-06-15'].entries())
    expect(await queryGeneralLedger(f.db, 'history', { from: d, to: d, showZeroBalance: false, showParentAccount: true })).toEqual(body(t26.GeneralLedgerHistoryReport[i]!))
  const all = await (await import('../src/reports/queries')).loadExpenseAccruals(f.db)
  for (const c of t26.ExpenseAccrualSummaryReport) expect(expenseAccrualSummary(all, c.from, c.to)).toEqual(c.rows)
  for (const c of t26.ExpenseAccrualDetailReport) expect(expenseAccrualDetail(all, c.from, c.to)).toEqual(c.rows)
})

test('VendorPriceHistoryReport: Harga Lama = previous price of the same vendor (T27)', async () => {
  const t27 = (await import('../../../docs/reports/fixtures/vendor-price-t27.json')).default
  const { createVendorPrice } = await import('../src/purchases/service')
  const { vendorPriceHistory } = await import('../src/reports/payables')
  for (const p of t27.prices) await createVendorPrice(f.db, p)
  const ps = await (await import('../src/reports/queries')).loadVendorPrices(f.db)
  for (const c of t27.VendorPriceHistoryReport) expect(vendorPriceHistory(ps, [c.item], c.asOf)).toEqual(c.rows)
})

test('ItemGroupDetailReport: group items with components (T32) and the empty state', async () => {
  const t32 = (await import('../../../docs/reports/fixtures/item-group-t32.json')).default
  const { itemGroupDetail } = await import('../src/reports/inventory')
  const Q = await import('../src/reports/queries')
  expect(itemGroupDetail(await Q.loadItemGroups(f.db))).toEqual(body(t32.ItemGroupDetailEmpty))
  for (const i of t32.items) await upsertItem(f.db, i as any)
  expect(itemGroupDetail(await Q.loadItemGroups(f.db))).toEqual(body(t32.ItemGroupDetailReport.rows))
})

test('serial-number reports: Mutasi, Umur, Sisa Umur (T33)', async () => {
  const t33 = (await import('../../../docs/reports/fixtures/serial-t33.json')).default
  const SN = await import('../src/reports/serial-numbers')
  await upsertItem(f.db, t33.item as any)
  await createPurchaseInvoice(f.db, { idempotencyKey: 't33-pi-0001', ...t33.invoice })
  const ms = await (await import('../src/reports/queries')).loadSerialMoves(f.db), it = t33.item.no
  for (const c of t33.ReceivedDeliveredSerialNumberReport) expect(SN.receivedDeliveredSerials(ms, it, c.from, c.to)).toEqual(body(c.rows))
  for (const c of t33.SerialNumberAgingDetailReport) expect(SN.serialAging(ms, it, c.warehouse, c.asOf)).toEqual(body(c.rows))
  for (const c of t33.RemainingAgeSerialNumberDetailReport) expect(SN.remainingAgeSerials(ms, it, c.asOf)).toEqual(body(c.rows))
})

test('InventoryValuationDetailDownloadReport: per-item CSV with opening row (T25, T33)', async () => {
  const t33 = (await import('../../../docs/reports/fixtures/serial-t33.json')).default as any
  const { inventoryValuationCsv } = await import('../src/reports/inventory')
  const { moves } = await (await import('../src/reports/queries')).loadInventory(f.db)
  // NL-T4-B1 has older history in the sandbox: compare quantities/values relative to each side's opening row.
  const rel = (rows: string[][]) => { const n = (s: string) => Number(s.replace(',', '.')), [, , q0, v0] = rows[1]!
    return rows.map((r, i) => i < 1 ? r : [r[0], r[1], ...r.slice(2, 6), String(n(r[6]!) - n(q0!)), String(n(r[7]!) - n(v0!))].map(String)).slice(2) }
  for (const c of t33.InventoryValuationDetailDownloadReport) {
    const got = inventoryValuationCsv(moves, c.item, c.from, c.to)
    if (c.item === 'NL-T33-SN') expect(got).toEqual(c.rows)
    else expect(rel(got)).toEqual(rel(c.rows))
  }
})

test('ItemValueToAccountBalanceDifferenceReport: layout, zero difference and the T25 movement (ADR-0013)', async () => {
  const { itemValueDifference } = await import('../src/reports/inventory'), Q = await import('../src/reports/queries')
  const cs = (t25 as any).ItemValueToAccountBalanceDifferenceReport as { to: string; rows: string[][] }[]
  const n = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))
  const erp = async (to: string) => {
    const { accounts, balances } = await Q.loadLedger(f.db, to), { moves } = await Q.loadInventory(f.db)
    const inv = accounts.filter(a => a.no === '110401').map(a => ({ no: a.no, name: a.name, balance: balances.filter(b => b.account === a.no).reduce((s, b) => s + b.debit - b.credit, 0) }))
    return itemValueDifference(inv, moves.filter(m => m.date <= to).reduce((s, m) => s + m.value, 0))
  }
  const [a, b] = [await erp(cs[0]!.to), await erp(cs[1]!.to)], [sa, sb] = cs.map(c => body(c.rows))
  const row = (rows: string[][], k: string) => rows.find(r => r[0] === k || r[2] === k)!.at(-1)!
  expect(a.map(r => r[0])).toEqual(sa!.filter(r => r[0] !== '110405').map(r => r[0]))
  for (const k of ['Persediaan Barang Jadi', 'Nilai barang Persediaan']) expect(n(row(b, k)) - n(row(a, k))).toBe(n(row(sb!, k)) - n(row(sa!, k)))
  expect(row(b, 'Total dari Selisih antara akun persediaan dengan nilai barang')).toBe(row(sb!, 'Total dari Selisih antara akun persediaan dengan nilai barang'))
})
