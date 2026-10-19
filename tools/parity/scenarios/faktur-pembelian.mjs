// Pembelian > Faktur Pembelian (service item, untaxed): create, edit, save without lines rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__vendor__purchase-invoice';
const IDS = { vendor: 450, item: 300, unit: 150 }; // NL-T3-V1, NL-T2-S1 (unit JAM) in Manufaktur Demo
const inputs = { date: '2051-02-03', vendor: 'NL-T3-V1', bill: 'NL-P4-PI1', description: 'NL-P4-PI1', lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty: 2, price: 50000 }],
  edit: { description: 'NL-P4-PI1 edit', qty: 3 }, reject: { bill: 'NL-P4-PI1-X', description: 'NL-P4-PI1 tanpa rincian' } };
const json = (f, o) => ({ _param: JSON.stringify({ ...JSON.parse(f.body._param), ...o }) });

export default {
  title: 'Faktur Pembelian', module: 'Pembelian', dir: 'pembelian/faktur-pembelian', mod: MOD,
  accuratePath: 'Pembelian > Faktur Pembelian', erpRoute: 'POST/PUT/DELETE /api/purchases/invoices',
  steps: ['Create an untaxed purchase invoice from NL-T3 Pemasok A, bill NL-P4-PI1: NL-T2 Jasa Konsultasi 2 x 50.000, dated 03 Feb 2051.',
    'Edit it: new description, quantity 3.', 'Read Keseluruhan Jurnal for the day.', 'Save an invoice without lines: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    fieldMap: { number: 'number', billNumber: 'bill', vendor: 'vendor', transDate: 'date', dueDate: 'dueDate', description: 'description', taxable: 'taxable', taxDate: 'date (taxable)', taxNumber: 'taxNumber',
      rate: 'rate', fiscalRate: 'rate', currency: 'vendor currency', apAccount: 'vendor AP account', paymentTerm: 'dueDate (term)', branch: 'branch', documentCode: 'vendor tax document code', vendorTaxType: 'vendor tax type' },
    defaults: (b) => { const p = JSON.parse(b._param); return { date: p.transDate === today() ? 'today' : p.transDate, taxable: p.taxable, branch: p.branchId === 50 ? 'Kantor Pusat' : p.branchId } },
    create: (f) => json(f, { transDate: dmy(inputs.date), shipDate: dmy(inputs.date), dueDate: dmy(inputs.date), taxDate: dmy(inputs.date), vendorId: IDS.vendor, billNumber: inputs.bill, description: inputs.description,
      detailItem: inputs.lines.map((l, i) => ({ _status: 'insert', seq: i + 1, itemId: IDS.item, itemUnitId: IDS.unit, detailName: l.name, quantity: l.qty, unitPrice: l.price, totalPrice: l.qty * l.price, useTax1: false })) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, totalPrice: a.qty * r.unitPrice, _status: 'edit' }))) } },
    reject: {
      body: (f) => json(f, { transDate: dmy(inputs.date), vendorId: IDS.vendor, billNumber: inputs.reject.bill, description: inputs.reject.description }),
      ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } },
    },
  }),
  erp: (ctx) => { const k = `p4-pi1-${Date.now()}`, base = { vendor: inputs.vendor, date: inputs.date }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', taxable: false, branch: 'none (no branch)' },
    create: () => ['POST', '/purchases/invoices', { ...base, idempotencyKey: k, bill: inputs.bill, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/purchases/invoices/${n}`, { ...base, idempotencyKey: k + '-edit', bill: inputs.bill, description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: () => ['POST', '/purchases/invoices', { ...base, idempotencyKey: k + '-bad', bill: inputs.reject.bill, description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/purchases/invoices/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, shipping (FOB, ship via, address, ship date), the vendor bank account, recurring, opening-balance and amortization flags, project and print state are not in the ERP.',
  },
};
