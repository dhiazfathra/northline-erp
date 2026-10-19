// Aset Tetap the asset scenarios share: NL-P4 asset, category ZZ-R03-Elektronik C, Inventaris Kantor, 24 months straight
// line, one expenditure against NL-T1-3001. Perubahan and Disposisi create one in setup and delete it in teardown.
import { accDelete, accMessage, accNewForm, accSaveBody, dmy } from '../lib.mjs';
export const FA_MOD = 'accurate__fixed-asset__fixed-asset';
export const FA_IDS = { faType: 150, asset: 85, acm: 90, dep: 127, cash: 650, gainLoss: 140, source: 653 }; // Manufaktur Demo ids (source: NL-T1-3001, the account the fixtures acquire against; Kas & Bank is refused)
export const FA_ERP = { category: 'ZZ-R03-Elektronik C', assetAccount: '120005', accumulatedAccount: '12000604', expenseAccount: '600024', source: 'NL-T1-3001' };
/** Flat param.* body of a new asset (the form's own keys, docs/reports/FixedAssetEditedListReport.md seeding notes). */
export const faBody = ({ date, description, amount, lifeMonths }) => ({
  'param.transDate': dmy(date), 'param.usageDate': dmy(date), 'param.lastJournalDate': dmy(date), 'param.description': description, 'param.faTypeId': FA_IDS.faType,
  'param.assetAccountId': FA_IDS.asset, 'param.acmDepreciationAccountId': FA_IDS.acm, 'param.depreciationAccountId': FA_IDS.dep, 'param.depreciationMethod': 'STRAIGHTLINE',
  'param.estimatedLifeYear': Math.floor(lifeMonths / 12), 'param.estimatedLifeMonth': lifeMonths % 12, 'param.estimatedLife': lifeMonths, 'param.quantity': 1, 'param.assetCost': amount,
  ...(amount ? { 'param.detailExpenditure[0].detailName': `${description} perolehan`, 'param.detailExpenditure[0].detailDate': dmy(date), 'param.detailExpenditure[0].detailType': 'EXPENDITURE',
    'param.detailExpenditure[0].accountId': FA_IDS.source, 'param.detailExpenditure[0].amount': amount, 'param.detailExpenditure[0].expenseAmount': amount,
    'param.detailExpenditure[0].seq': 1, 'param.detailExpenditure[0]._status': 'insert' } : {}),
});
let faForm;
export async function accAsset(app, log, a) {
  faForm = await accNewForm(app, FA_MOD);
  const r = await accSaveBody(app, faForm.urls.submit, { ...faForm.body, ...faBody(a) });
  log('setup asset', r?.s, r?.r?.number ?? accMessage(r));
  if (!r?.s) throw new Error('setup asset failed: ' + accMessage(r));
  return { assetId: r.r.id, asset: r.r.number };
}
export async function accAssetTeardown(app, log, x) { const r = await accDelete(app, faForm.urls.del, x.assetId); log('teardown asset', r?.s, accMessage(r)) }
export const erpAsset = ({ date, description, amount, lifeMonths }, key) => ['POST', '/fixed-assets', { idempotencyKey: key, description, category: FA_ERP.category, date, lifeMonths,
  assetAccount: FA_ERP.assetAccount, accumulatedAccount: FA_ERP.accumulatedAccount, expenseAccount: FA_ERP.expenseAccount,
  expenditures: amount ? [{ name: `${description} perolehan`, date, amount, account: FA_ERP.source }] : [] }];
