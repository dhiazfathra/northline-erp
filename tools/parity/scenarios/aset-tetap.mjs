// Aset Tetap > Aset Tetap: acquire an asset against NL-T1-3001, edit description and cost, save without expenditure
// rejected, delete; journal after edit and after delete. Confirms the form's tier (it posts a journal: Tier 1).
import { accFlow, compareFlow, erpFlow, today } from '../lib.mjs';
import { erpAsset, FA_MOD, faBody } from './_asset.mjs';

const inputs = { date: '2051-03-09', description: 'NL-P4-FA1', amount: 2400000, lifeMonths: 24, category: 'ZZ-R03-Elektronik C',
  edit: { description: 'NL-P4-FA1 edit', amount: 3000000 }, reject: { description: 'NL-P4-FA1 tanpa pengeluaran' } };

export default {
  title: 'Aset Tetap', module: 'Aset Tetap', dir: 'aset-tetap/aset-tetap', mod: FA_MOD,
  accuratePath: 'Aset Tetap > Aset Tetap', erpRoute: 'POST/PUT/DELETE /api/fixed-assets',
  steps: ['Create an asset NL-P4-FA1 (ZZ-R03-Elektronik C, Inventaris Kantor, 24 months straight line), one expenditure 2.400.000 against NL-T1-3001, dated 09 Mar 2051.',
    'Edit it: new description, expenditure 3.000.000.', 'Read Keseluruhan Jurnal for the day.', 'Save an asset without expenditure: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: FA_MOD, date: inputs.date, keyword: inputs.description,
    fieldMap: { number: 'number', transDate: 'date', usageDate: 'usageDate', description: 'description', faType: 'category', assetAccount: 'assetAccount', acmDepreciationAccount: 'accumulatedAccount',
      depreciationAccount: 'expenseAccount', depreciationMethod: 'method (straight line only)', estimatedLife: 'lifeMonths', estimatedLifeYear: 'lifeMonths', estimatedLifeMonth: 'lifeMonths',
      assetCost: 'expenditures (sum)', fiscalFaType: 'fiscalLifeMonths', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], usageDate: b['param.usageDate'] === today() ? 'today' : b['param.usageDate'],
      method: b['param.depreciationMethod'], quantity: b['param.quantity'], branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: () => faBody(inputs),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.assetCost?.(a.amount); fd.detailExpenditure(fd.detailExpenditure().map((r) => ({ ...r, amount: a.amount, expenseAmount: a.amount, _status: 'edit' }))) } },
    reject: { body: () => faBody({ ...inputs, description: inputs.reject.description, amount: 0 }) },
  }),
  erp: (ctx) => { const k = `p4-fa1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', usageDate: 'the acquisition date', method: 'STRAIGHTLINE', quantity: 'one asset per record', branch: 'none (no branch)' },
    create: () => erpAsset(inputs, k),
    number: (r) => r.number,
    edit: (n) => { const [, , b] = erpAsset({ ...inputs, ...inputs.edit }, k + '-edit'); return ['PUT', `/fixed-assets/${n}`, b] },
    reject: () => erpAsset({ ...inputs, description: inputs.reject.description, amount: 0 }, k + '-bad'),
    del: (n) => ['DELETE', `/fixed-assets/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/fixed-assets/list?asOf=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, the usage date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, quantity, residual value, location, intangible flag, tax-depreciation detail and the purchase-invoice link are not in the ERP.',
  },
};
