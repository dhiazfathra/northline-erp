// usage: node save-flat.mjs <raw.txt from capture-save> <save path> '<overrides json, full param.* keys>'
// New document cloned from a flat param.* wire: drops ids, numbers, journal links; detail rows become inserts.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const [file, path, o] = process.argv.slice(2);
const p = Object.fromEntries(new URLSearchParams(readFileSync(file, 'utf8')));
for (const k of Object.keys(p)) {
  if (k === '_dsi' || k === '_usi' || /(\.id|\.optLock|\.number|\.journalId|\.bankJournalDetailId|\.createdBy|Id\]?$)$/.test(k) && /^param\.(id|optLock|number|journalId|bankJournalDetailId|createdBy)$|\]\.(id|optLock|salesReceiptId|salesReturnId|purchasePaymentId|itemHistoryId)$/.test(k)) delete p[k];
  if (/\]\._status$/.test(k)) p[k] = 'insert';
}
Object.assign(p, JSON.parse(o));
const { browser, app } = await openSandbox();
let r = await call(app, path, p);
for (let i = 0; i < 30 && r?.s && typeof r.b === 'string'; i++) {
  const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
  if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break; }
  await new Promise((ok) => setTimeout(ok, 2000));
}
for (let i = 0; i < 3 && r?.s === false && r.c; i++) { p[r.c] = 'true'; r = await call(app, path, p); }
log(r?.s, JSON.stringify(r?.s ? { id: r.r?.id, number: r.r?.number } : r?.d ?? r).slice(0, 400));
await browser.close();
