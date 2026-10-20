// Buku Besar > Pinjaman Karyawan: create, edit, save without employee rejected, delete. A loan posts no journal.
import { accFlow, compareFlow, erpFlow, today } from '../lib.mjs';
import { accLoan, erpLoan, LOAN_MOD } from './_loan.mjs';

const inputs = { date: '2051-01-12', start: '2051-02-12', employee: 'E.00001', description: 'NL-P4-L1', amount: 300000, receivableAccount: 'NL-T1-1201',
  edit: { description: 'NL-P4-L1 edit', amount: 360000 }, reject: { description: 'NL-P4-L1 tanpa karyawan' } };

export default {
  title: 'Pinjaman Karyawan', module: 'Buku Besar', dir: 'buku-besar/pinjaman-karyawan', mod: LOAN_MOD,
  accuratePath: 'Buku Besar > Pinjaman Karyawan', erpRoute: 'POST/PUT/DELETE /api/employee-loans', adrs: ['ADR-0041', 'ADR-0045'],
  steps: ['Create a 300.000 interest-free loan to E.00001 Karyawan Produksi (receivable NL-T1-1201), dated 12 Jan 2051.', 'Edit it: new description, 360.000 (Accurate refuses: the employee still owes this loan).',
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
  // Accurate refuses every save of a loan while its employee has a loan with a balance left, the loan being saved included
  // ("Karyawan ... Masih Memiliki Pinjaman Yang Belum Lunas"); the edit is refused the same way on the form's own Simpan with Nama Bank
  // filled in (ADR-0045), and a second loan for the employee is refused. The ERP does the same, so the edit step compares as a refusal.
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date is a client default, not an API default.',
    'header fields without an ERP counterpart': 'D3: the ERP loan has no installment schedule (duration, start date, installment type), interest or penalty accounts, employee bank details or employee fee yet (ADR-0041).',
  },
};
