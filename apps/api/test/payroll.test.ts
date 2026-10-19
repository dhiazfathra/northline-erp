import { afterAll, beforeAll, expect, test } from 'bun:test'
import fx from '../../../docs/reports/fixtures/payroll-m50.json'
import { upsertEmployee } from '../src/payroll/loans'
import * as P from '../src/payroll/payroll'
import { fixtureDb } from './fixture-db'

// Manufaktur Demo (P3.6): Pencatatan Gaji EPY.2050.01/02/03/12.00001 for NL-PY50-E1..E3, PPh 21 TER + December true-up.
let f: Awaited<ReturnType<typeof fixtureDb>>
const saved: Awaited<ReturnType<typeof P.createPayrollRun>>[] = []
beforeAll(async () => {
  f = await fixtureDb('payroll')
  for (const e of fx.employees) await upsertEmployee(f.db, e)
  for (const r of fx.runs) saved.push(await P.createPayrollRun(f.db, r as P.PayrollRun))
})
afterAll(() => f.close())
const R = fx.reports as Record<string, { param: Record<string, unknown>; rows: string[][] }>
const body = (rows: string[][]) => rows.filter(r => !/^(Rincian Gaji Karyawan|Pajak Penghasilan Karyawan$|Porsi Gaji|Gaji Karyawan per Tahun|Per |per |Cabang : )/.test(r[0]!))

test('each line matches Accurate: income, Gaji dibayarkan, signed PPh 21', () => {
  fx.runs.forEach((r, i) => r.lines.forEach((l, j) => expect(saved[i]!.lines[j]).toEqual({ employee: l.employee, ...l.accurate })))
})

test('TER and December Pasal 17 probes', () => {
  const st = { A: 'TK0', B: 'K1', C: 'K3' } as const
  for (const [c, ps] of Object.entries(fx.probes.ter)) for (const [g, pph] of ps) expect([c, g, P.terPph(st[c as 'A'], g!)]).toEqual([c, g, pph])
  for (const [fees, pph] of fx.probes.december) expect([fees, P.decemberPph('K3', [fees as Record<string, number>], 0)]).toEqual([fees, pph])
})

test('Rincian Gaji Karyawan per Bulan: Jan, Feb, Mar, Nov (empty), Dec 2050', async () => {
  const ls = await P.loadPayroll(f.db)
  for (const m of [1, 2, 3, 11, 12]) expect(P.monthlyPayroll(ls, 2050, m)).toEqual(body(R[`EmployeePaymentByEmployeeReport-${m}`]!.rows))
})

test('Rincian Gaji Karyawan per Tahun and Pajak Penghasilan Karyawan 2050', async () => {
  const ls = await P.loadPayroll(f.db)
  expect(P.yearlyPayroll(ls, 2050)).toEqual(body(R.EmployeePaymentYearlyByEmployeeReport!.rows))
  expect(P.pphByMonth(ls, 2050)).toEqual(body(R.EmployeePphReport!.rows))
})

test('Porsi Gaji Karyawan and Gaji Karyawan per Tahun charts (PNG labels)', async () => {
  const ls = await P.loadPayroll(f.db)
  expect(P.salaryShareChart(ls, 2050)).toEqual(fx.charts.EmployeeSalaryProportionReport.legend)
  expect(P.salaryPerYearChart(ls)).toEqual(fx.charts.EmployeeSalaryPerYearReport.bars)
  for (const id of ['EmployeeSalaryProportionReport', 'EmployeeSalaryPerYearReport']) expect(body(R[id]!.rows)).toEqual([])
})

test('unknown fee and unknown employee are rejected', async () => {
  await expect(P.createPayrollRun(f.db, { number: 'NL-PY50-BAD1', date: '2050-04-30', year: 2050, month: 4, lines: [{ employee: 'NL-PY50-E1', fees: { 'Gaji Rahasia': 1 } }] })).rejects.toThrow('tidak dikenal')
  await expect(P.createPayrollRun(f.db, { number: 'NL-PY50-BAD2', date: '2050-04-30', year: 2050, month: 4, lines: [{ employee: 'NL-PY50-X', fees: { 'Gaji Pokok': 1 } }] })).rejects.toThrow('tidak ditemukan')
})

test('HTTP: payroll run and reports', async () => {
  const { createApp } = await import('../src/app')
  const { createFullUser } = await import('./fixture-db')
  const app = createApp(f.db)
  await createFullUser(f.db, 'nl-py50@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-py50@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (u: string) => (await app.request(u, { headers: { cookie } })).json()
  expect(await get('/api/reports/payroll/monthly?year=2050&month=2')).toEqual(body(R['EmployeePaymentByEmployeeReport-2']!.rows))
  expect(await get('/api/reports/payroll/pph?year=2050')).toEqual(body(R.EmployeePphReport!.rows))
  expect(await get('/api/reports/payroll/per-year')).toEqual(fx.charts.EmployeeSalaryPerYearReport.bars)
  const r = await app.request('/api/payroll/runs', { method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ number: 'NL-PY50-HTTP', date: '2050-04-30', year: 2050, month: 4, lines: [{ employee: 'NL-PY50-E1', fees: { 'Gaji Pokok': 10000000 } }] }) })
  expect(r.status).toBe(201)
  expect((await r.json()).lines).toEqual([{ employee: 'NL-PY50-E1', income: 10000000, paid: 9800000, pph: 200000 }])
})
