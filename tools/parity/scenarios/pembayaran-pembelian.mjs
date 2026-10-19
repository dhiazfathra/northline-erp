// Pembelian > Pembayaran Pembelian: on a purchase invoice the scenario creates first; create, edit, save without invoices
// rejected, delete; journal after edit and after delete; the invoice is deleted at the end.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { accPurchaseInvoice, accPurchaseInvoiceTeardown, erpPurchaseInvoice, IDS } from './_pinvoice.mjs';

const MOD = 'accurate__vendor__purchase-payment';
const invoice = { date: '2051-03-02', bill: 'NL-P4-PP1-B', description: 'NL-P4-PP1 faktur', qty: 1, price: 300000 };
const inputs = { invoice, date: '2051-03-03', bank: 'NL-T1-1101', vendor: 'NL-T3-V1', description: 'NL-P4-PP1', amount: 300000,
  edit: { description: 'NL-P4-PP1 edit', amount: 250000 }, reject: { description: 'NL-P4-PP1 tanpa faktur' } };
const head = (d, amount) => ({ 'param.transDate': dmy(inputs.date), 'param.chequeDate': dmy(inputs.date), 'param.vendorId': IDS.vendor, 'param.bankId': IDS.bank, 'param.description': d, 'param.chequeAmount': amount,
  'param.typeAutoNumber': 400 }); // the bank's own auto-number (NL-T1 Kas), which the form picks when the bank is chosen
const line = (invoiceId, amount) => ({ 'param.detailInvoice[0].invoiceId': invoiceId, 'param.detailInvoice[0].paymentAmount': amount, 'param.detailInvoice[0].invoicePayment': amount, 'param.detailInvoice[0].seq': 1, 'param.detailInvoice[0]._status': 'insert' });

export default {
  title: 'Pembayaran Pembelian', module: 'Pembelian', dir: 'pembelian/pembayaran-pembelian', mod: MOD,
  accuratePath: 'Pembelian > Pembayaran Pembelian', erpRoute: 'POST/PUT/DELETE /api/purchases/payments',
  steps: ['Setup: an untaxed purchase invoice from NL-T3 Pemasok A dated 02 Mar 2051, NL-T2 Jasa Konsultasi 1 x 300.000.',
    'Pay 300.000 on it from NL-T1 Kas on 03 Mar 2051.', 'Edit the payment: new description, 250.000.', 'Read Keseluruhan Jurnal for the day.',
    'Save a payment without invoices (amount 0; the ERP takes no cheque amount): rejected.', 'Delete the payment; read the journal and the list again; delete the invoice.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailInvoice',
    setup: (app, log) => accPurchaseInvoice(app, log, invoice),
    fieldMap: { number: 'number', transDate: 'date', vendor: 'vendor', bank: 'bank', description: 'description', chequeAmount: 'amount', chequeNo: 'cheque (not modelled)', chequeDate: 'date',
      paymentMethod: 'payment method (not modelled)', rate: 'rate', currency: 'vendor currency', pphDueDate: 'payments[].pph', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], bank: b['param.bankId'] || 'none', paymentMethod: b['param.paymentMethod'], branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: (f, x) => ({ ...head(inputs.description, inputs.amount), ...line(x.invoiceId, inputs.amount) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.chequeAmount?.(a.amount); fd.detailInvoice(fd.detailInvoice().map((r) => ({ ...r, paymentAmount: a.amount, invoicePayment: a.amount, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description, 0), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    teardown: (app, x, log) => accPurchaseInvoiceTeardown(app, log, x),
  }),
  erp: (ctx) => { const k = `p4-pp1-${Date.now()}`, base = { vendor: inputs.vendor, bank: inputs.bank, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', bank: 'required', paymentMethod: 'none (not modelled)', branch: 'none (no branch)' },
    setup: async (send) => ({ invoice: (await send('setup invoice', erpPurchaseInvoice(invoice))).body.number }),
    create: (x) => ['POST', '/purchases/payments', { ...base, idempotencyKey: k, description: inputs.description, payments: [{ invoice: x.invoice, amount: inputs.amount }] }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/purchases/payments/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, payments: [{ invoice: x.invoice, amount: inputs.edit.amount }] }],
    reject: () => ['POST', '/purchases/payments', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, payments: [] }],
    del: (n) => ['DELETE', `/purchases/payments/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown invoice', ['DELETE', `/purchases/invoices/${x.invoice}`, { idempotencyKey: k + '-pi-del' }]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, the payment method and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, cheque number and payment method, void-cheque, reconciliation and e-payment state are not in the ERP.',
  },
};
