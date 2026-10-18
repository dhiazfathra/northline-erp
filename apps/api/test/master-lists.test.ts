import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import m from '../../../docs/reports/fixtures/master-lists.json'
import * as L from '../src/master/lists'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('ml')
  for (const c of m.currencies) await f.db.execute(sql`INSERT INTO currencies VALUES (${c.code}, ${c.name}, ${c.symbol}, ${c.converter})`)
  for (const [i, n] of m.fobs.entries()) await f.db.execute(sql`INSERT INTO fobs VALUES (${n}, ${i})`)
  for (const [i, t] of m.taxes.entries()) await f.db.execute(sql`INSERT INTO taxes VALUES (${t.name}, ${t.rate}, ${i})`)
  for (const e of m.employees) await f.db.execute(sql`INSERT INTO employees (no, name) VALUES (${e.no}, ${e.name})`)
  for (const [i, t] of m.fiscalFaTypes.entries()) await f.db.execute(sql`INSERT INTO fiscal_fa_types VALUES (${t.name}, ${t.lifeYears}, ${t.method}, ${i})`)
})
afterAll(() => f.close())
const cap = async (p: string) => (await import(`../../../docs/reports/captures/${p}.json`)).default.rows.slice(1)

for (const [p, fn] of [['CurrencyListReport', L.currencyList], ['FreeOnBoardListReport', L.fobList], ['TaxListReport', L.taxList], ['ShipmentListReport', L.shipmentList],
  ['SalesmanListReport', L.employeeList], ['FiscalFaTypeListReport', L.fiscalFaTypeList]] as const)
  test(p, async () => expect(await fn(f.db)).toEqual(await cap(p)))
