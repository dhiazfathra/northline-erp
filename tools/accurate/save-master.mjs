// usage: node save-master.mjs <wire.json> <save path> '<overrides json>'  (keys without "param." prefix)
// New master record (customer, vendor, item, ...) cloned from a flat param.* wire captured with capture-save.mjs.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const [file, path, o] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file));
for (const k of Object.keys(p)) if (/(^|\.)(id|optLock)$/.test(k)) delete p[k];
for (const [k, v] of Object.entries(JSON.parse(o))) p['param.' + k] = String(v);
const { browser, app } = await openSandbox();
let res = await call(app, path, p);
for (let i = 0; i < 3 && res?.s === false && res.c; i++) { log('flag', res.c); p[res.c] = 'true'; res = await call(app, path, p); }
log(res?.s, JSON.stringify(res?.s ? { id: res.r?.id } : res?.d ?? res).slice(0, 400));
await browser.close();
