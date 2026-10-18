// usage: node reconcile.mjs <bankId> <masterId> <amount> <DB|CR> <statement date dd/MM/yyyy> '<statement description>'
// Manual bank reconciliation: creates a statement line from a book entry (add-exist-in-bankstatement) and reconciles it.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
const [bankId, masterId, amount, mutationType, transDate, description] = process.argv.slice(2);
const { browser, app } = await openSandbox();
const a = await call(app, '/accurate/cash-bank/add-exist-in-bankstatement.do', { bankId, addAmount: amount, mutationType, transDate, description, masterId });
if (!a?.s) { log('add failed', JSON.stringify(a).slice(0, 300)); process.exit(1) }
const ids = (a.d.reconcileList ?? []).map((r) => r.reconcileId);
const s = await call(app, '/accurate/cash-bank/save-bank-reconcile.do', { bankReconcileType: 'BOOK_TO_STATEMENT', masterId, reconcileIdList: ids.join(',') });
log('reconcile ids', ids, 'save', s?.s, JSON.stringify(s?.d).slice(0, 200));
await browser.close();
