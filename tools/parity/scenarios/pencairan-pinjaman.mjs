// Kas & Bank > Pencairan Pinjaman: on a loan the scenario creates first; create, edit, save without a loan rejected,
// deleting the disbursed loan refused, delete; journal after edit and after delete; the loan is deleted at the end.
import { accDelete, accFlow, accMessage, accNewForm, accSaveBody, compareFlow, dmy, erpFlow, erpMessage, row, today } from '../lib.mjs';
import { accLoan, erpLoan, IDS, LOAN_MOD } from './_loan.mjs';

const MOD = 'accurate__cash-bank__employee-loan-disbursement';
const loan = { date: '2051-01-13', start: '2051-02-13', description: 'NL-P4-LD1 pinjaman', amount: 300000 };
const inputs = { loan, date: '2051-01-14', bank: 'NL-T1-1101', description: 'NL-P4-LD1', edit: { description: 'NL-P4-LD1 edit' }, reject: { description: 'NL-P4-LD1 tanpa pinjaman' } };
const head = (d, loanId) => ({ 'param.transDate': dmy(inputs.date), 'param.employeeLoanId': loanId, 'param.bankId': IDS.bank, 'param.description': d });

export default {
  title: 'Pencairan Pinjaman', module: 'Kas & Bank', dir: 'kas-bank/pencairan-pinjaman', mod: MOD,
  accuratePath: 'Kas & Bank > Pencairan Pinjaman', erpRoute: 'POST/PUT/DELETE /api/employee-loan-disbursements',
  steps: ['Setup: a 300.000 loan to E.00001 dated 13 Jan 2051 (receivable NL-T1-1201).', 'Disburse it from NL-T1 Kas on 14 Jan 2051.',
    'Edit the disbursement: new description.', 'Read Keseluruhan Jurnal for the day.', 'Save a disbursement without a loan: rejected.',
    'Try to delete the disbursed loan: refused.', 'Delete the disbursement; read the journal and the list again; delete the loan.'],
  inputs,
  accurate: (ctx) => { let lf; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    setup: async (app, log) => { lf = await accNewForm(app, LOAN_MOD); const r = await accSaveBody(app, lf.urls.submit, { ...lf.body, ...accLoan(loan) }); log('setup loan', r?.s, r?.r?.number ?? accMessage(r)); return { loanId: r.r.id } },
    fieldMap: { number: 'number', transDate: 'date', employeeLoan: 'loan', bank: 'bank', description: 'description', disbursementAmount: 'loan amount', branch: 'branch',
      loanAmount: 'loan amount', interestRate: 'loan', installmentType: 'loan', loanDate: 'loan', employeeName: 'loan employee', employeeBank: 'loan', recipientNumber: 'loan', recipientName: 'loan' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], bank: b['param.bankId'] || 'none' }),
    create: (f, x) => head(inputs.description, x.loanId),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description) } },
    reject: { body: () => head(inputs.reject.description, ''), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    beforeDelete: async (app, x, log) => { const r = await accDelete(app, lf.urls.del, x.loanId); log('delete disbursed loan', r?.s, accMessage(r)); return { saved: !!r?.s, message: accMessage(r) } },
    teardown: async (app, x, log) => { const r = await accDelete(app, lf.urls.del, x.loanId); log('teardown loan', r?.s, accMessage(r)) },
  }) },
  erp: (ctx) => { const k = `p4-ld1-${Date.now()}`, base = { bank: inputs.bank, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', bank: 'none' },
    setup: async (send) => ({ loan: (await send('setup loan', ['POST', '/employee-loans', erpLoan(loan)])).body.number }),
    create: (x) => ['POST', '/employee-loan-disbursements', { ...base, idempotencyKey: k, loan: x.loan, description: inputs.description }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/employee-loan-disbursements/${n}`, { ...base, idempotencyKey: k + '-edit', loan: x.loan, description: inputs.edit.description }],
    reject: () => ['POST', '/employee-loan-disbursements', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description }],
    beforeDelete: async (send, x) => { const r = await send('delete disbursed loan', ['DELETE', `/employee-loans/${x.loan}`]); return { saved: r.status < 300, message: erpMessage(r.body) } },
    del: (n) => ['DELETE', `/employee-loan-disbursements/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown loan', ['DELETE', `/employee-loans/${x.loan}`]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e, [row('delete disbursed loan refused', a.extra, e.extra)]),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date is a client default, not an API default.',
    'header fields without an ERP counterpart': 'D2: attachments are not in the ERP.',
  },
};
