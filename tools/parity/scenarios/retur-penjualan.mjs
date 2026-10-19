// Penjualan > Retur Penjualan: against an invoice the scenario creates first; create, edit, save without lines rejected,
// delete; journal after edit and after delete; the invoice is deleted at the end.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { accInvoice, accInvoiceTeardown, erpInvoice, IDS } from './_invoice.mjs';

const MOD = 'accurate__customer__sales-return';
const invoice = { date: '2051-02-06', description: 'NL-P4-RT1 faktur', qty: 2, price: 100000 };
const inputs = { invoice, date: '2051-02-07', customer: 'NL-T2-C1', description: 'NL-P4-RT1', lines: [{ item: 'NL-T2-S1', qty: 1, price: 100000 }],
  edit: { description: 'NL-P4-RT1 edit', qty: 2 }, reject: { description: 'NL-P4-RT1 tanpa rincian' } };
const head = (d, x) => ({ 'param.transDate': dmy(inputs.date), 'param.taxDate': dmy(inputs.date), 'param.customerId': IDS.customer, 'param.invoiceId': x.invoiceId, 'param.returnType': 'INVOICE', 'param.description': d });
const rows = (x, lines) => Object.assign({}, ...lines.map((l, i) => { const p = `param.detailItem[${i}].`;
  return { [p + 'itemId']: IDS.item, [p + 'itemUnitId']: IDS.unit, [p + 'detailName']: 'NL-T2 Jasa Konsultasi', [p + 'quantity']: l.qty, [p + 'unitPrice']: l.price, [p + 'totalPrice']: l.qty * l.price,
    [p + 'salesInvoiceDetailId']: x.invoiceRowId, [p + 'returnDetailStatusType']: 'RETURNED', [p + 'seq']: i + 1, [p + '_status']: 'insert' } }));

export default {
  title: 'Retur Penjualan', module: 'Penjualan', dir: 'penjualan/retur-penjualan', mod: MOD,
  accuratePath: 'Penjualan > Retur Penjualan', erpRoute: 'POST/PUT/DELETE /api/sales/returns',
  steps: ['Setup: an untaxed invoice to NL-T2 Pelanggan A dated 06 Feb 2051, NL-T2 Jasa Konsultasi 2 x 100.000.',
    'Return 1 of it on 07 Feb 2051.', 'Edit the return: new description, quantity 2.', 'Read Keseluruhan Jurnal for the day.',
    'Save a return without lines: rejected.', 'Delete the return; read the journal and the list again; delete the invoice.'],
  inputs,
  accurate: (ctx) => { let x0; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    setup: async (app, log) => (x0 = await accInvoice(app, log, invoice)),
    fieldMap: { number: 'number', transDate: 'date', customer: 'customer (from the invoice)', invoice: 'invoice', returnType: 'invoice (returns are against an invoice)', description: 'description', rate: 'rate', fiscalRate: 'rate',
      currency: 'customer currency', taxable: 'invoice tax', inclusiveTax: 'invoice tax', taxDate: 'invoice tax', taxNumber: 'invoice tax', documentCode: 'invoice tax', taxType: 'invoice tax', cashDiscPercent: 'invoice discount', cashDiscount: 'invoice discount', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], returnType: b['param.returnType'], branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: (f, x) => ({ ...head(inputs.description, x), ...rows(x, inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, totalPrice: a.qty * r.unitPrice, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description, x0), // against the same invoice, no lines
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    teardown: (app, x, log) => accInvoiceTeardown(app, log, x),
  }) },
  erp: (ctx) => { const k = `p4-rt1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', returnType: 'INVOICE (always against an invoice)', branch: 'none (no branch)' },
    setup: async (send) => ({ invoice: (await send('setup invoice', erpInvoice(invoice))).body.number }),
    create: (x) => ['POST', '/sales/returns', { idempotencyKey: k, invoice: x.invoice, date: inputs.date, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/sales/returns/${n}`, { idempotencyKey: k + '-edit', invoice: x.invoice, date: inputs.date, description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: (x) => ['POST', '/sales/returns', { idempotencyKey: k + '-bad', invoice: x.invoice, date: inputs.date, description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/sales/returns/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown invoice', ['DELETE', `/sales/invoices/${x.invoice}`, { idempotencyKey: k + '-si-del' }]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, delivery-order returns, shipping address, down-payment return, cashier/POS and print state are not in the ERP.',
  },
};
