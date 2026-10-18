// usage: node fresh-form.mjs <module> <out.json>
// Serializes a NEW (empty) form of a module with its own _getSubmitData + populateServerParam; nothing is sent.
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { writeFileSync } from 'node:fs';
const [mod, out] = process.argv.slice(2);
const { browser, app } = await openSandbox();
await assertSandbox(app);
await app.evaluate((m) => acc.openModule(m), mod);
await app.waitForTimeout(8000);
await assertSandbox(app);
const d = await app.evaluate(() => {
  for (const e of document.querySelectorAll('[data-bind]')) { const c = ko.contextFor(e); if (!c) continue
    for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m && typeof m._getSubmitData === 'function') { const s = m._getSubmitData(); if (Object.keys(s).length > 10) { const flat = {}; m.populateServerParam(flat, s); return JSON.parse(JSON.stringify(flat)) } } }
  return null
});
writeFileSync(out, JSON.stringify(d, null, 1));
log('keys', d && Object.keys(d).length);
await browser.close();
