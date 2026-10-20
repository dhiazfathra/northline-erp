// Penjualan > Pengiriman Pesanan: deliver NL-T4 Barang A to NL-T2 Pelanggan A without an order; edit the quantity, save without
// lines rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { branch, flatRows, IDS, ITEM_NAME } from './_man.mjs';

const MOD = 'accurate__customer__delivery-order';
const inputs = { date: '2051-03-10', customer: 'NL-T2-C1', description: 'NL-P4-DO1', lines: [{ item: 'NL-T4-B1', qty: 1 }],
  edit: { description: 'NL-P4-DO1 edit', qty: 2 }, reject: { description: 'NL-P4-DO1 tanpa rincian' } };
const head = (d) => ({ 'param.transDate': dmy(inputs.date), 'param.customerId': IDS.customer, 'param.description': d });
const rows = (lines) => flatRows('detailItem', lines, (l) => ({ itemId: IDS.item, itemUnitId: IDS.unit, warehouseId: IDS.utama, detailName: ITEM_NAME, quantity: l.qty }));

export default {
  title: 'Pengiriman Pesanan', module: 'Penjualan', dir: 'penjualan/pengiriman-pesanan', mod: MOD,
  accuratePath: 'Penjualan > Pengiriman Pesanan', erpRoute: 'POST/PUT/DELETE /api/sales/deliveries',
  steps: ['Deliver 1 NL-T4 Barang A from Utama to NL-T2 Pelanggan A, no sales order, dated 10 Mar 2051.', 'Edit it: new description, quantity 2.',
    'Read Keseluruhan Jurnal for the day.', 'Save a delivery without lines: rejected.', 'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    fieldMap: { number: 'number', customer: 'customer', transDate: 'date', description: 'description', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], branch: branch(b) }),
    create: () => ({ ...head(inputs.description), ...rows(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-do1-${Date.now()}`, base = { customer: inputs.customer, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', branch: 'none (no branch)' },
    create: () => ['POST', '/sales/deliveries', { ...base, idempotencyKey: k, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/sales/deliveries/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: () => ['POST', '/sales/deliveries', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/sales/deliveries/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, PO number, currency, shipping, taxes, packing, online order, contact and print state are not in the ERP.',
  },
};
