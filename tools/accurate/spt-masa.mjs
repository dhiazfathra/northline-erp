// usage: node spt-masa.mjs <fromDate dd/MM/yyyy> <toDate> [save]
// Opens SPT PPN / PPNBM, loads the period's tax documents, ticks every non-Digunggung row and (with "save") submits.
import { openSandbox, assertSandbox, log } from './acc.mjs';
const [from, to, doSave] = process.argv.slice(2);
const { browser, app } = await openSandbox();
await assertSandbox(app);
await app.evaluate(() => acc.openModule('accurate__report__spt-masa'));
await app.waitForTimeout(8000);
await assertSandbox(app);
const info = await app.evaluate(async ({ from, to }) => {
  const els = [...document.querySelectorAll('[data-bind]')].filter(e => ko.contextFor(e));
  let f = null;
  for (const e of els) { const c = ko.contextFor(e); for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m && typeof m.getDetailSpt === 'function') { f = m; break; } if (f) break; }
  if (!f) return { err: 'no form' };
  window.__spt = f;
  f.formData.isLoading(true); f.formData.fromDate(from); f.formData.toDate(to); f.formData.isLoading(false);
  f.getDetailSpt();
  await new Promise(r => setTimeout(r, 5000));
  const show = (rows) => rows.map(r => ({ n: r.number ?? r.transNumber, dc: r.documentCode, t: r.taxNumber, a: r.taxAmount ?? r.amount, checked: r.checked }));
  for (const r of [...f.formData.detailSptMasaOut(), ...f.formData.detailSptMasaIn()]) if (r.documentCode !== 'DIGUNGGUNG') r.checked = true;
  f.formData.detailSptMasaOut.valueHasMutated(); f.formData.detailSptMasaIn.valueHasMutated();
  return { type: ko.unwrap(f.formData.sptMasaType), out: show(f.formData.detailSptMasaOut()), in: show(f.formData.detailSptMasaIn()), keys: Object.keys(f.formData.detailSptMasaOut()[0] ?? {}).slice(0, 40) };
}, { from, to });
log(JSON.stringify(info).slice(0, 2500));
if (doSave === 'save') {
  await assertSandbox(app);
  const r = await app.evaluate(async () => { try { window.__spt.submitForm(); } catch (e) { return String(e); } await new Promise(r => setTimeout(r, 6000)); return 'submitted'; });
  log(r, (await app.innerText('body')).replace(/\s+/g, ' ').slice(0, 400));
}
await browser.close();
