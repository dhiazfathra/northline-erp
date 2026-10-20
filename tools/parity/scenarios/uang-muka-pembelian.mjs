// Pembelian > Uang Muka Pembelian: create, edit, zero amount rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { branch, IDS } from './_man.mjs';

const MOD = 'accurate__vendor__purchase-downpayment';
const inputs = { date: '2051-03-12', vendor: 'NL-T3-V1', bill: 'NL-P4-PDP1', dpAccount: '110302', description: 'NL-P4-PDP1', amount: 300000,
  edit: { description: 'NL-P4-PDP1 edit', amount: 330000 }, reject: { description: 'NL-P4-PDP1 nol', bill: 'NL-P4-PDP1-X', amount: 0 } };
const head = (d, bill, amount) => ({ 'param.transDate': dmy(inputs.date), 'param.shipDate': dmy(inputs.date), 'param.dueDate': dmy(inputs.date), 'param.taxDate': dmy(inputs.date), 'param.vendorId': IDS.vendor,
  'param.billNumber': bill, 'param.dpAccountId': IDS.dpAccount, 'param.description': d, 'param.inputDownPayment': amount, 'param.invoiceDp': true });

export default {
  title: 'Uang Muka Pembelian', module: 'Pembelian', dir: 'pembelian/uang-muka-pembelian', mod: MOD,
  accuratePath: 'Pembelian > Uang Muka Pembelian', erpRoute: 'POST/PUT/DELETE /api/purchases/down-payments',
  steps: ['Create an untaxed down payment to NL-T3 Pemasok A, 300.000 to 110302, bill NL-P4-PDP1, dated 12 Mar 2051.', 'Edit it: new description, 330.000.',
    'Read Keseluruhan Jurnal for the day.', 'Save a down payment of 0: rejected.', 'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    fieldMap: { number: 'number', billNumber: 'bill', vendor: 'vendor', transDate: 'date', description: 'description', inputDownPayment: 'amount', dpAccount: 'dpAccount', branch: 'branch',
      apAccount: 'vendor AP account', currency: 'vendor currency', dueDate: 'date', shipDate: 'date' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], taxable: b['param.taxable'] ?? false, branch: branch(b) }),
    create: () => head(inputs.description, inputs.bill, inputs.amount),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.inputDownPayment(a.amount) } },
    reject: { body: () => head(inputs.reject.description, inputs.reject.bill, 0),
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-pdp1-${Date.now()}`, base = { vendor: inputs.vendor, date: inputs.date, dpAccount: inputs.dpAccount }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', taxable: false, branch: 'none (no branch)' },
    create: () => ['POST', '/purchases/down-payments', { ...base, idempotencyKey: k, bill: inputs.bill, description: inputs.description, amount: inputs.amount }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/purchases/down-payments/${n}`, { ...base, idempotencyKey: k + '-edit', bill: inputs.bill, description: inputs.edit.description, amount: inputs.edit.amount }],
    reject: () => ['POST', '/purchases/down-payments', { ...base, idempotencyKey: k + '-bad', bill: inputs.reject.bill, description: inputs.reject.description, amount: 0 }],
    del: (n) => ['DELETE', `/purchases/down-payments/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: see the list; attachments, comments, custom fields, PO number, shipping, payment term, taxes on the down payment and print state are not in the ERP.',
  },
};
