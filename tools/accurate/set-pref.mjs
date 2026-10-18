// usage: node set-pref.mjs <formData field> <true|false>
// Sets one Preferensi checkbox through the preferences form model and submits it (sandbox only).
import { openSandbox, assertSandbox, log } from './acc.mjs';
const [field, val] = process.argv.slice(2);
const { browser, app } = await openSandbox();
await assertSandbox(app);
await app.evaluate(() => acc.openModule('accurate__company__preferences'));
await app.waitForTimeout(8000);
await assertSandbox(app);
const r = await app.evaluate(async ({ field, val }) => {
  for (const e of document.querySelectorAll('[data-bind]')) { const c = ko.contextFor(e); if (!c) continue
    for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m?.formData && ko.isObservable(m.formData[field])) {
      const before = m.formData[field](); m.formData[field](val === 'true'); m.submitForm(); await new Promise(r => setTimeout(r, 6000)); return { before, after: m.formData[field]() } } }
  return 'field not found'
}, { field, val });
log(JSON.stringify(r), (await app.innerText('body')).replace(/\s+/g, ' ').slice(0, 300));
await browser.close();
