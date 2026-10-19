import { sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { merge, nextNumber, period } from '../sales/service'
import { formatIdr } from '../reports/trial-balance'

// Pencatatan Gaji and its 5 reports (fixtures/payroll-m50.json). PPh 21 follows Accurate's calculate-employee-payment.do:
// Jan-Nov TER (PP 58/2023) on gross less Pengurangan Gaji; December recomputes the year with Pasal 17 and withholds the
// difference (negative = Kelebihan Pajak). Amounts are cents.
// The journal (P4.2 batch 2) is posted only when the run names its accounts: Dr each fee's expense account in fee order,
// Cr PPh 21 payable, Cr salary payable for the rest (EPY.2051.02, docs/parity/buku-besar/pencatatan-gaji).
// shortcut: no resign/mid-year annualisation, December is the only year-end month; journal lines for reductions,
// deductions and employer pension are not captured, so a journaled run refuses them; add them when a capture covers them.

/** Accurate's default Gaji/Tunjangan master by name: how each fee counts for income, cash paid and PPh. */
const FEE_KIND: Record<string, 'income' | 'benefit' | 'employer' | 'reduction' | 'deduction' | 'pension'> = {
  'Gaji Pokok': 'income', 'Tunjangan Hari Raya': 'income', 'Tunjangan Bonus': 'income', 'Tunjangan PPh': 'income', 'Tunjangan Jabatan': 'income',
  'Tunjangan Makan': 'income', 'Tunjangan Transportasi': 'income', 'Tunjangan Telekomunikasi': 'income', 'Tunjangan Lembur': 'income', 'Rapel Gaji': 'income',
  'Tunjangan Premi Kesehatan': 'benefit', 'Tunjangan Program JKK': 'benefit', 'Tunjangan Program JKM': 'benefit', // taxable, paid to BPJS not the employee
  'Tunjangan Pensiun/THT/JHT': 'employer', // employer pension: neither income nor deducted
  'Pengurangan Gaji': 'reduction', // lowers pay and the PPh base
  'Iuran Bulanan dan lainnya': 'deduction', 'Potongan Cicilan': 'deduction', 'Potongan Premi Kesehatan': 'deduction',
  'Iuran Pensiun/THT/JHT': 'pension', // employee pension: lowers pay and the annual neto
}

// TER brackets [upper bound of monthly gross, rate %]; the last bound is open.
const TER: Record<'A' | 'B' | 'C', [number, number][]> = {
  A: [[5400000, 0], [5650000, 0.25], [5950000, 0.5], [6300000, 0.75], [6750000, 1], [7500000, 1.25], [8550000, 1.5], [9650000, 1.75], [10050000, 2], [10350000, 2.25], [10700000, 2.5], [11050000, 3], [11600000, 3.5], [12500000, 4], [13750000, 5], [15100000, 6], [16950000, 7], [19750000, 8], [24150000, 9], [26450000, 10], [28000000, 11], [30050000, 12], [32400000, 13], [35400000, 14], [39100000, 15], [43850000, 16], [47800000, 17], [51400000, 18], [56300000, 19], [62200000, 20], [68600000, 21], [77500000, 22], [89000000, 23], [103000000, 24], [125000000, 25], [157000000, 26], [206000000, 27], [337000000, 28], [454000000, 29], [550000000, 30], [695000000, 31], [910000000, 32], [1400000000, 33], [Infinity, 34]],
  B: [[6200000, 0], [6500000, 0.25], [6850000, 0.5], [7300000, 0.75], [9200000, 1], [10750000, 1.5], [11250000, 2], [11600000, 2.5], [12600000, 3], [13600000, 4], [14950000, 5], [16400000, 6], [18450000, 7], [21850000, 8], [26000000, 9], [27700000, 10], [29350000, 11], [31450000, 12], [33950000, 13], [37100000, 14], [41100000, 15], [45800000, 16], [49500000, 17], [53800000, 18], [58500000, 19], [64000000, 20], [71000000, 21], [80000000, 22], [93000000, 23], [109000000, 24], [129000000, 25], [163000000, 26], [211000000, 27], [374000000, 28], [459000000, 29], [555000000, 30], [704000000, 31], [957000000, 32], [1405000000, 33], [Infinity, 34]],
  C: [[6600000, 0], [6950000, 0.25], [7350000, 0.5], [7800000, 0.75], [8850000, 1], [9800000, 1.25], [10950000, 1.5], [11200000, 1.75], [12050000, 2], [12950000, 3], [14150000, 4], [15550000, 5], [17050000, 6], [19500000, 7], [22700000, 8], [26600000, 9], [28100000, 10], [30100000, 11], [32600000, 12], [35400000, 13], [38900000, 14], [43000000, 15], [47400000, 16], [51200000, 17], [55800000, 18], [60400000, 19], [66700000, 20], [74500000, 21], [83200000, 22], [95600000, 23], [110000000, 24], [134000000, 25], [169000000, 26], [221000000, 27], [390000000, 28], [463000000, 29], [561000000, 30], [709000000, 31], [965000000, 32], [1419000000, 33], [Infinity, 34]],
}
const terCategory = (s: string) => ['TK0', 'TK1', 'K0'].includes(s) ? 'A' : s === 'K3' ? 'C' : 'B'
/** Monthly PPh 21 (rupiah) by TER on the month's gross. */
export const terPph = (taxStatus: string, gross: number) => Math.round(gross * TER[terCategory(taxStatus)].find(([hi]) => gross <= hi)![1] / 100)
const ptkp = (s: string) => 54000000 + (s.startsWith('K') ? 4500000 : 0) + 4500000 * Number(s.at(-1))
const pasal17 = (pkp: number) => [[60e6, 5], [250e6, 15], [500e6, 25], [5e9, 30], [Infinity, 35]].reduce((a, [hi, r], i, t) => {
  const lo = i ? t[i - 1]![0]! : 0
  return a + Math.max(0, Math.min(pkp, hi!) - lo) * r! / 100
}, 0)

type Fees = Record<string, number> // rupiah by fee name
const sumKind = (f: Fees, ...k: string[]) => Object.entries(f).reduce((s, [n, v]) => s + (k.includes(FEE_KIND[n]!) ? v : 0), 0)
/** Taxable gross of one month: income and employer benefits less Pengurangan Gaji. */
const taxable = (f: Fees) => sumKind(f, 'income', 'benefit') - sumKind(f, 'reduction')
/** Annual PPh 21 for December: Pasal 17 on the year's neto less PTKP, minus what Jan-Nov withheld. */
export function decemberPph(taxStatus: string, year: Fees[], withheld: number) {
  const gross = year.reduce((s, f) => s + taxable(f), 0)
  const neto = gross - Math.min(gross * 0.05, 6000000) - year.reduce((s, f) => s + sumKind(f, 'pension'), 0)
  return pasal17(Math.max(0, Math.floor((neto - ptkp(taxStatus)) / 1000) * 1000)) - withheld
}
/** Income (Accurate incomeAmount), cash paid (amount) and signed PPh of one payroll line. */
export function payLine(f: Fees, pph: number) {
  return { income: sumKind(f, 'income', 'benefit'), paid: sumKind(f, 'income') - sumKind(f, 'reduction', 'deduction', 'pension') - Math.max(pph, 0), pph }
}

export type PayrollRun = { idempotencyKey?: string; number?: string; date: string; year: number; month: number; description?: string; lines: { employee: string; fees: Fees; pph?: number }[]
  /** Journal accounts (all three, or none: no journal). */ payableAccount?: string; pphAccount?: string; feeAccounts?: Record<string, string> }
/** Saves a monthly run; `pph` on a line is a manual PPh (Accurate's manualEditPphAmount), otherwise TER or the December true-up. */
export async function createPayrollRun(db: Db | Tx, r: PayrollRun) {
  if (!r.lines?.length) throw new DomainError('Detail dari transaksi belum diisi!') // Accurate's text
  for (const l of r.lines) for (const [n, a] of Object.entries(l.fees)) {
    if (!FEE_KIND[n]) throw new Error(`Gaji/Tunjangan tidak dikenal: ${n}`)
    if (!Number.isFinite(a) || a < 0) throw new Error(`Nilai ${n} tidak valid`)
    if (r.payableAccount && a && (!['income', 'benefit'].includes(FEE_KIND[n]!) || !r.feeAccounts?.[n])) throw new DomainError(`Gaji/Tunjangan ${n} belum punya akun beban`)
  }
  return db.transaction(async tx => {
    if (r.idempotencyKey) {
      const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${r.idempotencyKey}`)
      if (done) return done.result as { number: string; lines: ({ employee: string } & ReturnType<typeof payLine>)[] }
    }
    const number = r.number ?? await nextNumber(tx, `EPY.${period(r.date)}`)
    await tx.execute(sql`INSERT INTO payroll_runs (number, date, year, month, description) VALUES (${number}, ${r.date}, ${r.year}, ${r.month}, ${r.description ?? ''})`)
    const out = []
    for (const l of r.lines) {
      const [e] = await tx.execute(sql`SELECT tax_status FROM employees WHERE no = ${l.employee}`)
      if (!e) throw new Error(`Karyawan tidak ditemukan: ${l.employee}`)
      const prior = (await tx.execute(sql`SELECT pl.fees, pl.pph FROM payroll_lines pl JOIN payroll_runs pr ON pr.number = pl.run_number
        WHERE pl.employee_no = ${l.employee} AND pr.year = ${r.year} AND pr.month < ${r.month}`)).map(p => ({ fees: Object.fromEntries(Object.entries(p.fees as Fees).map(([n, a]) => [n, a / 100])), pph: Number(p.pph) / 100 }))
      const pph = l.pph ?? (r.month === 12 ? decemberPph(e.tax_status as string, [...prior.map(p => p.fees), l.fees], prior.reduce((s, p) => s + p.pph, 0)) : terPph(e.tax_status as string, taxable(l.fees)))
      const v = payLine(l.fees, pph)
      await tx.execute(sql`INSERT INTO payroll_lines VALUES (${number}, ${l.employee}, ${JSON.stringify(Object.fromEntries(Object.entries(l.fees).map(([n, a]) => [n, Math.round(a * 100)])))}::jsonb,
        ${Math.round(v.income * 100)}, ${Math.round(v.paid * 100)}, ${Math.round(v.pph * 100)})`)
      out.push({ employee: l.employee, ...v })
    }
    if (r.payableAccount) {
      const rp = (x: number) => (Math.round(x * 100) / 100).toFixed(2)
      const debits = merge(r.lines.flatMap(l => Object.entries(l.fees).filter(([, a]) => a).map(([n, a]) => ({ account: r.feeAccounts![n]!, amount: a }))))
      const pph = out.reduce((s, l) => s + Math.max(l.pph, 0), 0), total = debits.reduce((s, d) => s + d.amount, 0)
      if (pph && !r.pphAccount) throw new DomainError('Akun Hutang PPh harus diisi')
      const journalId = crypto.randomUUID()
      await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${r.idempotencyKey ?? number}:journal`, journalId, number, sourceType: 'EPY', date: r.date, description: r.description ?? '',
        lines: [...debits.map(d => ({ account: d.account, side: 'DEBIT' as const, amount: rp(d.amount) })),
          ...(pph ? [{ account: r.pphAccount!, side: 'CREDIT' as const, amount: rp(pph) }] : []), { account: r.payableAccount, side: 'CREDIT' as const, amount: rp(total - pph) }] })
      await tx.execute(sql`UPDATE payroll_runs SET journal_id = ${journalId} WHERE number = ${number}`)
    }
    const result = { number, lines: out }
    if (r.idempotencyKey) await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${r.idempotencyKey}, 'CreatePayrollRun', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Takes back a run (lines, row and journal). */
async function removePayrollRun(tx: Tx, number: string, idempotencyKey: string) {
  const [run] = await tx.execute(sql`SELECT journal_id FROM payroll_runs WHERE number = ${number} FOR UPDATE`)
  if (!run) throw new DomainError(`${number} tidak ditemukan`)
  await tx.execute(sql`DELETE FROM payroll_lines WHERE run_number = ${number}`)
  await tx.execute(sql`DELETE FROM payroll_runs WHERE number = ${number}`)
  if (run.journal_id) await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: run.journal_id as string })
}

export async function deletePayrollRun(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removePayrollRun(tx, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeletePayrollRun', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Edited in place under the same number, as Accurate does. */
export async function editPayrollRun(db: Db, number: string, r: PayrollRun & { idempotencyKey: string }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${r.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removePayrollRun(tx, number, r.idempotencyKey)
    return createPayrollRun(tx, { ...r, number: r.number ?? number })
  })
}

type Line = { year: number; month: number; name: string; fees: Fees; income: number; paid: number; pph: number } // cents
export async function loadPayroll(db: Db): Promise<Line[]> {
  return (await db.execute(sql`SELECT r.year, r.month, e.name, l.fees, l.income, l.paid, l.pph FROM payroll_lines l
    JOIN payroll_runs r ON r.number = l.run_number JOIN employees e ON e.no = l.employee_no ORDER BY r.year, r.month, e.name`))
    .map(r => ({ year: Number(r.year), month: Number(r.month), name: r.name as string, fees: r.fees as Fees, income: Number(r.income), paid: Number(r.paid), pph: Number(r.pph) }))
}

/** Crosstab measures of a line: every fee by name plus paid, PPh and Kelebihan Pajak. */
const measures = (l: Line): Fees => ({ ...l.fees, 'Gaji dibayarkan': l.paid, 'Pajak Penghasilan': l.pph, 'Kelebihan Pajak': Math.max(0, -l.pph) })
const add = (a: Fees, b: Fees) => { for (const [k, v] of Object.entries(b)) a[k] = (a[k] ?? 0) + v; return a }
/** Accurate's crosstab: one column per measure that is non-zero somewhere, in code-unit order; one row per employee, branch then totals. */
function crosstab(ls: Line[], lead: string[]) {
  if (!ls.length) return []
  const byEmp = new Map<string, Fees>()
  for (const l of ls) byEmp.set(l.name, add(byEmp.get(l.name) ?? {}, measures(l)))
  const total = [...byEmp.values()].reduce((a, m) => add(a, m), {} as Fees)
  const cols = Object.keys(total).filter(k => [...byEmp.values()].some(m => m[k])).sort()
  const cells = (m: Fees) => cols.map(c => formatIdr(m[c] ?? 0))
  const names = [...byEmp.keys()].sort()
  return [[...lead, 'Karyawan', ...cols], ...names.map((n, i) => [...(i ? [] : ['Kantor Pusat', ...(lead.length > 1 ? ['Bulanan'] : [])]), n, ...cells(byEmp.get(n)!)]),
    ['Total Karyawan', ...cells(total)], ['Total Cabang', ...cells(total)]]
}
/** Rincian Gaji Karyawan per Bulan (EmployeePaymentByEmployeeReport) */
export const monthlyPayroll = (ls: Line[], year: number, month: number) => crosstab(ls.filter(l => l.year === year && l.month === month), ['Cabang', 'Tipe Pembayaran'])
/** Rincian Gaji Karyawan per Tahun (EmployeePaymentYearlyByEmployeeReport) */
export const yearlyPayroll = (ls: Line[], year: number) => crosstab(ls.filter(l => l.year === year), ['Cabang'])

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
/** Pajak Penghasilan Karyawan (EmployeePphReport): signed PPh per employee and paid month. */
export function pphByMonth(ls: Line[], year: number) {
  const y = ls.filter(l => l.year === year)
  if (!y.length) return []
  const months = [...new Set(y.map(l => l.month))].sort((a, b) => a - b), names = [...new Set(y.map(l => l.name))].sort()
  const row = (f: Line[]) => [...months.map(m => f.filter(l => l.month === m).reduce((s, l) => s + l.pph, 0)), f.reduce((s, l) => s + l.pph, 0)].map(formatIdr)
  return [['Cabang', 'Karyawan', ...months.map(m => MONTHS[m - 1]!), 'Total Bulan'], ...names.map((n, i) => [...(i ? [] : ['Kantor Pusat']), n, ...row(y.filter(l => l.name === n))]),
    ['Total Karyawan', ...row(y)], ['Total Cabang', ...row(y)]]
}
/** Porsi Gaji Karyawan (EmployeeSalaryProportionReport, pie): legend `<employee> - <income> (<pct>%)` by name. */
export function salaryShareChart(ls: Line[], year: number) {
  const y = ls.filter(l => l.year === year), total = y.reduce((s, l) => s + l.income, 0)
  return [...new Set(y.map(l => l.name))].sort().map(n => { const v = y.filter(l => l.name === n).reduce((s, l) => s + l.income, 0); return `${n} - ${formatIdr(v)} (${Math.round(v * 100 / total)}%)` })
}
/** Gaji Karyawan per Tahun (EmployeeSalaryPerYearReport, bars): Gaji dibayarkan per year. */
export const salaryPerYearChart = (ls: Line[]) => [...new Set(ls.map(l => l.year))].sort().map(y => [String(y), formatIdr(ls.filter(l => l.year === y).reduce((s, l) => s + l.paid, 0))])
