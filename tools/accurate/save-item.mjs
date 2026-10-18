// usage: node save-item.mjs '<overrides json>'  (keys without "param." prefix). New item cloned from item-wire.json.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const o = JSON.parse(process.argv[2]);
const p = JSON.parse(readFileSync(new URL('./item-wire.json', import.meta.url)));
delete p['param.id']; delete p['param.optLock'];
for (const [k, v] of Object.entries(o)) p['param.' + k] = String(v);
const { browser, app } = await openSandbox();
let res = await call(app, '/accurate/inventory/save-item.do', p);
for (let i = 0; i < 3 && res?.s === false && res.c; i++) { log('flag', res.c); p[res.c] = 'true'; res = await call(app, '/accurate/inventory/save-item.do', p); }
log(JSON.stringify(res).slice(0, 400));
await browser.close();
