import { afterAll, beforeAll, expect, test } from 'bun:test'
import t17 from '../../../docs/reports/fixtures/employee-loan-t17.json'
import * as L from '../src/payroll/loans'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => { f = await fixtureDb('loan'); await L.upsertEmployee(f.db, t17.employee); await L.createEmployeeLoan(f.db, t17.loan) })
afterAll(() => f.close())
const rep = (p: string) => (t17.reports as any)[p].rows.slice(1).filter((r: string[]) => !/^Cabang :/.test(r[0]!))

test('Daftar Piutang Karyawan, Angsuran, History (loan without schedule)', async () => {
  const ls = await L.loadLoans(f.db)
  expect(L.loanList(ls)).toEqual(rep('EmployeeLoanListReport'))
  expect(L.loanInstallments(ls[0]!)).toEqual(rep('EmployeeLoanInstallmentByEmployeeReport'))
  expect(L.loanHistory(ls[0]!)).toEqual(rep('EmployeeLoanHistoryReport'))
})
