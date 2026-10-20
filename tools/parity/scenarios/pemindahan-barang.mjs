// Persediaan > Pemindahan Barang: send NL-T4 Barang A from Utama to NL-Gudang B (Kirim, through the transit warehouse); edit the
// quantity, save without lines rejected, delete; journal (none) and the warehouse mutation after edit, journal after delete.
import { runReport } from '../../accurate/report.mjs';
import { accFlow, compareFlow, dmy, erp, erpFlow, reportBody, row, seqMask, today } from '../lib.mjs';
import { branch, flatRows, IDS, ITEM_NAME } from './_man.mjs';

const MOD = 'accurate__inventory__item-transfer';
const TRANSIT = 150; // Transit (AOL System)
const inputs = { date: '2051-03-13', warehouse: 'Utama', referenceWarehouse: 'NL-Gudang B', description: 'NL-P4-IT1', lines: [{ item: 'NL-T4-B1', qty: 1 }],
  edit: { description: 'NL-P4-IT1 edit', qty: 2 }, reject: { description: 'NL-P4-IT1 tanpa rincian' } };
const head = (d) => ({ 'param.transDate': dmy(inputs.date), 'param.itemTransferType': 'TRANSFER_OUT', 'param.warehouseId': IDS.utama, 'param.referenceWarehouseId': IDS.gudangB, 'param.description': d });
const rows = (lines) => flatRows('detailItem', lines, (l) => ({ itemId: IDS.item, itemUnitId: IDS.unit, detailName: ITEM_NAME, quantity: l.qty }));
const mutation = async (app) => { const r = await runReport(app, 'WarehouseMutationSummaryReport', { startDate: dmy(inputs.date), endDate: dmy(inputs.date), selectedWarehouse: [{ id: IDS.utama }, { id: TRANSIT }], selectedItem: [{ id: IDS.item }] });
  return r.rows ? body(r.rows) : { error: r.error } };
// rows from the column header on, without Accurate's print footer
const body = (rows) => rows.slice(rows.findIndex((x) => /^Nama Barang/.test(x[0]))).filter((x) => !/^(ACCURATE Accounting System Report|Tercetak pada|Halaman)/.test(x[0]));

export default {
  title: 'Pemindahan Barang', module: 'Persediaan', dir: 'persediaan/pemindahan-barang', mod: MOD,
  accuratePath: 'Persediaan > Pemindahan Barang', erpRoute: 'POST/PUT/DELETE /api/inventory/transfers',
  steps: ['Send 1 NL-T4 Barang A from Utama to NL-Gudang B (Kirim Barang), dated 13 Mar 2051.', 'Edit it: new description, quantity 2.',
    'Read Keseluruhan Jurnal for the day and Ringkasan Mutasi Gudang (Utama, Transit) for NL-T4-B1.', 'Save a transfer without lines: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    fieldMap: { number: 'number', transDate: 'date', itemTransferType: 'direction', warehouse: 'warehouse', referenceWarehouse: 'referenceWarehouse', inTransitWarehouse: 'transit warehouse (fixed)', description: 'description', branch: 'branch',
      fromItemTransfer: 'from (receipts)', warehouseName: 'warehouse', referenceWarehouseName: 'referenceWarehouse' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], direction: b['param.itemTransferType'], transit: b['param.inTransitWarehouseId'] === TRANSIT ? 'Transit (AOL System)' : b['param.inTransitWarehouseId'], branch: branch(b) }),
    create: () => ({ ...head(inputs.description), ...rows(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    beforeDelete: (app) => mutation(app),
  }),
  erp: (ctx) => { const k = `p4-it1-${Date.now()}`, base = { date: inputs.date, direction: 'OUT', warehouse: inputs.warehouse, referenceWarehouse: inputs.referenceWarehouse }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', direction: 'required', transit: 'Transit (AOL System)', branch: 'none (no branch)' },
    create: () => ['POST', '/inventory/transfers', { ...base, idempotencyKey: k, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/inventory/transfers/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: () => ['POST', '/inventory/transfers', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/inventory/transfers/${n}`, { idempotencyKey: k + '-del' }],
    beforeDelete: async () => body((await erp('GET', `/reports/inventory/warehouse-summary?from=${inputs.date}&to=${inputs.date}&warehouse=Utama&warehouse=${encodeURIComponent('Transit (AOL System)')}&item=NL-T4-B1`)).body),
    list: () => `/reports/inventory/transfers?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e, [row('warehouse mutation after edit (Utama, Transit)', seqMask(a.extra), seqMask(e.extra))]),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, the direction and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: see the list; attachments, comments, custom fields, the difference account and print state are not in the ERP.',
  },
};
