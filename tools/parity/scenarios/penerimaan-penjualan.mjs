// Penjualan > Penerimaan Penjualan: on an invoice the scenario creates first; create, edit, save without invoices rejected,
// delete; journal after edit and after delete; the invoice is deleted at the end.
import { accFlow, compareFlow, dmy, erp, erpFlow, today } from '../lib.mjs';
import { accInvoice, accInvoiceTeardown, erpInvoice, IDS } from './_invoice.mjs';

const MOD = 'accurate__customer__sales-receipt';
const invoice = { date: '2051-02-04', description: 'NL-P4-SR1 faktur', qty: 1, price: 300000 };
const inputs = { invoice, date: '2051-02-05', bank: 'NL-T1-1101', customer: 'NL-T2-C1', description: 'NL-P4-SR1', amount: 300000,
  edit: { description: 'NL-P4-SR1 edit', amount: 250000 }, reject: { description: 'NL-P4-SR1 tanpa faktur' } };
const head = (d, amount) => ({ 'param.transDate': dmy(inputs.date), 'param.chequeDate': dmy(inputs.date), 'param.customerId': IDS.customer, 'param.bankId': IDS.bank, 'param.description': d, 'param.chequeAmount': amount,
  'param.typeAutoNumber': 400 }); // the bank's own auto-number (NL-T1 Kas), which the form picks when the bank is chosen
const row = (invoiceId, amount) => ({ 'param.detailInvoice[0].invoiceId': invoiceId, 'param.detailInvoice[0].paymentAmount': amount, 'param.detailInvoice[0].invoicePayment': amount, 'param.detailInvoice[0].seq': 1, 'param.detailInvoice[0]._status': 'insert' });

export default {
  title: 'Penerimaan Penjualan', module: 'Penjualan', dir: 'penjualan/penerimaan-penjualan', mod: MOD,
  accuratePath: 'Penjualan > Penerimaan Penjualan', erpRoute: 'POST/PUT/DELETE /api/sales/receipts',
  steps: ['Setup: an untaxed invoice to NL-T2 Pelanggan A dated 04 Feb 2051, NL-T2 Jasa Konsultasi 1 x 300.000.',
    'Receive 300.000 on it into NL-T1 Kas on 05 Feb 2051.', 'Edit the receipt: new description, 250.000.', 'Read Keseluruhan Jurnal for the day.',
    'Save a receipt without invoices: rejected.', 'Delete the receipt; read the journal and the list again; delete the invoice.'],
  inputs,
  accurate: (ctx) => { let x0; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailInvoice',
    setup: async (app, log) => (x0 = await accInvoice(app, log, invoice)),
    fieldMap: { number: 'number', transDate: 'date', customer: 'customer', bank: 'bank', description: 'description', chequeAmount: 'amount', chequeNo: 'cheque.no', chequeDate: 'cheque.date', paymentMethod: 'cheque (payment method)',
      rate: 'rate', currency: 'customer currency', pphDueDate: 'payments[].pph', cutSalesPph: 'payments[].pph', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], bank: b['param.bankId'] || 'none', paymentMethod: b['param.paymentMethod'], branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: (f, x) => ({ ...head(inputs.description, inputs.amount), ...row(x.invoiceId, inputs.amount) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.chequeAmount?.(a.amount); fd.detailInvoice(fd.detailInvoice().map((r) => ({ ...r, paymentAmount: a.amount, invoicePayment: a.amount, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description, inputs.amount), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    teardown: (app, x, log) => accInvoiceTeardown(app, log, x),
  }) },
  erp: (ctx) => { const k = `p4-sr1-${Date.now()}`, base = { customer: inputs.customer, bank: inputs.bank, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', bank: 'required', paymentMethod: 'cash unless a cheque is sent', branch: 'none (no branch)' },
    setup: async (send) => ({ invoice: (await send('setup invoice', erpInvoice(invoice))).body.number }),
    create: (x) => ['POST', '/sales/receipts', { ...base, idempotencyKey: k, description: inputs.description, payments: [{ invoice: x.invoice, amount: inputs.amount }] }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/sales/receipts/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, payments: [{ invoice: x.invoice, amount: inputs.edit.amount }] }],
    reject: () => ['POST', '/sales/receipts', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, payments: [] }],
    del: (n) => ['DELETE', `/sales/receipts/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown invoice', ['DELETE', `/sales/invoices/${x.invoice}`, { idempotencyKey: k + '-si-del' }]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, the payment method and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, void-cheque, reconciliation, fiscal-payment, credit and overpay-return flags, cashier and e-payment state are not in the ERP.',
  },
};
