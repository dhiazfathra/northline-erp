// Pekerjaan Pesanan helpers: the job order body (Manufaktur Demo, flat param.* keys), and a job order that the material-adjustment
// and roll-over scenarios draw on, created in setup and deleted in teardown.
import { accDelete, accMessage, accNewForm, accSaveBody, dmy } from '../lib.mjs';
import { flatRows, IDS, ITEM_NAME } from './_man.mjs';
export const JO_MOD = 'accurate__inventory__job-order';
export const EXPENSE = { account: '600001', name: 'NL-P4 Ongkos Kerja' };
export const joHead = (date, d) => ({ 'param.transDate': dmy(date), 'param.jobAccountId': IDS.wip, 'param.differenceAccountId': IDS.diff, 'param.description': d });
export const joRows = (materials, expenses) => ({
  ...flatRows('detailItem', materials, (m) => ({ itemId: IDS.item, itemUnitId: IDS.unit, warehouseId: IDS.utama, detailName: ITEM_NAME, quantity: m.qty })),
  ...flatRows('detailExpense', expenses, (e) => ({ accountId: IDS.expense, detailName: e.name, expenseName: e.name, expenseAmount: e.amount })) });
let joForm;
/** Accurate: saves a job order; returns its id and number. */
export async function accJob(app, log, { date, description, materials, expenses = [] }) {
  joForm = await accNewForm(app, JO_MOD);
  const r = await accSaveBody(app, joForm.urls.submit, { ...joForm.body, ...joHead(date, description), ...joRows(materials, expenses) });
  log('setup job order', r?.s, r?.r?.number ?? accMessage(r));
  if (!r?.s) throw new Error('setup job order failed');
  return { jobId: r.r.id, job: r.r.number };
}
export async function accJobTeardown(app, log, x) { const r = await accDelete(app, joForm.urls.del, x.jobId); log('teardown job order', r?.s, accMessage(r)) }
/** ERP: the accounts a job order posts to (the local seed has no job costing) and the job order itself. */
export const erpJobAccounts = [['110403', 'Persediaan Dalam Proses', 'INVENTORY'], ['510102', 'Selisih Biaya Produksi', 'COGS'], ['600001', 'Beban Iklan', 'EXPENSE']];
export async function erpJobSetup(send) {
  for (const [no, name, accountType] of erpJobAccounts) await send('setup account', ['POST', '/ledger/commands', { type: 'OpenAccount', idempotencyKey: `p4-acct-${no}`, no, name, accountType }]);
}
export const erpJob = (key, { date, description, materials, expenses = [] }) => ['POST', '/job-costing/job-orders', { idempotencyKey: key, date, description, wipAccount: '110403',
  materials: materials.map((m) => ({ item: 'NL-T4-B1', qty: m.qty })), expenses: expenses.map((e) => ({ account: EXPENSE.account, name: e.name, amount: e.amount })) }];
