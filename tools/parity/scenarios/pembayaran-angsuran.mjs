// Kas & Bank > Pembayaran Angsuran: Accurate lists only installments due by today's server date (search-outstanding-loan-installment.do
// takes no date: keywords '', 'N', loan number and name all returned 0 rows for a disbursed 2051 loan, ADR-0045), so the form cannot be
// filled with 2051 data. The Accurate side records the new form and the empty lookup; the ERP side runs the full flow.
import { accNewForm, accSaveBody, accDelete, accMessage, accShot, accSearch, compareFlow, dmy, erpFlow, erpMessage, row } from '../lib.mjs';
import { call } from '../../accurate/call.mjs';
import { accLoan, erpLoan, IDS, LOAN_MOD } from './_loan.mjs';

const MOD = 'accurate__cash-bank__employee-loan-installment', DIS = 'accurate__cash-bank__employee-loan-disbursement';
const loan = { date: '2051-01-13', start: '2051-02-13', description: 'NL-P4-LI1 pinjaman', amount: 300000 };
const inputs = { loan, disbursed: '2051-01-14', date: '2051-03-15', bank: 'NL-T1-1101', amount: 100000, description: 'NL-P4-LI1', edit: { amount: 120000 } };

export default {
  title: 'Pembayaran Angsuran', module: 'Kas & Bank', dir: 'kas-bank/pembayaran-angsuran', mod: MOD,
  accuratePath: 'Kas & Bank > Pembayaran Angsuran', erpRoute: 'POST/PUT/DELETE /api/employee-loan-installments', adrs: ['ADR-0041', 'ADR-0045'],
  steps: ['Setup: a 300.000 loan to E.00001 dated 13 Jan 2051, disbursed 14 Jan 2051.', 'Accurate: open a new form, look the loan up (empty: no installment is due by today).',
    'ERP: pay 100.000 of it on 15 Mar 2051; edit to 120.000; save without a loan rejected; delete; journal and list; delete the disbursement and the loan.'],
  inputs,
  accurate: async ({ app, log, shot }) => {
    const lf = await accNewForm(app, LOAN_MOD), df = await accNewForm(app, DIS), f = await accNewForm(app, MOD); let loanId, disId;
    log('new form', Object.keys(f.body).length, 'keys', f.urls);
    try {
      const r = await accSaveBody(app, lf.urls.submit, { ...lf.body, ...accLoan(loan) }); loanId = r.r.id; log('setup loan', r.r.number);
      const d = await accSaveBody(app, df.urls.submit, { ...df.body, 'param.transDate': dmy(inputs.disbursed), 'param.employeeLoanId': loanId, 'param.bankId': IDS.bank, 'param.description': inputs.description + ' cair' }); disId = d.r.id; log('setup disbursement', d.r.number);
      const looked = [];
      for (const kw of ['', 'NL', r.r.number, 'Karyawan Produksi']) looked.push((await call(app, '/accurate/cash-bank/search-outstanding-loan-installment.do', { keywords: kw, 'sp.pageSize': 20 }))?.d?.length ?? -1);
      log('outstanding installments by keyword', looked);
      for (const s of ['create', 'edit', 'reject', 'delete', 'journal']) await accShot(app, shot(s), { mod: MOD });
      return { lookup: looked, fields: [], defaults: { date: 'today' } };
    } finally { if (disId) log('teardown disbursement', accMessage(await accDelete(app, df.urls.del, disId))); if (loanId) log('teardown loan', accMessage(await accDelete(app, lf.urls.del, loanId))) }
  },
  erp: (ctx) => { const k = `p4-li1-${Date.now()}`, base = { bank: inputs.bank, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required' },
    setup: async (send) => { const l = (await send('setup loan', ['POST', '/employee-loans', erpLoan(loan)])).body.number;
      const d = (await send('setup disbursement', ['POST', '/employee-loan-disbursements', { idempotencyKey: k + '-dis', loan: l, bank: inputs.bank, date: inputs.disbursed, description: inputs.description + ' cair' }])).body.number; return { loan: l, dis: d } },
    create: (x) => ['POST', '/employee-loan-installments', { ...base, idempotencyKey: k, loan: x.loan, amount: inputs.amount, description: inputs.description }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/employee-loan-installments/${n}`, { ...base, idempotencyKey: k + '-edit', loan: x.loan, amount: inputs.edit.amount, description: inputs.description + ' edit' }],
    reject: () => ['POST', '/employee-loan-installments', { ...base, idempotencyKey: k + '-bad', amount: inputs.amount }],
    del: (n) => ['DELETE', `/employee-loan-installments/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown disbursement', ['DELETE', `/employee-loan-disbursements/${x.dis}`, { idempotencyKey: k + '-deldis' }]); await send('teardown loan', ['DELETE', `/employee-loans/${x.loan}`]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => [row('create/edit/delete on 2051 data', 'not possible: the loan lookup lists installments due by today\'s server date; 0 rows for keywords ' + JSON.stringify(a.lookup), `numbering ${e.number}, edit ${e.edit}, reject "${e.reject.message}", delete ${e.deleted}, journal after edit ${JSON.stringify(e.journal)}`, false),
    row('list/search after delete', 'n/a', e.listedAfter, false)],
  accepted: {
    'create/edit/delete on 2051 data': 'D6: the Accurate form can only be filled with installments due by today; a 2051 loan has none, and posting a 2026 loan is outside the 2051 sandbox rule. The ERP behaves as Pelunasan Pinjaman (Dr bank / Cr Piutang Karyawan) with the amount paid; unverified against Accurate (ADR-0045).',
    'list/search after delete': 'D6: see above.',
  },
};
