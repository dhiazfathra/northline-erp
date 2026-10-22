import { afterEach, expect, test } from 'bun:test'
import { fetchReport } from './reports'

const real = globalThis.fetch
afterEach(() => { globalThis.fetch = real })
const stub = (answer: (url: string) => unknown) => {
  const urls: string[] = []
  globalThis.fetch = (async (u: string) => { urls.push(u); return Response.json(answer(u)) }) as typeof fetch
  return urls
}

test('range statement: from defaults to 1 Jan, comparison is the same-length window before, cents become rupiah', async () => {
  const urls = stub((u) => [{ label: 'Pendapatan', kind: 'heading' }, { label: 'Penjualan', kind: 'account', amount: u.includes('2026-01-01') ? 12_345 : 500 }])
  const data = await fetchReport('laba-rugi', { to: '2026-01-31' })
  expect(urls).toEqual(['/api/reports/profit-loss?from=2026-01-01&to=2026-01-31', '/api/reports/profit-loss?from=2025-12-01&to=2025-12-31'])
  expect(data).toEqual({ rows: [{ k: 'sec', t: 'Pendapatan', key: 'heading:Pendapatan#0', cur: undefined, prev: undefined }, { k: 'acc', t: 'Penjualan', key: 'account:Penjualan#0', cur: 123.45, prev: 5 }] })
})

test('point-in-time statement compares with the day before; rows missing earlier compare as 0', async () => {
  const urls = stub((u) => (u.endsWith('2026-03-01') ? [{ label: 'Kas', kind: 'account', amount: 100 }] : []))
  const data = await fetchReport('neraca', { to: '2026-03-01' })
  expect(urls).toEqual(['/api/reports/balance-sheet?asOf=2026-03-01', '/api/reports/balance-sheet?asOf=2026-02-28'])
  expect(data).toEqual({ rows: [{ k: 'acc', t: 'Kas', key: 'account:Kas#0', cur: 1, prev: 0 }] })
})

test('grid report: one request, grid passed through', async () => {
  const urls = stub(() => [['Pajak', 'Total'], ['PPN', '1.000']])
  expect(await fetchReport('pajak', { from: '2026-01-01', to: '2026-01-31' })).toEqual({ grid: [['Pajak', 'Total'], ['PPN', '1.000']] })
  expect(urls).toEqual(['/api/reports/tax/ppn/in-out?from=2026-01-01&to=2026-01-31'])
})

test('two accounts with the same name keep their own comparison figures', async () => {
  stub((u) => [{ label: 'Kas', kind: 'account', amount: u.endsWith('2026-03-01') ? 100 : 10 }, { label: 'Kas', kind: 'account', amount: u.endsWith('2026-03-01') ? 200 : 20 }])
  const data = await fetchReport('neraca', { to: '2026-03-01' })
  expect(data).toEqual({ rows: [{ k: 'acc', t: 'Kas', key: 'account:Kas#0', cur: 1, prev: 0.1 }, { k: 'acc', t: 'Kas', key: 'account:Kas#1', cur: 2, prev: 0.2 }] })
})
