// P4.2 batch 1 (docs/parity): the edit/delete commands added for Pembayaran/Penerimaan, Uang Muka Penjualan, Pinjaman
// Karyawan and Pencairan Pinjaman, with the same inputs as the scenario scripts (tools/parity/scenarios) and the journals
// and messages Accurate printed for them (Manufaktur Demo, 2051).
import { afterAll, beforeAll, expect, test } from 'bun:test'
import * as C from '../src/cash-bank/service'
import { createCashDocument, deleteCashDocument, editCashDocument } from '../src/cash-bank/service'
import * as FA from '../src/fixed-assets/service'
import * as PAY from '../src/payroll/payroll'
import * as P from '../src/purchases/service'
import * as R from '../src/returns/service'
import * as IA from '../src/inventory/adjustment'
import * as JC from '../src/inventory/job-costing'
import { handle } from '../src/ledger/handler'
import * as L from '../src/payroll/loans'
import { catchUp, ledgerProjection } from '../src/projections'
import { queryGeneralLedger } from '../src/reports/queries'
import { createDeliveryOrder, deleteDeliveryOrder, editDeliveryOrder, createSalesDownPayment, createSalesInvoice, createSalesReceipt, deleteSalesDownPayment, deleteSalesInvoice, deleteSalesReceipt, editSalesDownPayment, editSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('parity_p4')
  for (const [no, name, accountType] of [['110301', 'Piutang Usaha IDR', 'ACCOUNT_RECEIVABLE'], ['210102', 'Uang Muka Penjualan IDR', 'ACCOUNT_PAYABLE']] as const)
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${no}`, no, name, accountType })
  await catchUp(f.db, ledgerProjection) // accounts are a projection
  await upsertCustomer(f.db, { no: 'NL-T2-C1', name: 'NL-T2 Pelanggan A', arAccount: '110301' })
  await L.upsertEmployee(f.db, { no: 'E.00001', name: 'Karyawan Produksi' })
})
afterAll(() => f.close())
const journal = async (day: string) => { await catchUp(f.db, ledgerProjection); return queryGeneralLedger(f.db, 'all-journals', { from: day, to: day, showZeroBalance: false, showParentAccount: true }) }
const head = (day: string, number: string, type: string, desc: string) => [['Tanggal', ':', day, 'No. Trans #', ':', number], ['Tipe Transaksi', ':', type, 'Deskripsi', ':', desc], ['Kode Perkiraan', 'Nama Perkiraan', 'Debit', 'Kredit']]

test('Pembayaran: edit in place keeps the number, delete takes the journal back, no lines is refused with Accurate\'s text', async () => {
  const doc = { kind: 'PAY' as const, bank: 'NL-T1-1101', date: '2051-01-06', lines: [{ account: 'NL-T1-6001', amount: 250000, notes: 'NL-P4-OP1 beban' }] }
  const { number } = await createCashDocument(f.db, { ...doc, idempotencyKey: 'op1-create', description: 'NL-P4-OP1' })
  expect(number).toBe('NL-T1-1101.2051.01.00001')
  expect(await editCashDocument(f.db, number, { ...doc, idempotencyKey: 'op1-edit', description: 'NL-P4-OP1 edit', lines: [{ ...doc.lines[0]!, amount: 275000 }] })).toEqual({ number })
  expect(await journal('2051-01-06')).toEqual([...head('06 Jan 2051', number, 'Pembayaran', 'NL-P4-OP1 edit'),
    ['NL-T1-6001', 'NL-T1 Beban', '275.000', '0'], ['NL-T1-1101', 'NL-T1 Kas', '0', '275.000'], ['275.000', '275.000']])
  await expect(createCashDocument(f.db, { ...doc, idempotencyKey: 'op1-bad-lines', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await deleteCashDocument(f.db, number, 'op1-delete')
  expect(await journal('2051-01-06')).toEqual([])
  await expect(deleteCashDocument(f.db, number, 'op1-delete-again')).rejects.toThrow('tidak ditemukan')
})

test('Penerimaan: Dr bank / Cr account after an edit', async () => {
  const doc = { kind: 'DEP' as const, bank: 'NL-T1-1101', date: '2051-01-07', lines: [{ account: 'NL-T1-4001', amount: 400000 }] }
  const { number } = await createCashDocument(f.db, { ...doc, idempotencyKey: 'od1-create', description: 'NL-P4-OD1' })
  await editCashDocument(f.db, number, { ...doc, idempotencyKey: 'od1-edit', description: 'NL-P4-OD1 edit', lines: [{ account: 'NL-T1-4001', amount: 425000 }] })
  expect(await journal('2051-01-07')).toEqual([...head('07 Jan 2051', number, 'Penerimaan', 'NL-P4-OD1 edit'),
    ['NL-T1-1101', 'NL-T1 Kas', '425.000', '0'], ['NL-T1-4001', 'NL-T1 Pendapatan', '0', '425.000'], ['425.000', '425.000']])
})

test('Uang Muka Penjualan: edit, zero refused with Accurate\'s text, delete refused once an invoice uses it', async () => {
  const dp = { customer: 'NL-T2-C1', date: '2051-01-10', dpAccount: '210102' }
  const { number } = await createSalesDownPayment(f.db, { ...dp, idempotencyKey: 'dp1-create', description: 'NL-P4-DP1', amount: 500000 })
  await editSalesDownPayment(f.db, number, { ...dp, idempotencyKey: 'dp1-edit', description: 'NL-P4-DP1 edit', amount: 550000 })
  expect(await journal('2051-01-10')).toEqual([...head('10 Jan 2051', number, 'Uang Muka Penjualan', 'NL-P4-DP1 edit'),
    ['110301', 'Piutang Usaha IDR', '550.000', '0'], ['210102', 'Uang Muka Penjualan IDR', '0', '550.000'], ['550.000', '550.000']])
  await expect(createSalesDownPayment(f.db, { ...dp, idempotencyKey: 'dp1-bad-zero', amount: 0 })).rejects.toThrow('Uang muka harus lebih besar dari nol')
  await expect(editSalesDownPayment(f.db, number, { ...dp, idempotencyKey: 'dp1-bad-edit', amount: 0 })).rejects.toThrow('Uang muka harus lebih besar dari nol')
  await handle(f.db, { type: 'OpenAccount', idempotencyKey: 'acct-400001', no: '400001', name: 'Penjualan', accountType: 'REVENUE' })
  await catchUp(f.db, ledgerProjection)
  await upsertItem(f.db, { no: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', type: 'SERVICE', unit: 'JAM', salesAccount: '400001' })
  await createSalesInvoice(f.db, { idempotencyKey: 'dp1-use-invoice', customer: 'NL-T2-C1', date: '2051-01-11', lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty: 1, price: 600000 }],
    downPayments: [{ invoice: number, amount: 550000 }] })
  await expect(deleteSalesDownPayment(f.db, number, 'dp1-delete')).rejects.toThrow('sudah dipakai transaksi lain')
})

test('Pinjaman Karyawan and Pencairan Pinjaman: EPL/ELD numbers, Dr receivable / Cr bank, loan delete refused while disbursed', async () => {
  await expect(L.createEmployeeLoan(f.db, { employee: '', date: '2051-01-12', amount: 300000 })).rejects.toThrow('Karyawan harus diisi')
  const { number: loan } = await L.createEmployeeLoan(f.db, { employee: 'E.00001', date: '2051-01-13', amount: 300000, description: 'NL-P4-LD1 pinjaman', receivableAccount: 'NL-T1-1201' })
  expect(loan).toBe('EPL.2051.01.00001')
  await expect(L.createLoanDisbursement(f.db, { idempotencyKey: 'ld1-bad-loan', bank: 'NL-T1-1101', date: '2051-01-14' })).rejects.toThrow('Nomor Pinjaman harus diisi')
  const { number } = await L.createLoanDisbursement(f.db, { idempotencyKey: 'ld1-create', loan, bank: 'NL-T1-1101', date: '2051-01-14', description: 'NL-P4-LD1' })
  expect(number).toBe('ELD.2051.01.00001')
  await L.editLoanDisbursement(f.db, number, { idempotencyKey: 'ld1-edit', loan, bank: 'NL-T1-1101', date: '2051-01-14', description: 'NL-P4-LD1 edit' })
  expect(await journal('2051-01-14')).toEqual([...head('14 Jan 2051', number, 'Pencairan Pinjaman', 'NL-P4-LD1 edit'),
    ['NL-T1-1201', 'NL-T1 Peralatan', '300.000', '0'], ['NL-T1-1101', 'NL-T1 Kas', '0', '300.000'], ['300.000', '300.000']])
  await expect(L.deleteEmployeeLoan(f.db, loan)).rejects.toThrow('Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pencairan Pinjaman')
  await expect(L.editEmployeeLoan(f.db, loan, { employee: 'E.00001', date: '2051-01-13', amount: 1 })).rejects.toThrow('sudah dicairkan')
  await L.deleteLoanDisbursement(f.db, number, 'ld1-delete')
  expect(await journal('2051-01-14')).toEqual([])
  // Accurate refuses the edit of a loan with a balance (the loan counts against itself, ADR-0045)
  await expect(L.editEmployeeLoan(f.db, loan, { employee: 'E.00001', date: '2051-01-13', amount: 360000, description: 'NL-P4-LD1 edit' })).rejects.toThrow('Karyawan Karyawan Produksi Masih Memiliki Pinjaman Yang Belum Lunas')
  await expect(L.createEmployeeLoan(f.db, { employee: 'E.00001', date: '2051-01-13', amount: 1 })).rejects.toThrow('Masih Memiliki Pinjaman Yang Belum Lunas')
  expect(await L.deleteEmployeeLoan(f.db, loan)).toEqual({ number: loan })
})

// P4.2 batch 2 (docs/parity, ADR-0042): the same inputs as tools/parity/scenarios and the journals Accurate printed (Manufaktur Demo, Feb 2051).
const open = async (...accts: [string, string, string][]) => {
  for (const [no, name, accountType] of accts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${no}`, no, name, accountType: accountType as any })
  await catchUp(f.db, ledgerProjection)
}

test('Pencatatan Beban: EXP number kept on edit, Dr expense / Cr payable, no lines refused with Accurate\'s text, delete', async () => {
  await open(['600011', 'Beban Listrik', 'EXPENSE'], ['210206', 'Hutang Gaji Karyawan', 'OTHER_CURRENT_LIABILITY'])
  const ea = { date: '2051-02-02', dueDate: '2051-03-02', payableAccount: '210206' }
  const { number } = await C.createExpenseAccrual(f.db, { ...ea, idempotencyKey: 'ea1-create', description: 'NL-P4-EA1', lines: [{ account: '600011', amount: 120000 }] })
  expect(number).toBe('EXP.2051.02.00001')
  expect(await C.editExpenseAccrual(f.db, number, { ...ea, idempotencyKey: 'ea1-edit', description: 'NL-P4-EA1 edit', lines: [{ account: '600011', amount: 135000 }] })).toEqual({ number })
  expect(await journal('2051-02-02')).toEqual([...head('02 Feb 2051', number, 'Pencatatan Beban', 'NL-P4-EA1 edit'),
    ['600011', 'Beban Listrik', '135.000', '0'], ['210206', 'Hutang Gaji Karyawan', '0', '135.000'], ['135.000', '135.000']])
  await expect(C.createExpenseAccrual(f.db, { ...ea, idempotencyKey: 'ea1-bad', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!; Ada yang salah dengan data yang dimasukkan. Total nilai harus lebih besar dari nol.')
  await C.deleteExpenseAccrual(f.db, number, 'ea1-delete')
  expect(await journal('2051-02-02')).toEqual([])
})

test('Faktur Pembelian: edit in place, Dr the service\'s expense account / Cr payable, no lines refused, delete', async () => {
  await open(['600020', 'Beban Operasional Lainnya', 'EXPENSE'], ['210101', 'Hutang Usaha IDR', 'ACCOUNT_PAYABLE'], ['400001', 'Penjualan', 'REVENUE'])
  await P.upsertVendor(f.db, { no: 'NL-T3-V1', name: 'NL-T3 Pemasok A', apAccount: '210101' })
  await upsertItem(f.db, { no: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', type: 'SERVICE', unit: 'JAM', salesAccount: '400001', expenseAccount: '600020' })
  const pi = { vendor: 'NL-T3-V1', bill: 'NL-P4-PI1', date: '2051-02-03' }
  const { number } = await P.createPurchaseInvoice(f.db, { ...pi, idempotencyKey: 'pi1-create', description: 'NL-P4-PI1', lines: [{ item: 'NL-T2-S1', qty: 2, price: 50000 }] })
  expect(await P.editPurchaseInvoice(f.db, number, { ...pi, idempotencyKey: 'pi1-edit', description: 'NL-P4-PI1 edit', lines: [{ item: 'NL-T2-S1', qty: 3, price: 50000 }] })).toEqual({ number })
  expect(await journal('2051-02-03')).toEqual([...head('03 Feb 2051', number, 'Faktur Pembelian', 'NL-P4-PI1 edit'),
    ['600020', 'Beban Operasional Lainnya', '150.000', '0'], ['210101', 'Hutang Usaha IDR', '0', '150.000'], ['150.000', '150.000']])
  await expect(P.createPurchaseInvoice(f.db, { ...pi, bill: 'NL-P4-PI1-X', idempotencyKey: 'pi1-bad', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await P.deletePurchaseInvoice(f.db, number, 'pi1-delete')
  expect(await journal('2051-02-03')).toEqual([])
})

test('Penerimaan Penjualan and Retur Penjualan: edit in place, Accurate\'s journals, no lines refused, delete; the invoice can go afterwards', async () => {
  const inv = await createSalesInvoice(f.db, { idempotencyKey: 'sr1-invoice', customer: 'NL-T2-C1', date: '2051-02-04', description: 'NL-P4-SR1 faktur', lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty: 1, price: 300000 }] })
  const rc = { customer: 'NL-T2-C1', bank: 'NL-T1-1101', date: '2051-02-05' }
  const { number } = await createSalesReceipt(f.db, { ...rc, idempotencyKey: 'sr1-create', description: 'NL-P4-SR1', payments: [{ invoice: inv.number, amount: 300000 }] })
  expect(number).toBe('NL-T1-1101.2051.02.00001')
  expect(await editSalesReceipt(f.db, number, { ...rc, idempotencyKey: 'sr1-edit', description: 'NL-P4-SR1 edit', payments: [{ invoice: inv.number, amount: 250000 }] })).toEqual({ number })
  expect(await journal('2051-02-05')).toEqual([...head('05 Feb 2051', number, 'Penerimaan Penjualan', 'NL-P4-SR1 edit'),
    ['NL-T1-1101', 'NL-T1 Kas', '250.000', '0'], ['110301', 'Piutang Usaha IDR', '0', '250.000'], ['250.000', '250.000']])
  await expect(createSalesReceipt(f.db, { ...rc, idempotencyKey: 'sr1-bad', payments: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await deleteSalesReceipt(f.db, number, 'sr1-delete')
  expect(await journal('2051-02-05')).toEqual([])
  expect(await deleteSalesInvoice(f.db, inv.number, 'sr1-invoice-delete')).toEqual({ number: inv.number })

  const si = await createSalesInvoice(f.db, { idempotencyKey: 'rt1-invoice', customer: 'NL-T2-C1', date: '2051-02-06', lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty: 2, price: 100000 }] })
  const rt = { invoice: si.number, date: '2051-02-07' }
  const r = await R.createSalesReturn(f.db, { ...rt, idempotencyKey: 'rt1-create', description: 'NL-P4-RT1', lines: [{ item: 'NL-T2-S1', qty: 1, price: 100000 }] })
  expect(r.number).toBe('SRT.2051.02.00001')
  await R.editSalesReturn(f.db, r.number, { ...rt, idempotencyKey: 'rt1-edit', description: 'NL-P4-RT1 edit', lines: [{ item: 'NL-T2-S1', qty: 2, price: 100000 }] })
  expect(await journal('2051-02-07')).toEqual([...head('07 Feb 2051', r.number, 'Retur Penjualan', 'NL-P4-RT1 edit'),
    ['400001', 'Penjualan', '200.000', '0'], ['110301', 'Piutang Usaha IDR', '0', '200.000'], ['200.000', '200.000']])
  await expect(R.createSalesReturn(f.db, { ...rt, idempotencyKey: 'rt1-bad', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await R.deleteSalesReturn(f.db, r.number, 'rt1-delete')
  expect(await journal('2051-02-07')).toEqual([])
  expect(await deleteSalesInvoice(f.db, si.number, 'rt1-invoice-delete')).toEqual({ number: si.number })
})

test('Pencatatan Gaji: EPY number, Dr fee expenses / Cr PPh 21 / Cr salary payable (TER), edit in place, no employees refused, delete', async () => {
  await open(['600004', 'Beban Gaji, Upah & Honorer', 'EXPENSE'], ['600006', 'Beban Transportasi Karyawan', 'EXPENSE'], ['210205', 'Hutang PPh 21', 'OTHER_CURRENT_LIABILITY'])
  await L.upsertEmployee(f.db, { no: 'NL-PY50-E1', name: 'NL-PY50 Karyawan A', taxStatus: 'TK0' })
  const run = { date: '2051-02-28', year: 2051, month: 2, payableAccount: '210206', pphAccount: '210205', feeAccounts: { 'Gaji Pokok': '600004', 'Tunjangan Transportasi': '600006' } }
  const lines = (gaji: number) => [{ employee: 'NL-PY50-E1', fees: { 'Gaji Pokok': gaji, 'Tunjangan Transportasi': 1000000 } }]
  const c = await PAY.createPayrollRun(f.db, { ...run, idempotencyKey: 'epy1-create', description: 'NL-P4-EPY1', lines: lines(10000000) })
  expect(c).toEqual({ number: 'EPY.2051.02.00001', lines: [{ employee: 'NL-PY50-E1', income: 11000000, paid: 10670000, pph: 330000 }] })
  await PAY.editPayrollRun(f.db, c.number, { ...run, idempotencyKey: 'epy1-edit', description: 'NL-P4-EPY1 edit', lines: lines(12000000) })
  expect(await journal('2051-02-28')).toEqual([...head('28 Feb 2051', c.number, 'Pencatatan Gaji', 'NL-P4-EPY1 edit'),
    ['600004', 'Beban Gaji, Upah & Honorer', '12.000.000', '0'], ['600006', 'Beban Transportasi Karyawan', '1.000.000', '0'],
    ['210205', 'Hutang PPh 21', '0', '650.000'], ['210206', 'Hutang Gaji Karyawan', '0', '12.350.000'], ['13.000.000', '13.000.000']])
  await expect(PAY.createPayrollRun(f.db, { ...run, idempotencyKey: 'epy1-bad', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await PAY.deletePayrollRun(f.db, c.number, 'epy1-delete')
  expect(await journal('2051-02-28')).toEqual([])
})

test('Proses Akhir Bulan: no month refused with Accurate\'s text; edit keeps the number, delete frees the period', async () => {
  await expect(FA.runPeriodEnd(f.db, { idempotencyKey: 'pe1-bad', period: '2051-00' })).rejects.toThrow('Bulan harus diisi')
  expect(await FA.runPeriodEnd(f.db, { idempotencyKey: 'pe1-create', period: '2051-02' })).toEqual({ number: 'Februari 2051' })
  expect(await FA.editPeriodEnd(f.db, '2051-02', { idempotencyKey: 'pe1-edit' })).toEqual({ number: 'Februari 2051' })
  expect(await FA.deletePeriodEnd(f.db, '2051-02', 'pe1-delete')).toEqual({ number: 'Februari 2051' })
  expect(await FA.runPeriodEnd(f.db, { idempotencyKey: 'pe1-again', period: '2051-02' })).toEqual({ number: 'Februari 2051' })
})

// P4.2 batch 3 (docs/parity, ADR-0043): same inputs as tools/parity/scenarios and journals Accurate printed (Manufaktur Demo, Mar 2051).
test('Pembayaran Pembelian and Retur Pembelian: edit in place, Accurate\'s journals, no lines refused, delete; the invoice can go afterwards', async () => {
  const inv = await P.createPurchaseInvoice(f.db, { idempotencyKey: 'pp1-invoice', vendor: 'NL-T3-V1', bill: 'NL-P4-PP1-B', date: '2051-03-02', lines: [{ item: 'NL-T2-S1', qty: 1, price: 300000 }] })
  const pp = { vendor: 'NL-T3-V1', bank: 'NL-T1-1101', date: '2051-03-03' }
  const { number } = await P.createPurchasePayment(f.db, { ...pp, idempotencyKey: 'pp1-create', description: 'NL-P4-PP1', payments: [{ invoice: inv.number, amount: 300000 }] })
  expect(number).toBe('NL-T1-1101.2051.03.00001')
  expect(await P.editPurchasePayment(f.db, number, { ...pp, idempotencyKey: 'pp1-edit', description: 'NL-P4-PP1 edit', payments: [{ invoice: inv.number, amount: 250000 }] })).toEqual({ number })
  expect(await journal('2051-03-03')).toEqual([...head('03 Mar 2051', number, 'Pembayaran Pembelian', 'NL-P4-PP1 edit'),
    ['210101', 'Hutang Usaha IDR', '250.000', '0'], ['NL-T1-1101', 'NL-T1 Kas', '0', '250.000'], ['250.000', '250.000']])
  await expect(P.createPurchasePayment(f.db, { ...pp, idempotencyKey: 'pp1-bad', payments: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await P.deletePurchasePayment(f.db, number, 'pp1-delete')
  expect(await journal('2051-03-03')).toEqual([])
  expect(await P.deletePurchaseInvoice(f.db, inv.number, 'pp1-invoice-delete')).toEqual({ number: inv.number })

  const pi = await P.createPurchaseInvoice(f.db, { idempotencyKey: 'pr1-invoice', vendor: 'NL-T3-V1', bill: 'NL-P4-PR1-B', date: '2051-03-04', lines: [{ item: 'NL-T2-S1', qty: 2, price: 100000 }] })
  const rt = { invoice: pi.number, date: '2051-03-05' }
  const r = await R.createPurchaseReturn(f.db, { ...rt, idempotencyKey: 'pr1-create', description: 'NL-P4-PR1', lines: [{ item: 'NL-T2-S1', qty: 1, price: 100000 }] })
  expect(r.number).toBe('PRT.2051.03.00001')
  expect(await R.editPurchaseReturn(f.db, r.number, { ...rt, idempotencyKey: 'pr1-edit', description: 'NL-P4-PR1 edit', lines: [{ item: 'NL-T2-S1', qty: 2, price: 100000 }] })).toEqual({ number: r.number })
  expect(await journal('2051-03-05')).toEqual([...head('05 Mar 2051', r.number, 'Retur Pembelian', 'NL-P4-PR1 edit'),
    ['210101', 'Hutang Usaha IDR', '200.000', '0'], ['600020', 'Beban Operasional Lainnya', '0', '200.000'], ['200.000', '200.000']])
  await expect(R.createPurchaseReturn(f.db, { ...rt, idempotencyKey: 'pr1-bad', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await R.deletePurchaseReturn(f.db, r.number, 'pr1-delete')
  expect(await journal('2051-03-05')).toEqual([])
  expect(await P.deletePurchaseInvoice(f.db, pi.number, 'pr1-invoice-delete')).toEqual({ number: pi.number })
})

test('Penyesuaian Persediaan: IA number kept on edit, Dr inventory / Cr adjustment account, no lines refused, delete takes the stock back', async () => {
  await open(['110401', 'Persediaan Barang Jadi', 'INVENTORY'], ['300001', 'Equitas Saldo Awal', 'EQUITY'], ['500001', 'Beban Pokok Penjualan', 'COGS'])
  await upsertItem(f.db, { no: 'NL-T4-B1', name: 'NL-T4 Barang A', type: 'INVENTORY', unit: 'PCS', salesAccount: '400001', inventoryAccount: '110401', cogsAccount: '500001' })
  const ia = { date: '2051-03-06', account: '300001' }
  const { number } = await IA.createItemAdjustment(f.db, { ...ia, idempotencyKey: 'ia1-create', description: 'NL-P4-IA1', lines: [{ item: 'NL-T4-B1', direction: 'IN', qty: 2, unitCost: 15000 }] })
  expect(number).toBe('IA.2051.03.00001')
  expect(await IA.editItemAdjustment(f.db, number, { ...ia, idempotencyKey: 'ia1-edit', description: 'NL-P4-IA1 edit', lines: [{ item: 'NL-T4-B1', direction: 'IN', qty: 3, unitCost: 15000 }] })).toEqual({ number })
  expect(await journal('2051-03-06')).toEqual([...head('06 Mar 2051', number, 'Penyesuaian Persediaan', 'NL-P4-IA1 edit'),
    ['110401', 'Persediaan Barang Jadi', '45.000', '0'], ['300001', 'Equitas Saldo Awal', '0', '45.000'], ['45.000', '45.000']])
  await expect(IA.createItemAdjustment(f.db, { ...ia, idempotencyKey: 'ia1-bad', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await IA.deleteItemAdjustment(f.db, number, 'ia1-delete')
  expect(await journal('2051-03-06')).toEqual([])
  const [m] = await f.client.unsafe(`SELECT count(*)::int AS n FROM stock_moves WHERE doc_type = 'IA' AND doc_number = '${number}'`)
  expect(m!.n).toBe(0)
})

test('Aset Tetap, Perubahan and Disposisi: FAA/FAE/FAD numbers, edit in place, Accurate\'s texts, delete; a used asset cannot be deleted', async () => {
  await open(['120005', 'Inventaris Kantor', 'FIXED_ASSET'], ['12000604', 'Akumulasi Penyusutan Inventaris Kantor', 'ACCUMULATED_DEPRECIATION'],
    ['600024', 'Beban Penyusutan Inventaris Kantor', 'EXPENSE'], ['720006', 'Laba/Rugi Disposisi Aset', 'OTHER_EXPENSE'])
  const fa = (description: string, date: string, amount: number) => ({ description, category: 'ZZ-R03-Elektronik C', date, lifeMonths: 24, assetAccount: '120005', accumulatedAccount: '12000604',
    expenseAccount: '600024', expenditures: amount ? [{ name: `${description} perolehan`, date, amount, account: 'NL-T1-3001' }] : [] })
  const { number } = await FA.createFixedAsset(f.db, { ...fa('NL-P4-FA1', '2051-03-09', 2400000), idempotencyKey: 'fa1-create' })
  expect(number).toBe('FAA.2051.03.00001')
  expect(await FA.editFixedAssetRecord(f.db, number, { ...fa('NL-P4-FA1 edit', '2051-03-09', 3000000), idempotencyKey: 'fa1-edit' })).toEqual({ number })
  expect(await journal('2051-03-09')).toEqual([...head('09 Mar 2051', number, 'Aset Tetap', 'NL-P4-FA1 edit'),
    ['120005', 'Inventaris Kantor', '3.000.000', '0'], ['NL-T1-3001', 'NL-T1 Modal', '0', '3.000.000'], ['3.000.000', '3.000.000']])
  await expect(FA.createFixedAsset(f.db, { ...fa('NL-P4-FA1 tanpa pengeluaran', '2051-03-09', 0), idempotencyKey: 'fa1-bad' })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await FA.deleteFixedAsset(f.db, number, 'fa1-delete')
  expect(await journal('2051-03-09')).toEqual([])

  const a = await FA.createFixedAsset(f.db, { ...fa('NL-P4-FAE1 aset', '2051-03-10', 2400000), idempotencyKey: 'fae1-asset' })
  const e = await FA.createAssetEdit(f.db, { idempotencyKey: 'fae1-create', asset: a.number, date: '2051-03-11', description: 'NL-P4-FAE1', lifeMonths: 36 })
  expect(e.number).toBe('FAE.2051.03.00001')
  expect(await FA.editAssetEdit(f.db, e.number, { idempotencyKey: 'fae1-edit', asset: a.number, date: '2051-03-11', description: 'NL-P4-FAE1 edit', lifeMonths: 48 })).toEqual({ number: e.number })
  expect(await journal('2051-03-11')).toEqual([])
  await expect(FA.createAssetEdit(f.db, { idempotencyKey: 'fae1-bad', asset: '', date: '2051-03-11', lifeMonths: 36 })).rejects.toThrow('Aset harus diisi')
  await expect(FA.deleteFixedAsset(f.db, a.number, 'fae1-asset-delete-used')).rejects.toThrow('sudah dipakai transaksi lain')
  await FA.deleteAssetEdit(f.db, e.number, 'fae1-delete')
  const [life] = await f.client.unsafe(`SELECT life_months FROM fixed_assets WHERE number = '${a.number}'`)
  expect(life!.life_months).toBe(24) // the change taken back restores the life before it
  await FA.deleteFixedAsset(f.db, a.number, 'fae1-asset-delete')

  const d0 = await FA.createFixedAsset(f.db, { ...fa('NL-P4-FAD1 aset', '2051-03-12', 2400000), idempotencyKey: 'fad1-asset' })
  const dp = { asset: d0.number, date: '2051-03-13', gainLossAccount: '720006' }
  const d = await FA.disposeFixedAsset(f.db, { ...dp, idempotencyKey: 'fad1-create', description: 'NL-P4-FAD1' })
  expect(d.number).toBe('FAD.2051.03.00001')
  expect(await FA.editDisposal(f.db, d.number, { ...dp, idempotencyKey: 'fad1-edit', description: 'NL-P4-FAD1 edit', price: 1000000, sellingAccount: 'NL-T1-1101' })).toEqual({ number: d.number })
  expect(await journal('2051-03-13')).toEqual([...head('13 Mar 2051', d.number, 'Disposisi Aset Tetap', 'NL-P4-FAD1 edit'),
    ['720006', 'Laba/Rugi Disposisi Aset', '2.400.000', '0'], ['120005', 'Inventaris Kantor', '0', '2.400.000'],
    ['NL-T1-1101', 'NL-T1 Kas', '1.000.000', '0'], ['720006', 'Laba/Rugi Disposisi Aset', '0', '1.000.000'], ['3.400.000', '3.400.000']])
  await expect(FA.disposeFixedAsset(f.db, { ...dp, asset: '', idempotencyKey: 'fad1-bad' })).rejects.toThrow('Aset harus diisi')
  await FA.deleteDisposal(f.db, d.number, 'fad1-delete')
  expect(await journal('2051-03-13')).toEqual([])
  await FA.deleteFixedAsset(f.db, d0.number, 'fad1-asset-delete')
})

// P4.2 batch 4 (ADR-0044): Manufaktur Demo journals for NL-T4 Barang A at 14.600 a unit (FIFO), dated Mar 2051.
test('Pengiriman, Penerimaan Barang, Uang Muka Pembelian, Pemindahan Barang: edit in place, Accurate\'s texts, delete takes journal and stock back', async () => {
  await open(['110402', 'Persediaan Terkirim', 'INVENTORY'], ['110302', 'Uang Muka Pembelian IDR', 'ACCOUNT_RECEIVABLE'], ['210203', 'Hutang Pembelian Belum Ditagih', 'OTHER_CURRENT_LIABILITY'])
  await upsertItem(f.db, { no: 'NL-T4-B1', name: 'NL-T4 Barang A', type: 'INVENTORY', unit: 'PCS', salesAccount: '400001', inventoryAccount: '110401', cogsAccount: '500001', deliveredAccount: '110402' })
  await IA.createItemAdjustment(f.db, { idempotencyKey: 'b4-stock-open', date: '2051-03-01', account: '300001', lines: [{ item: 'NL-T4-B1', direction: 'IN', qty: 20, unitCost: 14600 }] })
  const moves = async (doc: string) => (await f.client.unsafe(`SELECT count(*)::int AS n FROM stock_moves WHERE doc_number = '${doc}'`))[0]!.n

  const d = { customer: 'NL-T2-C1', date: '2051-03-10' }
  const { number: dn } = await createDeliveryOrder(f.db, { ...d, idempotencyKey: 'do1-create', description: 'NL-P4-DO1', lines: [{ item: 'NL-T4-B1', qty: 1 }] })
  expect(await editDeliveryOrder(f.db, dn, { ...d, idempotencyKey: 'do1-edit-qty', description: 'NL-P4-DO1 edit', lines: [{ item: 'NL-T4-B1', qty: 2 }] })).toEqual({ number: dn })
  expect(await journal('2051-03-10')).toEqual([...head('10 Mar 2051', dn, 'Pengiriman Pesanan', 'NL-P4-DO1 edit'),
    ['110402', 'Persediaan Terkirim', '29.200', '0'], ['110401', 'Persediaan Barang Jadi', '0', '29.200'], ['29.200', '29.200']])
  await expect(createDeliveryOrder(f.db, { ...d, idempotencyKey: 'do1-bad-empty', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await deleteDeliveryOrder(f.db, dn, 'do1-delete')
  expect([await journal('2051-03-10'), await moves(dn)]).toEqual([[], 0])

  const ri = { vendor: 'NL-T3-V1', date: '2051-03-11', receiveNumber: 'NL-P4-RI1-R' }
  const { number: rn } = await P.createReceiveItem(f.db, { ...ri, idempotencyKey: 'ri1-create', description: 'NL-P4-RI1', lines: [{ item: 'NL-T4-B1', qty: 2, price: 15000 }] })
  expect(await P.editReceiveItem(f.db, rn, { ...ri, idempotencyKey: 'ri1-edit-qty', description: 'NL-P4-RI1 edit', lines: [{ item: 'NL-T4-B1', qty: 3, price: 15000 }] })).toEqual({ number: rn })
  expect(await journal('2051-03-11')).toEqual([...head('11 Mar 2051', rn, 'Penerimaan Barang', 'NL-P4-RI1 edit'),
    ['110401', 'Persediaan Barang Jadi', '45.000', '0'], ['210203', 'Hutang Pembelian Belum Ditagih', '0', '45.000'], ['45.000', '45.000']])
  await expect(P.createReceiveItem(f.db, { ...ri, idempotencyKey: 'ri1-bad-empty', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await P.deleteReceiveItem(f.db, rn, 'ri1-delete')
  expect([await journal('2051-03-11'), await moves(rn)]).toEqual([[], 0])

  const dp = { vendor: 'NL-T3-V1', date: '2051-03-12', dpAccount: '110302' }
  const { number: pn } = await P.createPurchaseDownPayment(f.db, { ...dp, idempotencyKey: 'pdp1-create', bill: 'NL-P4-PDP1', description: 'NL-P4-PDP1', amount: 300000 })
  expect(await P.editPurchaseDownPayment(f.db, pn, { ...dp, idempotencyKey: 'pdp1-edit', bill: 'NL-P4-PDP1', description: 'NL-P4-PDP1 edit', amount: 330000 })).toEqual({ number: pn })
  expect(await journal('2051-03-12')).toEqual([...head('12 Mar 2051', pn, 'Uang Muka Pembelian', 'NL-P4-PDP1 edit'),
    ['110302', 'Uang Muka Pembelian IDR', '330.000', '0'], ['210101', 'Hutang Usaha IDR', '0', '330.000'], ['330.000', '330.000']])
  await expect(P.createPurchaseDownPayment(f.db, { ...dp, idempotencyKey: 'pdp1-bad', bill: 'NL-P4-PDP1-X', amount: 0 })).rejects.toThrow('Uang muka harus lebih besar dari nol')
  await P.deletePurchaseDownPayment(f.db, pn, 'pdp1-delete')
  expect(await journal('2051-03-12')).toEqual([])

  const it = { date: '2051-03-13', direction: 'OUT' as const, warehouse: 'Utama', referenceWarehouse: 'NL-Gudang B' }
  const { number: tn } = await IA.createItemTransfer(f.db, { ...it, idempotencyKey: 'it1-create', description: 'NL-P4-IT1', lines: [{ item: 'NL-T4-B1', qty: 1 }] })
  expect(await IA.editItemTransfer(f.db, tn, { ...it, idempotencyKey: 'it1-edit-qty', description: 'NL-P4-IT1 edit', lines: [{ item: 'NL-T4-B1', qty: 2 }] })).toEqual({ number: tn })
  const [q] = await f.client.unsafe(`SELECT sum(quantity)::int AS q FROM stock_moves WHERE doc_number = '${tn}' AND warehouse = '${IA.TRANSIT}'`)
  expect([q!.q, await journal('2051-03-13')]).toEqual([2, []]) // 2 in transit, no journal
  await expect(IA.createItemTransfer(f.db, { ...it, idempotencyKey: 'it1-bad-empty', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await IA.deleteItemTransfer(f.db, tn, 'it1-delete')
  expect(await moves(tn)).toBe(0)
})

test('Pekerjaan Pesanan, Penambahan Bahan Baku, Penyelesaian Pesanan: JC/MA/RO journals after edit, Accurate\'s texts, delete', async () => {
  await open(['110403', 'Persediaan Dalam Proses', 'INVENTORY'], ['600001', 'Beban Iklan', 'EXPENSE'], ['600002', 'Beban Komisi', 'EXPENSE'])
  const job = (key: string, date: string, description: string, qty: number, expense = 10000) => JC.createJobOrder(f.db, { idempotencyKey: key, date, description, wipAccount: '110403',
    materials: [{ item: 'NL-T4-B1', qty }], expenses: expense ? [{ account: '600001', name: 'NL-P4 Ongkos Kerja', amount: expense }] : [] })
  const { number: jn } = await job('jc1-create', '2051-03-14', 'NL-P4-JC1', 1)
  expect(await JC.editJobOrder(f.db, jn, { idempotencyKey: 'jc1-edit-qty', date: '2051-03-14', description: 'NL-P4-JC1 edit', wipAccount: '110403',
    materials: [{ item: 'NL-T4-B1', qty: 2 }], expenses: [{ account: '600001', name: 'NL-P4 Ongkos Kerja', amount: 10000 }] })).toEqual({ number: jn })
  expect(await journal('2051-03-14')).toEqual([...head('14 Mar 2051', jn, 'Pekerjaan Pesanan', 'NL-P4-JC1 edit'),
    ['110403', 'Persediaan Dalam Proses', '39.200', '0'], ['110401', 'Persediaan Barang Jadi', '0', '29.200'], ['600001', 'Beban Iklan', '0', '10.000'], ['39.200', '39.200']])
  await expect(JC.createJobOrder(f.db, { idempotencyKey: 'jc1-bad-empty', date: '2051-03-14', wipAccount: '110403' })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await JC.deleteJobOrder(f.db, jn, 'jc1-delete')
  expect(await journal('2051-03-14')).toEqual([])

  const m = await job('ma1-job-create', '2051-03-15', 'NL-P4-MA1 pekerjaan', 1, 0)
  const ma = { job: m.number, type: 'ITEM_PICK' as const, date: '2051-03-16' }
  const { number: an } = await JC.createMaterialAdjustment(f.db, { ...ma, idempotencyKey: 'ma1-create', description: 'NL-P4-MA1', lines: [{ item: 'NL-T4-B1', qty: 1 }] })
  expect(await JC.editMaterialAdjustment(f.db, an, { ...ma, idempotencyKey: 'ma1-edit-qty', description: 'NL-P4-MA1 edit', lines: [{ item: 'NL-T4-B1', qty: 2 }] })).toEqual({ number: an })
  expect(await journal('2051-03-16')).toEqual([...head('16 Mar 2051', an, 'Penambahan Bahan Baku', 'NL-P4-MA1 edit'),
    ['110403', 'Persediaan Dalam Proses', '29.200', '0'], ['110401', 'Persediaan Barang Jadi', '0', '29.200'], ['29.200', '29.200']])
  await expect(JC.createMaterialAdjustment(f.db, { ...ma, idempotencyKey: 'ma1-bad-empty', lines: [] })).rejects.toThrow('Detail dari transaksi belum diisi!')
  await expect(JC.deleteJobOrder(f.db, m.number, 'ma1-job-delete-used')).rejects.toThrow('sudah dipakai transaksi lain')
  await JC.deleteMaterialAdjustment(f.db, an, 'ma1-delete')
  expect(await journal('2051-03-16')).toEqual([])
  await JC.deleteJobOrder(f.db, m.number, 'ma1-job-delete')

  const r = await job('ro1-job-create', '2051-03-17', 'NL-P4-RO1 pekerjaan', 1)
  const ro = { job: r.number, date: '2051-03-18', accounts: [{ account: '600002', name: 'NL-P4 Biaya Selesai', portion: 100 }] }
  const { number: on } = await JC.createRollOver(f.db, { ...ro, idempotencyKey: 'ro1-create', description: 'NL-P4-RO1' })
  expect(await JC.editRollOver(f.db, on, { ...ro, idempotencyKey: 'ro1-edit-desc', description: 'NL-P4-RO1 edit' })).toEqual({ number: on })
  // Accurate also prints a 0/0 line on the job's difference account (ADR-0044 D3)
  expect(await journal('2051-03-18')).toEqual([...head('18 Mar 2051', on, 'Penyelesaian Pesanan', 'NL-P4-RO1 edit'),
    ['600002', 'Beban Komisi', '24.600', '0'], ['110403', 'Persediaan Dalam Proses', '0', '24.600'], ['24.600', '24.600']])
  await expect(JC.createRollOver(f.db, { job: r.number, date: '2051-03-18', idempotencyKey: 'ro1-bad-material', lines: [{ item: 'NL-T4-B1', qty: 1, portion: 100 }] }))
    .rejects.toThrow('NL-T4 Barang A adalah termasuk dalam bahan baku. Tidak bisa di selesaikan ke barang tersebut.')
  await JC.deleteRollOver(f.db, on, 'ro1-delete')
  expect(await journal('2051-03-18')).toEqual([])
  await JC.deleteJobOrder(f.db, r.number, 'ro1-job-delete')
})

// P4.2 batch 5 (docs/parity, ADR-0045): Pelunasan Pinjaman, Pembayaran Angsuran and Transfer Bank, with the journals Accurate printed (Manufaktur Demo, 2051).
test('Pelunasan Pinjaman and Pembayaran Angsuran: Dr bank / Cr receivable, the unpaid balance on the penalty account, settlement edit refused', async () => {
  await open(['NL-T1-4001', 'NL-T1 Pendapatan', 'REVENUE'])
  const mk = async (n: number) => { const { number: loan } = await L.createEmployeeLoan(f.db, { employee: 'E.00001', date: '2051-01-13', amount: 300000, receivableAccount: 'NL-T1-1201', penaltyAccount: 'NL-T1-4001' })
    await L.createLoanDisbursement(f.db, { idempotencyKey: `ls${n}-dis`, loan, bank: 'NL-T1-1101', date: '2051-01-14' }); return loan }
  const loan = await mk(1)
  await expect(L.createLoanSettlement(f.db, { idempotencyKey: 'ls1-bad', bank: 'NL-T1-1101', date: '2051-01-15' })).rejects.toThrow('Nomor Pinjaman harus diisi')
  const { number } = await L.createLoanSettlement(f.db, { idempotencyKey: 'ls1-create', loan, bank: 'NL-T1-1101', date: '2051-01-15' })
  expect(number).toBe('ELS.2051.01.00001')
  expect(await journal('2051-01-15')).toEqual([...head('15 Jan 2051', number, 'Pelunasan Pinjaman', `Pelunasan Pinjaman ${loan}`),
    ['NL-T1-1201', 'NL-T1 Peralatan', '0', '300.000'], ['NL-T1-4001', 'NL-T1 Pendapatan', '300.000', '0'], ['300.000', '300.000']])
  for (const e of [{ amount: 100000, date: '2051-01-15' }, { date: '2051-01-16' }])
    await expect(L.editLoanSettlement(f.db, number, { idempotencyKey: `ls1-edit-${e.date}${e.amount ?? ''}`, loan, bank: 'NL-T1-1101', ...e } as any)).rejects.toThrow('Sisa Angsuran & Penalty tidak boleh kurang dari Jumlah Pokok Dibayarkan')
  await expect(L.deleteEmployeeLoan(f.db, loan)).rejects.toThrow('Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di')
  await L.deleteLoanSettlement(f.db, number, 'ls1-delete')
  expect(await journal('2051-01-15')).toEqual([])
  const loan2 = loan // balance is back: the installment pays part of it
  const { number: ins } = await L.createLoanInstallment(f.db, { idempotencyKey: 'li1-create', loan: loan2, bank: 'NL-T1-1101', date: '2051-03-15', amount: 100000, description: 'NL-P4-LI1' })
  expect(ins).toBe('ELI.2051.03.00001')
  await L.editLoanInstallment(f.db, ins, { idempotencyKey: 'li1-edit', loan: loan2, bank: 'NL-T1-1101', date: '2051-03-15', amount: 120000, description: 'NL-P4-LI1 edit' })
  expect(await journal('2051-03-15')).toEqual([...head('15 Mar 2051', ins, 'Pembayaran Angsuran', 'NL-P4-LI1 edit'),
    ['NL-T1-1101', 'NL-T1 Kas', '120.000', '0'], ['NL-T1-1201', 'NL-T1 Peralatan', '0', '120.000'], ['120.000', '120.000']])
  await L.deleteLoanInstallment(f.db, ins, 'li1-delete')
  expect(await journal('2051-03-15')).toEqual([])
})

test('Transfer Bank: BT number, Dr destination / Cr source, Accurate\'s messages, edit in place and delete', async () => {
  await open(['110101', 'Kas Kecil', 'CASH_BANK'])
  const T = await import('../src/cash-bank/transfers')
  const t = { date: '2051-01-17', from: 'NL-T1-1101', to: '110101', amount: 100000 }
  await expect(T.createBankTransfer(f.db, { ...t, idempotencyKey: 'bt1-bad', to: '' })).rejects.toThrow('Ke Kas/Bank harus diisi')
  await expect(T.createBankTransfer(f.db, { ...t, idempotencyKey: 'bt1-bad-from', from: '' })).rejects.toThrow('Dari Kas/Bank harus diisi')
  await expect(T.createBankTransfer(f.db, { ...t, idempotencyKey: 'bt1-bad-amt', amount: 0 })).rejects.toThrow('Nilai Transfer harus diisi')
  const { number } = await T.createBankTransfer(f.db, { ...t, idempotencyKey: 'bt1-create', description: 'NL-P4-BT1' })
  expect(number).toBe('BT.2051.01.00001')
  expect(await T.editBankTransfer(f.db, number, { ...t, idempotencyKey: 'bt1-edit', amount: 125000, description: 'NL-P4-BT1 edit' })).toEqual({ number })
  expect(await journal('2051-01-17')).toEqual([...head('17 Jan 2051', number, 'Transfer Bank', 'NL-P4-BT1 edit'),
    ['110101', 'Kas Kecil', '125.000', '0'], ['NL-T1-1101', 'NL-T1 Kas', '0', '125.000'], ['125.000', '125.000']])
  await T.deleteBankTransfer(f.db, number, 'bt1-delete')
  expect(await journal('2051-01-17')).toEqual([])
})
