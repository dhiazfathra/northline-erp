// Penjualan > Faktur Penjualan (service item, untaxed): create, edit, save without lines rejected, delete; journal after edit and after delete.
import { call } from '../../accurate/call.mjs';
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__customer__sales-invoice';
const IDS = { customer: 350, item: 300 }; // NL-T2-C1, NL-T2-S1 in Manufaktur Demo
const inputs = { date: '2051-01-09', customer: 'NL-T2-C1', description: 'NL-P4-SI1', lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty: 2, price: 100000 }],
  edit: { description: 'NL-P4-SI1 edit', qty: 3 }, reject: { description: 'NL-P4-SI1 tanpa rincian' } };
const json = (f, o) => ({ _param: JSON.stringify({ ...JSON.parse(f.body._param), ...o }) });

export default {
  title: 'Faktur Penjualan', module: 'Penjualan', dir: 'penjualan/faktur-penjualan', mod: MOD,
  accuratePath: 'Penjualan > Faktur Penjualan', erpRoute: 'POST/PUT/DELETE /api/sales/invoices',
  steps: ['Create an untaxed invoice to NL-T2 Pelanggan A: NL-T2 Jasa Konsultasi 2 x 100.000, dated 09 Jan 2051.',
    'Edit it: new description, quantity 3.', 'Read Keseluruhan Jurnal for the day.', 'Save an invoice without lines: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    setup: async (app, log) => { const d = (await call(app, '/accurate/inventory/detail-item.do', { id: IDS.item })).d; log('item unit', d?.unit1Id, d?.unit1?.name); return { unitId: d?.unit1Id ?? d?.unit1?.id } },
    fieldMap: { number: 'number', customer: 'customer', transDate: 'date', dueDate: 'dueDate', description: 'description', taxable: 'taxable', taxNumber: 'taxNumber', cashDiscPercent: 'discPct',
      invoiceDiscountAccount: 'discountAccount', rate: 'rate', branch: 'branch', paymentTerm: 'dueDate (term)', arAccount: 'customer AR account', currency: 'customer currency' },
    defaults: (b) => { const p = JSON.parse(b._param); return { date: p.transDate === today() ? 'today' : p.transDate, taxable: p.taxable, branch: p.branchId === 50 ? 'Kantor Pusat' : p.branchId } },
    create: (f, x) => json(f, { transDate: dmy(inputs.date), shipDate: dmy(inputs.date), dueDate: dmy(inputs.date), customerId: IDS.customer, description: inputs.description,
      detailItem: inputs.lines.map((l, i) => ({ _status: 'insert', seq: i + 1, itemId: IDS.item, itemUnitId: x.unitId, detailName: l.name, quantity: l.qty, unitPrice: l.price, totalPrice: l.qty * l.price, useTax1: false })) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, totalPrice: a.qty * r.unitPrice, _status: 'edit' }))) } },
    reject: {
      body: (f) => json(f, { transDate: dmy(inputs.date), customerId: IDS.customer, description: inputs.reject.description }),
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } },
    },
  }),
  erp: (ctx) => { const k = `p4-si1-${Date.now()}`, base = { customer: inputs.customer, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', taxable: false, branch: 'none (no branch)' },
    create: () => ['POST', '/sales/invoices', { ...base, idempotencyKey: k, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/sales/invoices/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: () => ['POST', '/sales/invoices', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/sales/invoices/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, PO number, shipping (FOB, ship via, address), cashier/POS fields, retail buyer identity and e-payment state are not in the ERP.',
  },
};
