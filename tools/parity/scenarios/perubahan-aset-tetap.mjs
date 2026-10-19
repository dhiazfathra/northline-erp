// Aset Tetap > Perubahan Aset Tetap: on an asset the scenario creates first; change the useful life, edit it, save
// without an asset rejected, delete; the change posts no journal. The asset is deleted at the end.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { accAsset, accAssetTeardown, erpAsset, FA_IDS } from './_asset.mjs';

const MOD = 'accurate__fixed-asset__fixed-asset-edited';
const asset = { date: '2051-03-10', description: 'NL-P4-FAE1 aset', amount: 2400000, lifeMonths: 24 };
const inputs = { asset, date: '2051-03-11', description: 'NL-P4-FAE1', lifeMonths: 36, edit: { description: 'NL-P4-FAE1 edit', lifeMonths: 48 }, reject: { description: 'NL-P4-FAE1 tanpa aset' } };
const body = (d, x, life) => ({ 'param.transDate': dmy(inputs.date), 'param.description': d, 'param.editedType': 'EDITED',
  ...(x ? { 'param.fixedAssetId': x.assetId, 'param.lastDepreciationDate': dmy(asset.date), 'param.lastBookValue': asset.amount, 'param.oldAssetCost': asset.amount, 'param.newAssetCost': asset.amount,
    'param.oldDepreciationMethod': 'STRAIGHTLINE', 'param.newDepreciationMethod': 'STRAIGHTLINE', 'param.oldEstimatedLife': asset.lifeMonths, 'param.newEstimatedLife': life,
    'param.originalEstimatedLifeYear': Math.floor(asset.lifeMonths / 12), 'param.originalEstimatedLifeMonth': asset.lifeMonths % 12, 'param.estimatedLifeYear': Math.floor(life / 12), 'param.estimatedLifeMonth': life % 12,
    'param.oldAssetAccountId': FA_IDS.asset, 'param.newAssetAccountId': FA_IDS.asset, 'param.oldAcmDepreciationAccountId': FA_IDS.acm, 'param.newAcmDepreciationAccountId': FA_IDS.acm,
    'param.oldDepreciationAccountId': FA_IDS.dep, 'param.newDepreciationAccountId': FA_IDS.dep, 'param.oldQuantity': 1, 'param.newQuantity': 1, 'param.oldBranchId': 50, 'param.newBranchId': 50 } : {}) });

export default {
  title: 'Perubahan Aset Tetap', module: 'Aset Tetap', dir: 'aset-tetap/perubahan-aset-tetap', mod: MOD,
  accuratePath: 'Aset Tetap > Perubahan Aset Tetap', erpRoute: 'POST/PUT/DELETE /api/fixed-assets/edits',
  steps: ['Setup: an asset NL-P4-FAE1 aset, 2.400.000 against NL-T1-3001, 24 months, dated 10 Mar 2051.',
    'Change its useful life to 36 months on 11 Mar 2051.', 'Edit the change: new description, 48 months.', 'Read Keseluruhan Jurnal for the day (no journal).',
    'Save a change without an asset: rejected.', 'Delete the change; read the journal and the list again; delete the asset.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    setup: (app, log) => accAsset(app, log, asset),
    fieldMap: { number: 'number', transDate: 'date', description: 'description', fixedAsset: 'asset', editedType: 'useful-life change only', estimatedLifeYear: 'lifeMonths', estimatedLifeMonth: 'lifeMonths', newEstimatedLife: 'lifeMonths' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], editedType: b['param.editedType'], newMethod: b['param.newDepreciationMethod'] }),
    create: (f, x) => body(inputs.description, x, inputs.lifeMonths),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.estimatedLifeYear?.(Math.floor(a.lifeMonths / 12)); fd.estimatedLifeMonth?.(a.lifeMonths % 12); fd.newEstimatedLife?.(a.lifeMonths) } },
    reject: { body: () => body(inputs.reject.description, null) },
    teardown: (app, x, log) => accAssetTeardown(app, log, x),
  }),
  erp: (ctx) => { const k = `p4-fae1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', editedType: 'EDITED (useful life only)', newMethod: 'unchanged (straight line)' },
    setup: async (send) => ({ asset: (await send('setup asset', erpAsset(asset, k + '-asset'))).body.number }),
    create: (x) => ['POST', '/fixed-assets/edits', { idempotencyKey: k, asset: x.asset, date: inputs.date, description: inputs.description, lifeMonths: inputs.lifeMonths }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/fixed-assets/edits/${n}`, { idempotencyKey: k + '-edit', asset: x.asset, date: inputs.date, description: inputs.edit.description, lifeMonths: inputs.edit.lifeMonths }],
    reject: () => ['POST', '/fixed-assets/edits', { idempotencyKey: k + '-bad', asset: '', date: inputs.date, description: inputs.reject.description, lifeMonths: inputs.lifeMonths }],
    del: (n) => ['DELETE', `/fixed-assets/edits/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown asset', ['DELETE', `/fixed-assets/${x.asset}`, { idempotencyKey: k + '-asset-del' }]) },
    list: () => `/reports/fixed-assets-edited?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date is a client default, not an API default.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, cost/method/account/branch/quantity revaluation (the change models useful life only, ADR-0037 shortcut) are not in the ERP.',
  },
};
