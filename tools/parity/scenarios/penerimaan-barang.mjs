// Pembelian > Penerimaan Barang: receive NL-T4 Barang A from NL-T3 Pemasok A without an order, priced; edit the quantity, save
// without lines rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { branch, IDS, ITEM_NAME } from './_man.mjs';

const MOD = 'accurate__vendor__receive-item';
const inputs = { date: '2051-03-11', vendor: 'NL-T3-V1', receiveNumber: 'NL-P4-RI1-R', description: 'NL-P4-RI1', lines: [{ item: 'NL-T4-B1', qty: 2, price: 15000 }],
  edit: { description: 'NL-P4-RI1 edit', qty: 3 }, reject: { description: 'NL-P4-RI1 tanpa rincian', receiveNumber: 'NL-P4-RI1-X' } };
const head = (f, d, receiveNumber) => ({ ...JSON.parse(f.body._param), transDate: dmy(inputs.date), shipDate: dmy(inputs.date), vendorId: IDS.vendor, receiveNumber, description: d });
const rows = (lines) => lines.map((l, i) => ({ _status: 'insert', seq: i + 1, itemId: IDS.item, itemUnitId: IDS.unit, warehouseId: IDS.utama, detailName: ITEM_NAME, quantity: l.qty, unitPrice: l.price, useTax1: false }));
const wire = (p) => ({ _param: JSON.stringify(p) });

export default {
  title: 'Penerimaan Barang', module: 'Pembelian', dir: 'pembelian/penerimaan-barang', mod: MOD,
  accuratePath: 'Pembelian > Penerimaan Barang', erpRoute: 'POST/PUT/DELETE /api/purchases/receive-items',
  steps: ['Receive 2 NL-T4 Barang A at 15.000 into Utama from NL-T3 Pemasok A, no purchase order, dated 11 Mar 2051.', 'Edit it: new description, quantity 3.',
    'Read Keseluruhan Jurnal for the day.', 'Save a receipt without lines: rejected.', 'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    fieldMap: { number: 'number', receiveNumber: 'receiveNumber', vendor: 'vendor', transDate: 'date', shipDate: 'date', description: 'description', branch: 'branch' },
    defaults: (b) => { const p = JSON.parse(b._param); return { date: p.transDate === today() ? 'today' : p.transDate, branch: branch({ 'param.branchId': p.branchId }) } },
    create: (f) => wire({ ...head(f, inputs.description, inputs.receiveNumber), detailItem: rows(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, _status: 'edit' }))) } },
    reject: { body: (f) => wire({ ...head(f, inputs.reject.description, inputs.reject.receiveNumber), detailItem: [] }),
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-ri1-${Date.now()}`, base = { vendor: inputs.vendor, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', branch: 'none (no branch)' },
    create: () => ['POST', '/purchases/receive-items', { ...base, idempotencyKey: k, receiveNumber: inputs.receiveNumber, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/purchases/receive-items/${n}`, { ...base, idempotencyKey: k + '-edit', receiveNumber: inputs.receiveNumber, description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: () => ['POST', '/purchases/receive-items', { ...base, idempotencyKey: k + '-bad', receiveNumber: inputs.reject.receiveNumber, description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/purchases/receive-items/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: see the list; attachments, comments, custom fields, currency, shipping, taxes and print state are not in the ERP.',
  },
};
