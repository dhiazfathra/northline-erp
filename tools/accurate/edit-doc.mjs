// usage: node edit-doc.mjs <wire.json> <bg-save path> '<overrides json>'
// Re-saves an existing document (captured with capture-save.mjs) with header overrides, via the background save + poll.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const [file, path, o] = process.argv.slice(2);
const p = { ...JSON.parse(readFileSync(file)), ...JSON.parse(o) };
const { browser, app } = await openSandbox();
let r = await call(app, path, { _param: JSON.stringify(p) });
for (let i = 0; i < 30 && r?.s && typeof r.b === 'string'; i++) {
  const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
  if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break; }
  await new Promise((ok) => setTimeout(ok, 2000));
}
log(r?.s, JSON.stringify(r?.s ? { number: r.r?.number, taxNumber: r.r?.taxNumber, documentCode: r.r?.documentCode } : r?.d ?? r).slice(0, 400));
await browser.close();
