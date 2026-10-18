// usage: node save-param.mjs <save path.do> '<flat param.* json>'
// Posts a new document as flat param.* keys (forms without a captured template); resends with warning flags set.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
const [path, o] = process.argv.slice(2);
const p = JSON.parse(o);
const { browser, app } = await openSandbox();
let r = await call(app, path, p);
for (let i = 0; i < 30 && r?.s && typeof r.b === 'string'; i++) {
  const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
  if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break; }
  await new Promise((ok) => setTimeout(ok, 2000));
}
for (let i = 0; i < 3 && r?.s === false && r.c; i++) { p[r.c] = 'true'; r = await call(app, path, p); }
log(r?.s, JSON.stringify(r?.s ? { id: r.r?.id, number: r.r?.number } : r?.d ?? r).slice(0, 600));
await browser.close();
