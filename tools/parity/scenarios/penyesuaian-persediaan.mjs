// Persediaan > Penyesuaian Persediaan: increase NL-T4 Barang A at a unit cost, edit the quantity, save without lines
// rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__inventory__item-adjustment';
const IDS = { item: 350, unit: 50, warehouse: 50, account: 64 }; // NL-T4-B1 (NL-T4 Barang A), PCS, Gudang Utama, 300001 Equitas Saldo Awal
const inputs = { date: '2051-03-06', account: '300001', description: 'NL-P4-IA1', lines: [{ item: 'NL-T4-B1', direction: 'IN', qty: 2, unitCost: 15000 }],
  edit: { description: 'NL-P4-IA1 edit', qty: 3 }, reject: { description: 'NL-P4-IA1 tanpa rincian' } };
const head = (d) => ({ 'param.transDate': dmy(inputs.date), 'param.adjustmentAccountId': IDS.account, 'param.description': d });
const rows = (lines) => Object.assign({}, ...lines.map((l, i) => { const p = `param.detailItem[${i}].`;
  return { [p + 'itemId']: IDS.item, [p + 'itemUnitId']: IDS.unit, [p + 'warehouseId']: IDS.warehouse, [p + 'detailName']: 'NL-T4 Barang A', [p + 'itemAdjustmentType']: 'ADJUSTMENT_IN',
    [p + 'quantity']: l.qty, [p + 'unitCost']: l.unitCost, [p + 'totalCost']: l.qty * l.unitCost, [p + 'seq']: i + 1, [p + '_status']: 'insert' } }));

export default {
  title: 'Penyesuaian Persediaan', module: 'Persediaan', dir: 'persediaan/penyesuaian-persediaan', mod: MOD,
  accuratePath: 'Persediaan > Penyesuaian Persediaan', erpRoute: 'POST/PUT/DELETE /api/inventory/adjustments',
  steps: ['Create an increase of NL-T4 Barang A, 2 at 15.000, against 300001 Equitas Saldo Awal, dated 06 Mar 2051.',
    'Edit it: new description, quantity 3.', 'Read Keseluruhan Jurnal for the day.', 'Save an adjustment without lines: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    fieldMap: { number: 'number', transDate: 'date', adjustmentAccount: 'account', description: 'description', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], account: b['param.adjustmentAccountId'] === 64 ? '300001' : b['param.adjustmentAccountId'], branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: () => ({ ...head(inputs.description), ...rows(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, totalCost: a.qty * r.unitCost, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-ia1-${Date.now()}`, base = { date: inputs.date, account: inputs.account }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', account: 'required', branch: 'none (no branch)' },
    create: () => ['POST', '/inventory/adjustments', { ...base, idempotencyKey: k, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/inventory/adjustments/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: () => ['POST', '/inventory/adjustments', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/inventory/adjustments/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, the default adjustment account and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields and print state are not in the ERP.',
  },
};
