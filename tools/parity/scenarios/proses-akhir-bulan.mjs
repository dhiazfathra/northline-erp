// Perusahaan > Proses Akhir Bulan on a 2051 period: create, edit, save without a month rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__company__period-end';
const inputs = { date: '2051-02-28', year: 2051, month: 2, period: '2051-02', description: 'NL-P4-PE1',
  edit: { description: 'NL-P4-PE1 edit' }, reject: { description: 'NL-P4-PE1 tanpa bulan' } };
const head = (d, month = inputs.month) => ({ 'param.transDate': dmy(inputs.date), 'param.yearPE': inputs.year, 'param.monthPE': month, 'param.description': d });

export default {
  title: 'Proses Akhir Bulan', module: 'Perusahaan', dir: 'perusahaan/proses-akhir-bulan', mod: MOD,
  accuratePath: 'Perusahaan > Proses Akhir Bulan', erpRoute: 'POST/PUT/DELETE /api/period-ends',
  steps: ['Run Proses Akhir Bulan for Februari 2051 (28 Feb 2051) with the form\'s options (gain/loss, depreciation, manufacture).',
    'Edit it: new description.', 'Read Keseluruhan Jurnal for the day.', 'Save one without a month: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: 'Februari 2051',
    fieldMap: { number: 'number (month name and year)', transDate: 'period (last day)', description: 'description', yearPE: 'period', monthPE: 'period', monthName: 'period', modulesType: 'all modules (the only scope)', depreciation: 'depreciation (always)' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], month: b['param.monthPE'], modules: b['param.modulesType'], gainLoss: b['param.gainLoss'], depreciation: b['param.depreciation'], manufacture: b['param.manufacture'] }),
    create: () => head(inputs.description),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description) } },
    reject: { body: () => head(inputs.reject.description, 0), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-pe1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'last day of the period', month: 'required', modules: 'all', gainLoss: 'not run', depreciation: true, manufacture: 'not run' },
    create: () => ['POST', '/period-ends', { idempotencyKey: k, period: inputs.period, description: inputs.description }],
    number: (r) => r.number,
    edit: () => ['PUT', `/period-ends/${inputs.period}`, { idempotencyKey: k + '-edit', period: inputs.period, description: inputs.edit.description }],
    reject: () => ['POST', '/period-ends', { idempotencyKey: k + '-bad', period: `${inputs.year}-00`, description: inputs.reject.description }],
    del: () => ['DELETE', `/period-ends/${inputs.period}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`, // Proses Akhir Bulan has no view privilege (Akses Grup -xxx-), so no list route
  }) },
  compare: (a, e) => compareFlow(a, e),
  stopped: 'journal after edit (gain/loss revaluation); the fix would change done reports',
  stoppedNote: 'Accurate\'s run for Februari 2051 posts only the unrealized gain/loss revaluation (Piutang Usaha USD and two USD banks against 720202) and no depreciation; the ERP posts depreciation only (fixed-asset-t5\'s asset, its next unrun month). Revaluation inside Proses Akhir Bulan needs foreign bank accounts (not modelled, ADR-0012) and would add journals to every seeded period end (2034, fixed-asset-t5), whose general-ledger reports are `done`: the stop rule applies. Create, edit (same number), delete, the rejected save ("Bulan harus diisi") and list/search match. See ADR-0042.',
  adrs: ['ADR-0041', 'ADR-0042'],
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the current month are client defaults, not API defaults.',
  },
};
