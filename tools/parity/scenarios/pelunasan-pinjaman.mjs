// Kas & Bank > Pelunasan Pinjaman: on a disbursed loan the scenario creates first; settle it (the whole balance), edit the description,
// save without a loan rejected, delete the settled loan refused, delete; journal after edit and delete; loan and disbursement are deleted at the end.
import { accDelete, accFlow, accMessage, accNewForm, accSaveBody, compareFlow, dmy, erpFlow, erpMessage, row, today } from '../lib.mjs';
import { accLoan, erpLoan, IDS, LOAN_MOD } from './_loan.mjs';

const MOD = 'accurate__cash-bank__employee-loan-settlement', DIS = 'accurate__cash-bank__employee-loan-disbursement';
const loan = { date: '2051-01-13', start: '2051-02-13', description: 'NL-P4-LS1 pinjaman', amount: 300000 };
const inputs = { loan, disbursed: '2051-01-14', date: '2051-01-15', bank: 'NL-T1-1101', description: 'NL-P4-LS1', edit: { amount: 100000 }, reject: { date: '2051-01-15' } };
// the form has no description field (formData: employeeLoan, bank, transDate, penalty, amounts)
const head = (loanId) => ({ 'param.transDate': dmy(inputs.date), 'param.employeeLoanId': loanId, 'param.bankId': IDS.bank });

export default {
  title: 'Pelunasan Pinjaman', module: 'Kas & Bank', dir: 'kas-bank/pelunasan-pinjaman', mod: MOD,
  accuratePath: 'Kas & Bank > Pelunasan Pinjaman', erpRoute: 'POST/PUT/DELETE /api/employee-loan-settlements', adrs: ['ADR-0041', 'ADR-0045'],
  steps: ['Setup: a 300.000 loan to E.00001 dated 13 Jan 2051, disbursed from NL-T1 Kas on 14 Jan 2051.', 'Settle it from NL-T1 Kas on 15 Jan 2051 (the whole balance).',
    'Edit the settlement: pay 100.000 in cash (the rest of the balance stays on the penalty income account).', 'Read Keseluruhan Jurnal for the day.', 'Save a settlement without a loan: rejected.',
    'Try to delete the settled loan: refused.', 'Delete the settlement; read the journal and the list again; delete the disbursement and the loan.'],
  inputs,
  accurate: (ctx) => { let lf, df; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, 
    setup: async (app, log) => { lf = await accNewForm(app, LOAN_MOD); df = await accNewForm(app, DIS);
      const r = await accSaveBody(app, lf.urls.submit, { ...lf.body, ...accLoan(loan) }); log('setup loan', r?.s, r?.r?.number ?? accMessage(r));
      const d = await accSaveBody(app, df.urls.submit, { ...df.body, 'param.transDate': dmy(inputs.disbursed), 'param.employeeLoanId': r.r.id, 'param.bankId': IDS.bank, 'param.description': inputs.description + ' cair' });
      log('setup disbursement', d?.s, d?.r?.number ?? accMessage(d)); return { loanId: r.r.id, disId: d.r.id } },
    fieldMap: { number: 'number', transDate: 'date', employeeLoan: 'loan', bank: 'bank', description: 'description', branch: 'branch', employeeName: 'loan employee', latestInstallment: 'loan', settlementAmount: 'balance of the loan (computed)' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], bank: b['param.bankId'] || 'none', penalty: b['param.settlementPenaltyAmount'] }),
    create: (f, x) => head(x.loanId),
    edit: { arg: { amount: inputs.edit.amount }, mutate: (fd, a) => { fd.settlementAmount(a.amount) } },
    reject: { body: () => head(''), ui: { arg: () => ({ date: dmy(inputs.reject.date) }), mutate: (fd, a) => { fd.transDate(a.date) } } },
    beforeDelete: async (app, x, log) => { const r = await accDelete(app, lf.urls.del, x.loanId); log('delete settled loan', r?.s, accMessage(r)); return { saved: !!r?.s, message: accMessage(r) } },
    teardown: async (app, x, log) => { const d = await accDelete(app, df.urls.del, x.disId); log('teardown disbursement', d?.s, accMessage(d)); const r = await accDelete(app, lf.urls.del, x.loanId); log('teardown loan', r?.s, accMessage(r)) },
  }) },
  erp: (ctx) => { const k = `p4-ls1-${Date.now()}`, base = { bank: inputs.bank, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', bank: 'none', penalty: 0 },
    setup: async (send) => { const l = (await send('setup loan', ['POST', '/employee-loans', erpLoan(loan)])).body.number;
      const d = (await send('setup disbursement', ['POST', '/employee-loan-disbursements', { idempotencyKey: k + '-dis', loan: l, bank: inputs.bank, date: inputs.disbursed, description: inputs.description + ' cair' }])).body.number; return { loan: l, dis: d } },
    create: (x) => ['POST', '/employee-loan-settlements', { ...base, idempotencyKey: k, loan: x.loan }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/employee-loan-settlements/${n}`, { ...base, amount: inputs.edit.amount, idempotencyKey: k + '-edit', loan: x.loan }],
    reject: () => ['POST', '/employee-loan-settlements', { ...base, idempotencyKey: k + '-bad' }],
    beforeDelete: async (send, x) => { const r = await send('delete settled loan', ['DELETE', `/employee-loans/${x.loan}`]); return { saved: r.status < 300, message: erpMessage(r.body) } },
    del: (n) => ['DELETE', `/employee-loan-settlements/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown disbursement', ['DELETE', `/employee-loan-disbursements/${x.dis}`, { idempotencyKey: k + '-deldis' }]); await send('teardown loan', ['DELETE', `/employee-loans/${x.loan}`]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e, [row('delete settled loan refused', a.extra, e.extra)]),
  accepted: {
    'journal after edit': 'D4: Accurate prints a 0/0 line on the cash/bank account when the cash paid is 0; the ERP posts no zero line. Every other line and amount matches.',
    'validation message': 'D5: Accurate\'s client check says "Nomor Pinjaman harus diisi" (the ERP\'s text); a raw wire without a loan gets a generic server error page.',
    defaults: 'D1: the API takes every value explicitly; today\'s date is a client default, not an API default.',
    'header fields without an ERP counterpart': 'D2: attachments and the settlement penalty (settlementPenaltyAmount, the loan\'s penalty income account) are not in the ERP settlement.',
  },
};
