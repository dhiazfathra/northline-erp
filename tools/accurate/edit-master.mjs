// usage: node edit-master.mjs <raw.txt from capture-save> <save path> '<overrides json>'  (keys without "param.")
// Re-saves an existing master record (flat param.* form) with overrides; keeps its id/optLock.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const [file, path, o] = process.argv.slice(2);
const p = Object.fromEntries(new URLSearchParams(readFileSync(file, 'utf8')));
delete p._dsi; delete p._usi;
for (const [k, v] of Object.entries(JSON.parse(o))) p['param.' + k] = String(v);
const { browser, app } = await openSandbox();
let res = await call(app, path, p);
for (let i = 0; i < 3 && res?.s === false && res.c; i++) { p[res.c] = 'true'; res = await call(app, path, p); }
log(res?.s, JSON.stringify(res?.s ? { id: res.r?.id } : res?.d ?? res).slice(0, 300));
await browser.close();
