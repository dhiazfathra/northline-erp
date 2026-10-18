// usage: node item-flat.mjs <itemId> <out.json>
// Serializes an existing item with the form's own _getSubmitData + populateServerParam (flat param.* keys); nothing is sent.
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { writeFileSync } from 'node:fs';
const [id, out] = process.argv.slice(2);
const { browser, app } = await openSandbox();
await assertSandbox(app);
await app.evaluate((id) => acc.openModule('accurate__inventory__item', { id: Number(id) }), id);
await app.waitForTimeout(9000);
await assertSandbox(app);
const d = await app.evaluate(() => {
  const seen = new Set()
  for (const e of document.querySelectorAll('[data-bind]')) { const c = ko.contextFor(e); if (!c) continue
    for (const m of [c.$data, ...(c.$parents || []), c.$root]) { if (!m || seen.has(m)) continue; seen.add(m)
      if (typeof m._getSubmitData === 'function' && typeof m.populateServerParam === 'function') {
        try { const s = m._getSubmitData(); if (Object.keys(s).length < 20) continue; const flat = {}; m.populateServerParam(flat, s); return JSON.parse(JSON.stringify(flat)) } catch (e) { return { err: String(e) } } } } }
  return null
});
writeFileSync(out, JSON.stringify(d, null, 1));
log('keys', d && Object.keys(d).length, d?.err ?? '');
await browser.close();
