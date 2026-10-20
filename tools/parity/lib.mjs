// Shared helpers for the P4 screen-parity scenarios (docs/goals/full-parity-v2.md §P4, §Evidence).
// Accurate side: tools/accurate session (assertSandbox before every action). ERP side: a local seeded API over HTTP.
import { assertSandbox, DB, red as accRed } from '../accurate/acc.mjs';
import { call } from '../accurate/call.mjs';
import { save as accSave } from '../accurate/forms.mjs';
import { runReport } from '../accurate/report.mjs';

// The ERP login is a local full-access test user (ADR-0040), never NL_EMAIL/NL_PASSWORD; scrubbed like the Accurate secrets.
const ERP = { url: process.env.ERP_URL ?? 'http://localhost:3100', email: process.env.ERP_EMAIL, password: process.env.ERP_PASSWORD };
export const red = (s) => [ERP.email, ERP.password].filter(Boolean).reduce((t, x) => t.split(x).join('[REDACTED]'), accRed(s));

// ---------- Accurate ----------

/** The visible form of module `mod`: the new one (no id) or record `id`. Runs `fn(form, arg)` in the page. */
async function onForm(app, mod, id, fn, arg) {
  for (let i = 0; i < 6; i++) { // the first module of a session renders late, and the Berita tab can take focus after login
    await assertSandbox(app);
    await app.evaluate(({ mod, id }) => acc.openModule(mod, id ? { id } : {}), { mod, id });
    await app.waitForTimeout(5000);
    await assertSandbox(app);
    const r = await app.evaluate(({ id, fn, arg }) => {
    for (const e of document.querySelectorAll('[data-bind]')) { if (!e.getClientRects().length) continue; const c = ko.contextFor(e); if (!c) continue
      for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m && typeof m._getSubmitData === 'function') {
        const s = m._getSubmitData(); if (Object.keys(s).length <= 10 || String(s.id ?? '') !== String(id ?? '')) continue
        return { v: JSON.parse(JSON.stringify(new Function('form', 'arg', `return (${fn})(form, arg)`)(m, arg) ?? null)) } } }
      return null
    }, { id, fn: String(fn), arg });
    if (r) return r.v;
    // a module whose record tab was closed shows its list: bring the new-record tab forward
    if (!id) await app.locator('li:visible, a:visible, span:visible').filter({ hasText: /^\s*Data Baru\s*$/ }).last().click({ timeout: 3000 }).catch(() => {});
  }
  throw new Error(`form ${mod} ${id ?? 'new'} not found`);
}

/** Urls, defaults and the wire body of a NEW form, serialized by the form itself (nothing is sent). */
export const accNewForm = (app, mod) => onForm(app, mod, null, (f) => ({
  urls: { submit: f.root.submitUrl, del: f.root.deleteUrl, select: f.root.selectUrl, search: f.root.searchUrl },
  body: f._doSubmitParam(),
}));

/** Wire body of record `id` after `mutate(formData, arg)` ran on the form's own observables (an edit as the UI makes it). */
export const accEditBody = (app, mod, id, mutate, arg) => onForm(app, mod, id, new Function('f', 'arg',
  `(${mutate})(f.formData, arg, f); const b = f._doSubmitParam(); f.dirtyFlag.reset(); f.root.closeForm(f); return b`), arg); // the edited tab is closed unsaved; the body goes through accSaveBody

/** Detail rows of record `id` as the form holds them (full row objects, reusable as templates for new rows). */
export const accRows = (app, mod, id, key) => onForm(app, mod, id, new Function('f', 'k', 'const r = f.formData[k](); f.root.closeForm(f); return r'), key);

/** The form's own Simpan of a new form after `mutate`: returns the text that appeared on the page (a rejected save). */
export async function accUiReject(app, mod, mutate, arg) {
  const sent = [];
  const h = (rq) => { if (rq.method() === 'POST' && /save/.test(rq.url())) sent.push(new URL(rq.url()).pathname) };
  app.on('request', h);
  try {
    await onForm(app, mod, null, () => { window.__nlBefore = new Set(document.body.innerText.split('\n').map((t) => t.trim())) });
    await onForm(app, mod, null, new Function('f', 'arg', `(${mutate})(f.formData, arg, f); f.submitForm(); return null`), arg);
    await app.waitForTimeout(4000);
    const shown = await app.evaluate(() => document.body.innerText.split('\n').map((t) => t.trim()).filter((t) => t && !window.__nlBefore.has(t)).slice(0, 8));
    return { shown, sent };
  } finally { app.off('request', h) }
}

/** Server save (follows background saves and warning flags). */
export const accSaveBody = (app, path, body) => accSave(app, path, body);
/** Validation text of a failed Accurate save/delete. */
export const accMessage = (r) => { const d = r?.d ?? r; return (Array.isArray(d) || typeof d !== 'object' ? [d] : Object.values(d)).flat().map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('; ').trim() };
export const accDelete = (app, path, id) => accSave(app, path, { id }); // follows background deletes (bg-delete-*)
export const accView = (app, path, id) => call(app, path, { id });
export const accSearch = (app, path, keywords) => call(app, path, { keywords }).then((r) => (r?.d ?? []).map((x) => x.number));

/** Keseluruhan Jurnal (AllJournalReport) for a window; the ERP prints the same rows (verified, docs/reports/AllJournalReport.md). */
export async function accJournal(app, from, to) {
  const d = (s) => s.split('-').reverse().join('/');
  const r = await runReport(app, 'AllJournalReport', { startDate: d(from), endDate: d(to), selectedBranch: [{ name: '[Semua Cabang]', id: null }] });
  return r.rows ? reportBody(r.rows) : { error: r.error };
}
/** Report rows without Accurate's print header (company, title, period, branch) and footer; an empty report is []. */
export function reportBody(rows) {
  const start = rows.findIndex((r) => r[0] === 'Tanggal' || r[0] === 'Nomor #');
  const body = rows.slice(start < 0 ? rows.length : start).filter((r) => !/^(ACCURATE Accounting System Report|Tercetak pada|Halaman)/.test(r[0]));
  return body.some((r) => r.some((c) => /\d/.test(c))) ? body : [];
}

/**
 * Masked screenshot: the header (Data Usaha name and user menu) and any text holding the Data Usaha name, an email, an
 * IP or the version/session tag (`v1.0.1#NNNN-NNNNNNN`) get visibility:hidden plus a solid overlay; the mask is asserted by computed style and the capture aborts if it fails.
 */
export async function accShot(app, path, { mod, id } = {}) {
  await assertSandbox(app);
  if (mod) { await app.evaluate(({ mod, id }) => acc.openModule(mod, id ? { id } : {}), { mod, id }); await app.waitForTimeout(6000); await assertSandbox(app) }
  const ok = await app.evaluate((db) => {
    const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/, IP = /\b\d{1,3}(\.\d{1,3}){3}\b/, VER = /\bv\s?\d+\.\d+\.\d+#\d+(-\d+)?/ // VER: the top-left version/session tag
    const leaks = (t) => t.includes(db) || EMAIL.test(t) || IP.test(t) || VER.test(t)
    const targets = new Set(document.querySelectorAll('.user-id, .user-id-name, span.first-name'))
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n; (n = walk.nextNode());) if (leaks(n.textContent) && n.parentElement) targets.add(n.parentElement)
    for (const el of targets) {
      const r = el.getBoundingClientRect()
      el.style.setProperty('visibility', 'hidden', 'important')
      if (!r.width || !r.height) continue
      const o = document.createElement('div'); o.className = 'nl-mask'
      Object.assign(o.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', background: '#222', zIndex: 2147483647 })
      document.body.appendChild(o)
    }
    // assert: every target hidden by computed style, header targets present, and no visible text node still leaks
    if (![...targets].length || [...targets].some((el) => getComputedStyle(el).visibility !== 'hidden')) return false
    const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n; (n = w2.nextNode());) if (leaks(n.textContent) && n.parentElement && getComputedStyle(n.parentElement).visibility !== 'hidden' && n.parentElement.getClientRects().length) return false
    return true
  }, DB);
  if (!ok) throw new Error('mask assert failed; capture aborted');
  await app.screenshot({ path });
  await app.evaluate(() => { document.querySelectorAll('.nl-mask').forEach((o) => o.remove()) });
}

// ---------- ERP ----------

let cookie = '';
export async function erpLogin() {
  if (!ERP.email || !ERP.password) throw new Error('ERP_EMAIL / ERP_PASSWORD (local full-access user) missing');
  const r = await fetch(ERP.url + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: ERP.email, password: ERP.password }) });
  if (!r.ok) throw new Error('ERP login failed ' + r.status);
  cookie = r.headers.get('set-cookie').split(';')[0];
}
export async function erp(method, path, body) {
  const r = await fetch(ERP.url + '/api' + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j; try { j = JSON.parse(t) } catch { j = t }
  return { status: r.status, body: j };
}
// shortcut: report routes read projections without an `after` position; a pause lets the worker catch up. Pass the
// command's globalPosition through when the general-ledger routes accept `after`.
export const erpSettle = () => new Promise((ok) => setTimeout(ok, 1500));
export const erpJournal = async (from, to) => (await erp('GET', `/reports/general-ledger/all-journals?from=${from}&to=${to}`)).body;
/** First validation text of an ERP error body (zod issue or domain error). */
export const erpMessage = (b) => b?.issues ? b.issues.map((i) => i.message).join('; ') : b?.error ?? JSON.stringify(b);

/** ERP evidence screenshot: the request and the API's answer rendered as a page (the web doc screens are still mocks). */
export async function erpShot(browser, path, title, request, response) {
  const p = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const esc = (s) => red(typeof s === 'string' ? s : JSON.stringify(s, null, 1)).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  await p.setContent(`<body style="font:13px ui-monospace,monospace;margin:16px;background:#fff;color:#111"><h3 style="font-family:sans-serif">Northline ERP (local API) — ${esc(title)}</h3>
    <b>Request</b><pre style="background:#f4f4f4;padding:8px;white-space:pre-wrap">${esc(request)}</pre><b>Response</b><pre style="background:#eef6ee;padding:8px;white-space:pre-wrap">${esc(response)}</pre></body>`);
  await p.screenshot({ path, fullPage: true });
  await p.close();
}

// ---------- comparison ----------

/** Number format with the running sequence masked (reruns advance Accurate's counter; neither side reuses numbers). */
export const numFmt = (n) => (n ?? '').replace(/\d{5}$/, 'nnnnn');
/** Report rows with every document number's running sequence masked. */
export const seqMask = (rows) => JSON.parse(JSON.stringify(rows).replace(/(\.\d{4}\.\d{2}\.)\d{5}/g, '$1nnnnn'));

// Form keys that are bookkeeping, not fields a user fills (ids, locks, auto-number state, computed totals, print/approval state).
const TECHNICAL = /^(uniqueDataNumber|transaction|id|optLock|createdBy|typeAutoNumber|countAutoNumber|transactionType|transactionTypeName|transactionId|transNumber|recurringDetail|ignoreWarning|isLoading|draft|isReadOnly|journal|attachmentCount|commentCount|approval\w*|rejectionReason|saveAsStatusType|userPrinted|printUserName|printedTime|posCreateDate|settingId|needDetailResult|forceCalculate\w*|canProcess|lastCash\w*|total\w*|ft\w*|prime\w*|tax\d*Amount\w*|owing\w*|status\w*|has\w*|is[A-Z]\w*|\w*History|\w*List|detail\w*)$/;
/** Header fields of an Accurate form with no ERP counterpart in `map` (keys: Accurate field, values: ERP field). */
export function fieldGap(body, map) {
  if (typeof body._param === 'string') body = JSON.parse(body._param); // transaction forms post one nested `_param`
  const custom = []; const gap = new Set();
  for (const k0 of Object.keys(body)) {
    const k = k0.replace(/^param\./, '').replace(/(IdId|Id)$/, '');
    if (k.includes('[') || !k || TECHNICAL.test(k) || k in map) continue;
    if (/^(searchCharField|charField|numericField|dateField)\d+$/.test(k)) { custom.push(k); continue }
    gap.add(k);
  }
  return [...gap, ...(custom.length ? ['custom fields (charField1-10, numericField1-10, dateField1-2)'] : [])];
}

/** One comparison row; `same` defaults to deep equality of the two values. */
export const row = (aspect, accurate, northline, same = JSON.stringify(accurate) === JSON.stringify(northline)) => ({ aspect, accurate, northline, same });

// ---------- the scenario flow (same steps on both sides) ----------

const dmy = (d) => d.split('-').reverse().join('/');
export { dmy };

/**
 * Accurate side: create → edit → journal → rejected save (server, then the form's own Simpan for the screenshot) →
 * delete → journal + list. `s`: { mod, date, keyword, fieldMap, create(f), edit: { mutate, arg }, reject: { body(f), ui?(tpl) },
 * rowsKey?, journal?: (app) => rows }.
 */
export async function accFlow({ app, log, shot }, s) {
  const x = s.setup ? await s.setup(app, log) : {}; // e.g. the loan a disbursement draws on
  const f = await accNewForm(app, s.mod);
  const defaults = s.defaults(f.body);
  log('new form defaults', defaults);
  const c = await accSaveBody(app, f.urls.submit, { ...f.body, ...s.create(f, x) });
  log('create', c?.s, c?.r?.number ?? accMessage(c));
  if (!c?.s) throw new Error('Accurate create failed: ' + accMessage(c));
  const id = c.r.id, number = c.r.number;
  await accShot(app, shot('create'), { mod: s.mod, id });
  const e = await accSaveBody(app, f.urls.submit, await accEditBody(app, s.mod, id, s.edit.mutate, typeof s.edit.arg === 'function' ? s.edit.arg(x) : s.edit.arg));
  log('edit', e?.s, e?.r?.number ?? accMessage(e));
  await accShot(app, shot('edit'), { mod: s.mod, id });
  const view = (await accView(app, f.urls.select, id))?.d;
  const journal = s.journal ? await s.journal(app, view) : await accJournal(app, s.date, s.date);
  log('journal after edit', journal);
  await accShot(app, shot('journal'));
  const rj = await accSaveBody(app, f.urls.submit, { ...f.body, ...s.reject.body(f) });
  log('reject', rj?.s, accMessage(rj));
  if (rj?.s) { log('UNEXPECTED: bad input saved; deleting', rj.r?.number); await accDelete(app, f.urls.del, rj.r.id) }
  if (s.reject.ui) {
    const tpl = s.rowsKey ? await accRows(app, s.mod, id, s.rowsKey) : null;
    const ui = await accUiReject(app, s.mod, s.reject.ui.mutate, s.reject.ui.arg(tpl));
    log('reject (form Simpan)', ui);
  }
  await accShot(app, shot('reject'));
  const listed = await accSearch(app, f.urls.search, number);
  const extra = s.beforeDelete ? await s.beforeDelete(app, x, log) : null;
  const d = await accDelete(app, f.urls.del, id);
  log('delete', d?.s, accMessage(d));
  const afterDelete = s.journal ? await s.journal(app, view, true) : await accJournal(app, s.date, s.date);
  const listedAfter = await accSearch(app, f.urls.search, number);
  log('journal after delete', afterDelete, 'list before/after', listed, listedAfter);
  await accShot(app, shot('delete'), { mod: s.mod });
  if (s.teardown) await s.teardown(app, x, log);
  return { extra, fields: fieldGap(f.body, s.fieldMap), defaults, number, editedNumber: e?.r?.number ?? view?.number, edit: e?.s ? 'saved' : accMessage(e), view, journal,
    reject: { saved: !!rj?.s, message: accMessage(rj) }, deleted: !!d?.s, afterDelete, listed: listed.includes(number), listedAfter: listedAfter.includes(number) };
}

/**
 * ERP side, same steps. `s`: { date, defaults, create: () => req, number(res), edit(number) => req, reject: () => req,
 * del(number) => req, list() => GET path, journal?: () => rows }. A req is [method, path, body].
 */
export async function erpFlow({ log, shot, browser }, s) {
  const send = async (step, [m, p, b]) => { const r = await erp(m, p, b); await erpSettle(); log(step, m, p, r.status, r.body); return r };
  const journal = () => (s.journal ? s.journal() : erpJournal(s.date, s.date));
  const inList = async (n) => JSON.stringify((await erp('GET', s.list())).body).includes(n);
  const x = s.setup ? await s.setup(send) : {};
  const cq = s.create(x), c = await send('create', cq);
  if (c.status >= 300) throw new Error('ERP create failed: ' + erpMessage(c.body));
  const number = await s.number(c.body);
  await erpShot(browser, shot('create'), `${cq[0]} ${cq[1]}`, cq[2], { status: c.status, body: c.body, number });
  const eq = s.edit(number, x), e = await send('edit', eq);
  await erpShot(browser, shot('edit'), `${eq[0]} ${eq[1]}`, eq[2], e);
  const editedNumber = e.body?.number ?? number;
  const j = await journal();
  log('journal after edit', j);
  await erpShot(browser, shot('journal'), 'journal after edit', s.journal ? 'journal' : { from: s.date, to: s.date }, j);
  const rq = s.reject(x), rj = await send('reject', rq);
  await erpShot(browser, shot('reject'), `${rq[0]} ${rq[1]} (bad input)`, rq[2], rj);
  const listed = await inList(editedNumber);
  const extra = s.beforeDelete ? await s.beforeDelete(send, x) : null;
  const dq = s.del(editedNumber, x), d = await send('delete', dq);
  const afterDelete = await journal(), listedAfter = await inList(editedNumber);
  log('journal after delete', afterDelete, 'list before/after', listed, listedAfter);
  await erpShot(browser, shot('delete'), `${dq[0]} ${dq[1]}`, dq[2], { ...d, journalAfterDelete: afterDelete, listedAfterDelete: listedAfter });
  if (s.teardown) await s.teardown(send, x);
  return { extra, fields: [], defaults: s.defaults, number, editedNumber, edit: e.status < 300 ? 'saved' : erpMessage(e.body), journal: j, reject: { saved: rj.status < 300, message: erpMessage(rj.body) },
    deleted: d.status < 300, afterDelete, listed, listedAfter };
}

/** The aspects every scenario compares; `extra` adds form-specific rows. */
export const compareFlow = (a, e, extra = []) => [
  row('numbering', numFmt(a.number), numFmt(e.number)), row('number kept on edit', a.editedNumber === a.number, e.editedNumber === e.number),
  row('edit', a.edit, e.edit), row('journal after edit', seqMask(a.journal), seqMask(e.journal)),
  row('rejected save', a.reject.saved, e.reject.saved), row('validation message', a.reject.message, e.reject.message),
  row('delete', a.deleted, e.deleted), row('journal after delete', seqMask(a.afterDelete), seqMask(e.afterDelete)),
  row('list/search after create', a.listed, e.listed), row('list/search after delete', a.listedAfter, e.listedAfter),
  row('defaults', a.defaults, e.defaults), row('header fields without an ERP counterpart', a.fields, e.fields), ...extra,
];
export const today = () => new Date().toLocaleDateString('en-GB');
