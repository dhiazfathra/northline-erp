// Penjualan > Uang Muka Penjualan: create, edit, zero amount rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__customer__sales-downpayment';
const IDS = { customer: 350, dpAccount: 59 }; // NL-T2-C1, 210102 Uang Muka Penjualan IDR
const inputs = { date: '2051-01-10', customer: 'NL-T2-C1', dpAccount: '210102', description: 'NL-P4-DP1', amount: 500000,
  edit: { description: 'NL-P4-DP1 edit', amount: 550000 }, reject: { description: 'NL-P4-DP1 nol', amount: 0 } };
const head = (d, amount) => ({ 'param.transDate': dmy(inputs.date), 'param.shipDate': dmy(inputs.date), 'param.dueDate': dmy(inputs.date), 'param.customerId': IDS.customer,
  'param.dpAccountId': IDS.dpAccount, 'param.description': d, 'param.inputDownPayment': amount, 'param.invoiceDp': true });

export default {
  title: 'Uang Muka Penjualan', module: 'Penjualan', dir: 'penjualan/uang-muka-penjualan', mod: MOD,
  accuratePath: 'Penjualan > Uang Muka Penjualan', erpRoute: 'POST/PUT/DELETE /api/sales/down-payments',
  steps: ['Create an untaxed down payment from NL-T2 Pelanggan A, 500.000 to 210102, dated 10 Jan 2051.', 'Edit it: new description, 550.000.',
    'Read Keseluruhan Jurnal for the day.', 'Save a down payment of 0: rejected.', 'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    fieldMap: { number: 'number', customer: 'customer', transDate: 'date', description: 'description', inputDownPayment: 'amount', dpAccount: 'dpAccount', branch: 'branch',
      arAccount: 'customer AR account', currency: 'customer currency', dueDate: 'date', shipDate: 'date' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], taxable: b['param.taxable'] ?? false, branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: () => head(inputs.description, inputs.amount),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.inputDownPayment(a.amount) } },
    reject: { body: () => head(inputs.reject.description, 0),
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-dp1-${Date.now()}`, base = { customer: inputs.customer, date: inputs.date, dpAccount: inputs.dpAccount }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', taxable: false, branch: 'none (no branch)' },
    create: () => ['POST', '/sales/down-payments', { ...base, idempotencyKey: k, description: inputs.description, amount: inputs.amount }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/sales/down-payments/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, amount: inputs.edit.amount }],
    reject: () => ['POST', '/sales/down-payments', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, amount: 0 }],
    del: (n) => ['DELETE', `/sales/down-payments/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, PO number, shipping, taxes on the down payment, sales-order link and retail buyer identity are not in the ERP.',
  },
};
