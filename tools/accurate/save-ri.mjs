// usage: node save-ri.mjs '<spec>'  spec: {date, receiveNumber, description, lines:[{qty, price}]}
// New Penerimaan Barang (vendor NL-T3-V1, item NL-T4-B1, Utama) cloned from the captured ri.json wire body.
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const spec = JSON.parse(process.argv[2]);
const t = JSON.parse(JSON.parse(readFileSync(new URL('./ri.json', import.meta.url)))._param);
const p = structuredClone(t);
for (const k of ['id', 'optLock', 'number', 'journalId', 'createdBy', 'statusName']) delete p[k];
Object.assign(p, { transDate: spec.date, shipDate: spec.date, receiveNumber: spec.receiveNumber, description: spec.description, countAutoNumber: 1 });
p.detailItem = spec.lines.map((l, i) => {
  const d = { ...t.detailItem[0], _status: 'insert', seq: i + 1, quantity: String(l.qty), unitPrice: String(l.price) };
  for (const k of ['id', 'optLock', 'receiveItemId', 'totalPrice', 'itemHistoryId', 'detailSerialNumber']) delete d[k];
  return d;
});
const { browser, app } = await openSandbox();
await assertSandbox(app);
let r = await call(app, '/accurate/vendor/bg-save-receive-item.do', { _param: JSON.stringify(p) });
for (let i = 0; i < 30 && r?.s && typeof r.b === 'string'; i++) {
  const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
  if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break; }
  await new Promise((ok) => setTimeout(ok, 2000));
}
log(JSON.stringify(r).slice(0, 600));
await browser.close();
