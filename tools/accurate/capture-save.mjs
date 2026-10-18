// usage: node capture-save.mjs <module> <id> <save-path-regex> <out>
// Opens an existing record, clicks Simpan, ABORTS the save request, writes its body. Never persists.
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { writeFileSync } from 'node:fs';
const [mod, id, re, out] = process.argv.slice(2);
const { browser, app } = await openSandbox();
let body = null;
let hdr = null;
await app.route(new RegExp(re), async (route) => { body = route.request().postData(); hdr = route.request().headers()['content-type']; await route.abort(); });
await assertSandbox(app);
await app.evaluate(({ mod, id }) => acc.openModule(mod, { id: Number(id) }), { mod, id });
await app.waitForTimeout(8000);
await assertSandbox(app);
log((await app.innerText('body')).replace(/\s+/g, ' ').slice(0, 500));
log(await app.evaluate(() => [...document.querySelectorAll('button, a, [data-bind*=save i]')].filter(e => e.offsetParent && /save|simpan/i.test(e.outerHTML)).map(e => e.outerHTML.slice(0, 200)).slice(0, 8)));
const btn = app.locator('button:visible[data-bind*="doSave"], button:visible[data-bind*="save" i]').first();
log('save btn', await btn.count());
const methods = await app.evaluate(() => {
  const els = [...document.querySelectorAll('[data-bind]')].filter(e => e.getClientRects().length && ko.contextFor(e));
  const seen = new Set(), out = [];
  for (const e of els) { const c = ko.contextFor(e); for (const m of [c.$data, ...(c.$parents || []), c.$root]) {
    if (!m || typeof m !== 'object' || seen.has(m)) continue; seen.add(m);
    let o = m; const names = new Set();
    while (o && o !== Object.prototype) { Object.getOwnPropertyNames(o).forEach(n => names.add(n)); o = Object.getPrototypeOf(o); }
    for (const n of names) { try { if (typeof m[n] === 'function' && /submit|Param|serial|execute|commit/i.test(n) && !/Layout|Storage|Memorize|Grid|Column|Filter/.test(n)) { out.push((m.constructor?.name||'?') + '.' + n); (window.__ms ||= []).push([m, n]); } } catch {} }
  } }
  return out.slice(0, 40);
});
log('save methods', methods);
await assertSandbox(app);

const ser = await app.evaluate(() => {
  const forms = [...new Set((window.__ms || []).filter(([m, n]) => n === '_getSubmitData').map(([m]) => m))];
  const res = [];
  for (const f of forms) { try { const d = f._getSubmitData(); const flat = {}; f.populateServerParam(flat, d); const j = { flat, json: f._convertToExperimentalJsonParam({ ...flat }) }; res.push({ d, j }); } catch (e) { res.push({ err: String(e) }); } }
  return JSON.parse(JSON.stringify(res));
});
writeFileSync(out.replace('.json', '-ser.json'), JSON.stringify(ser, null, 1));
log('serialized forms', ser.map(r => r.err ?? Object.keys(r.d ?? {}).length + ' keys / json ' + (r.j ? Object.keys(r.j).join(',') : '-')));
await assertSandbox(app);
await app.evaluate(() => { const f = (window.__ms || []).find(([m, n]) => n === '_getSubmitData' && Object.keys(m._getSubmitData()).length > 50)?.[0]; window.__f = f; try { f.submitForm(); } catch (e) { console.log(String(e)); } });
await app.waitForTimeout(5000);
if (body) {
  const p = new URLSearchParams(body); p.delete('_dsi'); p.delete('_usi');
  writeFileSync(out, JSON.stringify(Object.fromEntries(p), null, 1));
  log('content-type', hdr, 'len', body.length, 'keys', [...p.keys()].length, [...p.keys()].slice(0, 12));
  writeFileSync(out.replace('.json', '-raw.txt'), body.replace(/(_dsi|_usi)=[^&]*/g, '$1=x'));
} else log('no save captured');
await browser.close();
