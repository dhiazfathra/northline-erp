// P4.2 batch 1 (docs/parity): the edit/delete commands added for Pembayaran/Penerimaan, Uang Muka Penjualan, Pinjaman
// Karyawan and Pencairan Pinjaman, with the same inputs as the scenario scripts (tools/parity/scenarios) and the journals
// and messages Accurate printed for them (Manufaktur Demo, 2051).
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createCashDocument, deleteCashDocument, editCashDocument } from '../src/cash-bank/service'
import { handle } from '../src/ledger/handler'
import * as L from '../src/payroll/loans'
import { catchUp, ledgerProjection } from '../src/projections'
import { queryGeneralLedger } from '../src/reports/queries'
import { createSalesDownPayment, createSalesInvoice, deleteSalesDownPayment, editSalesDownPayment, upsertCustomer, upsertItem } from '../src/sales/service'
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
  expect(await L.editEmployeeLoan(f.db, loan, { employee: 'E.00001', date: '2051-01-13', amount: 360000, description: 'NL-P4-LD1 edit' })).toEqual({ number: loan })
  expect(await L.deleteEmployeeLoan(f.db, loan)).toEqual({ number: loan })
})
