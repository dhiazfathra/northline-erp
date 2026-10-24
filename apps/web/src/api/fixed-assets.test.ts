import { afterEach, expect, test } from 'bun:test'
import { fixedAssetQuery, toAsset, toInput } from './fixed-assets'

const api = {
  number: 'FA-1', description: 'Laptop', category: 'Peralatan Kantor', date: '2034-01-01', usageDate: '2034-01-01', lifeMonths: 48,
  assetAccount: '120005', accumulatedAccount: '12000604', expenseAccount: '600024', location: '', department: '', note: '', tax: false, qty: 1, salvage: 0,
  status: 'active' as const, lastDep: '', expenditures: [{ name: 'beli', date: '2034-01-01', amount: 100, account: 'NL-T1-3001' }],
}

test('a saved expense keeps its credit account, a new one credits 300001', () => {
  const a = toAsset(api)
  const added = { code: 'AX.2034.01.00001', desc: 'servis', date: '2034-01-02', amount: 50 }
  expect(toInput({ ...a, expenses: [...a.expenses, added] } as never).expenditures.map((e) => e.account)).toEqual(['NL-T1-3001', '300001'])
})

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })
const answer = (status: number) => { globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'x' }), { status })) as unknown as typeof fetch }

test('fixedAssetQuery: 404 is "not found", other failures throw', async () => {
  const run = () => (fixedAssetQuery('FA-1').queryFn as () => Promise<unknown>)()
  answer(404)
  expect(await run()).toBeNull()
  answer(500)
  await expect(run()).rejects.toThrow('x')
})

test('a picked Pengeluaran Aset keeps its number as the row code and round-trips to the API', () => {
  const a = toAsset({ ...api, expenditures: [{ name: 'servis', date: '2034-01-02', amount: 50, account: '300001', expenditure: 'AX.2034.01.00001' }] })
  expect(a.expenses[0]).toMatchObject({ code: 'AX.2034.01.00001', account: '300001', expenditure: 'AX.2034.01.00001' })
  expect(toInput(a as never).expenditures[0]).toMatchObject({ account: '300001', expenditure: 'AX.2034.01.00001' })
})
