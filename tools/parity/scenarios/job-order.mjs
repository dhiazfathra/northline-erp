// Persediaan > Pekerjaan Pesanan: a job order taking NL-T4 Barang A from Utama plus an expense line; edit the quantity, save without
// materials or expenses rejected, delete; journal after edit and after delete (the tier check: does Accurate post a journal?).
import { accFlow, compareFlow, erpFlow, today } from '../lib.mjs';
import { branch } from './_man.mjs';
import { EXPENSE, erpJob, erpJobSetup, joHead, JO_MOD, joRows } from './_job.mjs';

const inputs = { date: '2051-03-14', wipAccount: '110403', description: 'NL-P4-JC1', materials: [{ item: 'NL-T4-B1', qty: 1 }], expenses: [{ ...EXPENSE, amount: 10000 }],
  edit: { description: 'NL-P4-JC1 edit', qty: 2 }, reject: { description: 'NL-P4-JC1 tanpa rincian' } };

export default {
  title: 'Pekerjaan Pesanan', module: 'Persediaan', dir: 'persediaan/pekerjaan-pesanan', mod: JO_MOD,
  accuratePath: 'Persediaan > Pekerjaan Pesanan', erpRoute: 'POST/PUT/DELETE /api/job-costing/job-orders',
  steps: ['Create a job order dated 14 Mar 2051: 1 NL-T4 Barang A from Utama and 10.000 NL-P4 Ongkos Kerja on 600001, WIP 110403.',
    'Edit it: new description, quantity 2.', 'Read Keseluruhan Jurnal for the day.', 'Save a job order without materials or expenses: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: JO_MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailItem',
    fieldMap: { number: 'number', transDate: 'date', jobAccount: 'wipAccount', customer: 'customer', description: 'description', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], jobAccount: b['param.jobAccountId'] || null, branch: branch(b) }),
    create: () => ({ ...joHead(inputs.date, inputs.description), ...joRows(inputs.materials, inputs.expenses) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailItem(fd.detailItem().map((r) => ({ ...r, quantity: a.qty, _status: 'edit' }))) } },
    reject: { body: () => joHead(inputs.date, inputs.reject.description), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-jc1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', jobAccount: 'required (wipAccount)', branch: 'none (no branch)' },
    setup: async (send) => { await erpJobSetup(send); return {} },
    create: () => erpJob(k, inputs),
    number: (r) => r.number,
    edit: (n) => { const [, , b] = erpJob(k + '-edit', { ...inputs, description: inputs.edit.description, materials: inputs.materials.map((m) => ({ ...m, qty: inputs.edit.qty })) }); return ['PUT', `/job-costing/job-orders/${n}`, b] },
    reject: () => erpJob(k + '-bad', { ...inputs, description: inputs.reject.description, materials: [], expenses: [] }),
    del: (n) => ['DELETE', `/job-costing/job-orders/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/job-costing/job-order-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: see the list; attachments, comments, custom fields, department, project, the difference account and close state are not in the ERP.',
  },
};
