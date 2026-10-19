// Buku Besar > Pinjaman Karyawan: create, edit, save without employee rejected, delete. A loan posts no journal.
import { accFlow, compareFlow, erpFlow, today } from '../lib.mjs';
import { accLoan, erpLoan, LOAN_MOD } from './_loan.mjs';

const inputs = { date: '2051-01-12', start: '2051-02-12', employee: 'E.00001', description: 'NL-P4-L1', amount: 300000, receivableAccount: 'NL-T1-1201',
  edit: { description: 'NL-P4-L1 edit', amount: 360000 }, reject: { description: 'NL-P4-L1 tanpa karyawan' } };

export default {
  title: 'Pinjaman Karyawan', module: 'Buku Besar', dir: 'buku-besar/pinjaman-karyawan', mod: LOAN_MOD,
  accuratePath: 'Buku Besar > Pinjaman Karyawan', erpRoute: 'POST/PUT/DELETE /api/employee-loans',
  steps: ['Create a 300.000 interest-free loan to E.00001 Karyawan Produksi (receivable NL-T1-1201), dated 12 Jan 2051.', 'Edit it: new description, 360.000.',
    'Read Keseluruhan Jurnal for the day (a loan posts nothing until it is disbursed).', 'Save a loan without an employee: rejected.', 'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: LOAN_MOD, date: inputs.date, keyword: inputs.description,
    fieldMap: { number: 'number', transDate: 'date', employee: 'employee', loanAmount: 'amount', interestRate: 'interestRate', description: 'description', receivableAccount: 'receivableAccount', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], installmentType: b['param.installmentType'], interestRate: b['param.interestRate'] }),
    create: () => accLoan(inputs),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.loanAmount(a.amount) } },
    reject: { body: () => accLoan({ ...inputs, description: inputs.reject.description, employeeId: '' }),
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', installmentType: 'none (no schedule)', interestRate: 0 },
    create: () => ['POST', '/employee-loans', erpLoan(inputs)],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/employee-loans/${n}`, erpLoan({ ...inputs, ...inputs.edit })],
    reject: () => ['POST', '/employee-loans', { ...erpLoan({ ...inputs, description: inputs.reject.description }), employee: '' }],
    del: (n) => ['DELETE', `/employee-loans/${n}`],
    list: () => '/reports/employee-loans/list',
  }),
  compare: (a, e) => compareFlow(a, e),
  // Stop rule (docs/goals/full-parity-v2.md): the edit's form shape was not found in 3 attempts. The form's wire with a new
  // amount and description, and with the description alone, is refused ("Karyawan ... Masih Memiliki Pinjaman Yang Belum Lunas",
  // the loan counted against itself); the form's own Simpan on the reopened loan stops at "Nama Bank harus diisi" (the
  // bank-name lookup does not resolve the wire's text). Create, rejected save, delete and the list compare as recorded below.
  stopped: 'Accurate edit shape not found after 3 attempts',
  stoppedNote: 'Stop rule (docs/goals/full-parity-v2.md): the edit\'s form shape was not found in 3 attempts. The form\'s wire with a new amount and description, and with the description alone, is refused ("Karyawan ... Masih Memiliki Pinjaman Yang Belum Lunas", the loan counted against itself); the form\'s own Simpan on the reopened loan stops at "Nama Bank harus diisi" (the bank-name lookup does not resolve the text the wire saved). Create, the rejected save, delete and the list compare as below; on the Accurate side "number kept on edit" and "journal after edit" show the unedited loan. See ADR-0041.',
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date is a client default, not an API default.',
    'header fields without an ERP counterpart': 'D3: the ERP loan has no installment schedule (duration, start date, installment type), interest or penalty accounts, employee bank details or employee fee yet (ADR-0041).',
  },
};
