// Persediaan > Penyelesaian Pesanan: finish a job order the scenario creates first to account 600002 (100%); edit it, a finish into
// the job's own material (NL-T4 Barang A) rejected, delete; journal after edit and after delete; the job order is deleted at the end.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { branch, flatRows, IDS, ITEM_NAME } from './_man.mjs';
import { accJob, accJobTeardown, erpJob, erpJobSetup, EXPENSE } from './_job.mjs';

const MOD = 'accurate__inventory__roll-over';
const job = { date: '2051-03-17', description: 'NL-P4-RO1 pekerjaan', materials: [{ item: 'NL-T4-B1', qty: 1 }], expenses: [{ ...EXPENSE, amount: 10000 }] };
const ACCOUNT_ID = 105; // 600002 Beban Komisi
const inputs = { job, date: '2051-03-18', description: 'NL-P4-RO1', accounts: [{ account: '600002', name: 'NL-P4 Biaya Selesai', portion: 100 }],
  edit: { description: 'NL-P4-RO1 edit' }, reject: { description: 'NL-P4-RO1 ke bahan baku', lines: [{ item: 'NL-T4-B1', qty: 1, portion: 100 }] } };
const head = (d, x, type = 'ACCOUNT') => ({ 'param.transDate': dmy(inputs.date), 'param.rollOverType': type, 'param.jobOrderId': x.jobId, 'param.description': d });
const accts = (as) => flatRows('detailExpense', as, (a) => ({ accountId: ACCOUNT_ID, detailName: a.name, expenseName: a.name, portion: a.portion }));
const items = (lines) => flatRows('detailItem', lines, (l) => ({ itemId: IDS.item, itemUnitId: IDS.unit, warehouseId: IDS.utama, detailName: ITEM_NAME, quantity: l.qty, portion: l.portion }));

export default {
  title: 'Penyelesaian Pesanan', module: 'Persediaan', dir: 'persediaan/penyelesaian-pesanan', mod: MOD,
  accuratePath: 'Persediaan > Penyelesaian Pesanan', erpRoute: 'POST/PUT/DELETE /api/job-costing/roll-overs',
  steps: ['Setup: a job order dated 17 Mar 2051 taking 1 NL-T4 Barang A plus 10.000 NL-P4 Ongkos Kerja, WIP 110403.',
    'Finish it to account 600002 Beban Komisi (100%) on 18 Mar 2051.', 'Edit it: new description.', 'Read Keseluruhan Jurnal for the day.',
    'Save a roll-over into NL-T4 Barang A, one of the job\'s materials: rejected.', 'Delete it; read the journal and the list again; delete the job order.'],
  inputs,
  accurate: (ctx) => { let x0; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    setup: async (app, log) => (x0 = await accJob(app, log, job)),
    fieldMap: { number: 'number', transDate: 'date', rollOverType: 'lines or accounts', jobOrder: 'job', description: 'description', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], rollOverType: b['param.rollOverType'], branch: branch(b) }),
    create: (f, x) => ({ ...head(inputs.description, x), ...accts(inputs.accounts) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description) } },
    reject: { body: () => ({ ...head(inputs.reject.description, x0, 'ITEM'), ...items(inputs.reject.lines) }), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
    teardown: (app, x, log) => accJobTeardown(app, log, x),
  }) },
  erp: (ctx) => { const k = `p4-ro1-${Date.now()}`, base = (x) => ({ job: x.job, date: inputs.date }); return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', rollOverType: 'ITEM (lines given)', branch: 'none (no branch)' },
    setup: async (send) => { await erpJobSetup(send); await send('setup account', ['POST', '/ledger/commands', { type: 'OpenAccount', idempotencyKey: 'p4-acct-600002', no: '600002', name: 'Beban Komisi', accountType: 'EXPENSE' }]); return { job: (await send('setup job order', erpJob(k + '-jo', job))).body.number } },
    create: (x) => ['POST', '/job-costing/roll-overs', { ...base(x), idempotencyKey: k, description: inputs.description, accounts: inputs.accounts }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/job-costing/roll-overs/${n}`, { ...base(x), idempotencyKey: k + '-edit', description: inputs.edit.description, accounts: inputs.accounts }],
    reject: (x) => ['POST', '/job-costing/roll-overs', { ...base(x), idempotencyKey: k + '-bad', description: inputs.reject.description, lines: inputs.reject.lines }],
    del: (n) => ['DELETE', `/job-costing/roll-overs/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown job order', ['DELETE', `/job-costing/job-orders/${x.job}`, { idempotencyKey: k + '-jo-del' }]) },
    list: () => `/reports/job-costing/roll-over-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  adrs: ['ADR-0041', 'ADR-0044'],
  accepted: {
    'journal after edit': 'ADR-0044 D3: Accurate adds a zero line on the job\'s difference account (510102 Selisih Biaya Produksi, 0/0); the ERP has no difference account. Amounts and every other line match.',
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: see the list; attachments, comments and approval state are not in the ERP.',
  },
};
