// Persediaan > Penambahan Bahan Baku: against a job order the scenario creates first, take 1 more NL-T4 Barang A (Ambil Barang);
// edit the quantity, save without lines rejected, delete; journal after edit and after delete; the job order is deleted at the end.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { branch, flatRows, IDS, ITEM_NAME } from './_man.mjs';
import { accJob, accJobTeardown, erpJob, erpJobSetup } from './_job.mjs';

const MOD = 'accurate__inventory__material-adjustment';
const job = { date: '2051-03-15', description: 'NL-P4-MA1 pekerjaan', materials: [{ item: 'NL-T4-B1', qty: 1 }] };
const inputs = { job, date: '2051-03-16', type: 'ITEM_PICK', description: 'NL-P4-MA1', lines: [{ item: 'NL-T4-B1', qty: 1 }],
  edit: { description: 'NL-P4-MA1 edit', qty: 2 }, reject: { description: 'NL-P4-MA1 tanpa rincian' } };
const head = (d, x) => ({ 'param.transDate': dmy(inputs.date), 'param.materialAdjustmentType': inputs.type, 'param.jobOrderId': x.jobId, 'param.description': d });
const rows = (lines) => flatRows('detailItem', lines, (l) => ({ itemId: IDS.item, materialUnitId: IDS.unit, warehouseId: IDS.utama, detailName: ITEM_NAME, quantity: l.qty }));

export default {
  title: 'Penambahan Bahan Baku', module: 'Persediaan', dir: 'persediaan/penambahan-bahan-baku', mod: MOD,
  accuratePath: 'Persediaan > Penambahan Bahan Baku', erpRoute: 'POST/PUT/DELETE /api/job-costing/material-adjustments',
  steps: ['Setup: a job order dated 15 Mar 2051 taking 1 NL-T4 Barang A, WIP 110403.', 'Take 1 more NL-T4 Barang A into it (Ambil Barang) on 16 Mar 2051.',
    'Edit it: new description, quantity 2.', 'Read Keseluruhan Jurnal for the day.', 'Save an adjustment without lines: rejected.',
    'Delete it; read the journal and the list again; delete the job order.'],
  inputs,
  accurate: (ctx) => { let x0; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    setup: async (app, log) => (x0 = await accJob(app, log, job)),
    fieldMap: { number: 'number', transDate: 'date', materialAdjustmentType: 'type', materialAdjustmentTypeName: 'type', jobOrder: 'job', description: 'description', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], type: b['param.materialAdjustmentType'], branch: branch(b) }),
    create: (f, x) => ({ ...head(inputs.description, x), ...rows(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description, x0), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    teardown: (app, x, log) => accJobTeardown(app, log, x),
  }) },
  erp: (ctx) => { const k = `p4-ma1-${Date.now()}`, base = (x) => ({ job: x.job, type: inputs.type, date: inputs.date }); return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', type: 'required', branch: 'none (no branch)' },
    setup: async (send) => { await erpJobSetup(send); return { job: (await send('setup job order', erpJob(k + '-jo', job))).body.number } },
    create: (x) => ['POST', '/job-costing/material-adjustments', { ...base(x), idempotencyKey: k, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/job-costing/material-adjustments/${n}`, { ...base(x), idempotencyKey: k + '-edit', description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, qty: inputs.edit.qty })) }],
    reject: (x) => ['POST', '/job-costing/material-adjustments', { ...base(x), idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/job-costing/material-adjustments/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown job order', ['DELETE', `/job-costing/job-orders/${x.job}`, { idempotencyKey: k + '-jo-del' }]) },
    list: () => `/reports/job-costing/material-adjustment-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, the type and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: see the list; attachments, comments, department, project and the pick-adjustment link are not in the ERP.',
  },
};
