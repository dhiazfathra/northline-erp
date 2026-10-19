// Aset Tetap > Disposisi Aset Tetap: on an asset the scenario creates first; dispose it unsold, edit to a sale, save
// without an asset rejected, delete; journal after edit and after delete. The asset is deleted at the end.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';
import { accAsset, accAssetTeardown, erpAsset, FA_IDS } from './_asset.mjs';

const MOD = 'accurate__fixed-asset__fixed-asset-disposed';
const asset = { date: '2051-03-12', description: 'NL-P4-FAD1 aset', amount: 2400000, lifeMonths: 24 };
const inputs = { asset, date: '2051-03-13', description: 'NL-P4-FAD1', gainLossAccount: '720006', edit: { description: 'NL-P4-FAD1 edit', price: 1000000, sellingAccount: 'NL-T1-1101' },
  reject: { description: 'NL-P4-FAD1 tanpa aset' } };
const body = (d, x, price = 0) => ({ 'param.transDate': dmy(inputs.date), 'param.description': d, 'param.editedType': 'DISPOSED', 'param.gainLossAccountId': FA_IDS.gainLoss,
  ...(x ? { 'param.fixedAssetId': x.assetId, 'param.quantity': 1, 'param.lastQuantity': 1, 'param.lastBookValue': asset.amount, 'param.lastDepreciationDate': dmy(asset.date) } : {}),
  ...(price ? { 'param.sellingAsset': true, 'param.sellingPrice': price, 'param.sellingAccountId': FA_IDS.cash } : {}) });

export default {
  title: 'Disposisi Aset Tetap', module: 'Aset Tetap', dir: 'aset-tetap/disposisi-aset-tetap', mod: MOD,
  accuratePath: 'Aset Tetap > Disposisi Aset Tetap', erpRoute: 'POST/PUT/DELETE /api/fixed-assets/disposals',
  steps: ['Setup: an asset NL-P4-FAD1 aset, 2.400.000 against NL-T1-3001, 24 months, dated 12 Mar 2051.',
    'Dispose of it unsold on 13 Mar 2051 against 720006 Laba/Rugi Disposisi Aset.', 'Edit the disposal: new description, sold for 1.000.000 into NL-T1 Kas.',
    'Read Keseluruhan Jurnal for the day.', 'Save a disposal without an asset: rejected.', 'Delete the disposal; read the journal and the list again; delete the asset.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    setup: (app, log) => accAsset(app, log, asset),
    fieldMap: { number: 'number', transDate: 'date', description: 'description', fixedAsset: 'asset', gainLossAccount: 'gainLossAccount', sellingAsset: 'price > 0', sellingPrice: 'price',
      sellingAccount: 'sellingAccount', quantity: 'whole asset (no partial disposal)', editedType: 'disposal' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], sold: !!b['param.sellingAsset'], quantity: b['param.quantity'] }),
    create: (f, x) => body(inputs.description, x),
    edit: { arg: { ...inputs.edit, cash: FA_IDS.cash }, mutate: (fd, a) => { fd.description(a.description); fd.sellingAsset?.(true); fd.sellingPrice?.(a.price); fd.sellingAccount?.({ id: a.cash, no: 'NL-T1-1101', name: 'NL-T1 Kas', accountType: 'CASH_BANK', currencyId: 50 }); fd.sellingAccountId?.(a.cash) } }, // the form keeps the account as an object
    reject: { body: () => body(inputs.reject.description, null) },
    teardown: (app, x, log) => accAssetTeardown(app, log, x),
  }),
  erp: (ctx) => { const k = `p4-fad1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', sold: false, quantity: 'whole asset' },
    setup: async (send) => ({ asset: (await send('setup asset', erpAsset(asset, k + '-asset'))).body.number }),
    create: (x) => ['POST', '/fixed-assets/disposals', { idempotencyKey: k, asset: x.asset, date: inputs.date, description: inputs.description, gainLossAccount: inputs.gainLossAccount }],
    number: (r) => r.number,
    edit: (n, x) => ['PUT', `/fixed-assets/disposals/${n}`, { idempotencyKey: k + '-edit', asset: x.asset, date: inputs.date, description: inputs.edit.description, gainLossAccount: inputs.gainLossAccount,
      price: inputs.edit.price, sellingAccount: inputs.edit.sellingAccount }],
    reject: () => ['POST', '/fixed-assets/disposals', { idempotencyKey: k + '-bad', asset: '', date: inputs.date, description: inputs.reject.description, gainLossAccount: inputs.gainLossAccount }],
    del: (n) => ['DELETE', `/fixed-assets/disposals/${n}`, { idempotencyKey: k + '-del' }],
    teardown: async (send, x) => { await send('teardown asset', ['DELETE', `/fixed-assets/${x.asset}`, { idempotencyKey: k + '-asset-del' }]) },
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date is a client default, not an API default.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields and partial (quantity) disposal are not in the ERP.',
  },
};
