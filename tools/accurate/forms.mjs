// Form helpers for scripted sandbox sessions (session.mjs steps). Every call asserts the sandbox first.
import { assertSandbox } from './acc.mjs';
import { call } from './call.mjs';

/** Flat `param.*` body of a record's edit form (id 0 or omitted = new form), serialized by the form itself. */
export async function formParams(app, mod, id) {
  await assertSandbox(app);
  await app.evaluate(({ mod, id }) => acc.openModule(mod, id ? { id } : {}), { mod, id });
  await app.waitForTimeout(7000);
  await assertSandbox(app);
  return app.evaluate((id) => {
    // several module tabs can be open: take the form whose own id is the requested record
    for (const e of document.querySelectorAll('[data-bind]')) { const c = ko.contextFor(e); if (!c) continue
      for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m && typeof m._getSubmitData === 'function') {
        const s = m._getSubmitData(); if (Object.keys(s).length <= 10) continue
        const flat = {}; m.populateServerParam(flat, s)
        if (String(flat.id ?? '') === String(id ?? '')) return Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(flat))).map(([k, v]) => ['param.' + k, v])) } }
    return null;
  }, id);
}

/** Nested `_getSubmitData()` of a transaction form (the `_param` JSON of bg-save endpoints). */
export async function formData(app, mod, id) {
  await assertSandbox(app);
  await app.evaluate(({ mod, id }) => acc.openModule(mod, { id }), { mod, id });
  await app.waitForTimeout(7000);
  await assertSandbox(app);
  return app.evaluate((id) => {
    for (const e of document.querySelectorAll('[data-bind]')) { const c = ko.contextFor(e); if (!c) continue
      for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m && typeof m._getSubmitData === 'function') {
        const s = m._getSubmitData(); if (String(s.id ?? '') === String(id)) return JSON.parse(JSON.stringify(s)) } }
    return null;
  }, id);
}

/** Body the record's own Simpan would send (request aborted, nothing persists); `_param` arrives decoded. */
export async function captureWire(app, mod, id, re) {
  let body = null;
  const handler = async (route) => { body = route.request().postData(); await route.abort(); };
  await app.route(re, handler);
  try {
    await assertSandbox(app);
    await app.evaluate(({ mod, id }) => acc.openModule(mod, { id }), { mod, id });
    await app.waitForTimeout(7000);
    await assertSandbox(app);
    await app.evaluate((id) => {
      for (const e of document.querySelectorAll('[data-bind]')) { const c = ko.contextFor(e); if (!c) continue
        for (const m of [c.$data, ...(c.$parents || []), c.$root]) if (m && typeof m._getSubmitData === 'function' && String(m._getSubmitData().id ?? '') === String(id)) return m.submitForm() }
    }, id);
    for (let i = 0; i < 20 && !body; i++) await app.waitForTimeout(500);
  } finally { await app.unroute(re, handler); }
  if (!body) return null;
  const p = Object.fromEntries(new URLSearchParams(body)); delete p._dsi; delete p._usi;
  if (p._param) p._param = JSON.parse(p._param);
  return p;
}

/** POST a flat body to a save endpoint; follows background saves and resends with warning flags set. */
export async function save(app, path, body) {
  const p = Object.fromEntries(Object.entries(body).filter(([k]) => k !== '_dsi' && k !== '_usi').map(([k, v]) => [k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')]));
  let r;
  for (let i = 0; i < 4; i++) {
    r = await call(app, path, p);
    for (let j = 0; j < 30 && r?.s && typeof r.b === 'string'; j++) {
      const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
      if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break }
      await new Promise((ok) => setTimeout(ok, 2000));
    }
    if (r?.s === false && r.c) { p[r.c] = 'true'; continue }
    break;
  }
  return r;
}

/** New-record body from a captured flat body: drops ids, optimistic locks, numbers; detail rows become inserts. */
export function asNew(body) {
  const p = {};
  for (const [k, v] of Object.entries(body)) {
    if (/^param\.(id|optLock|number|journalId|createdBy)$|\]\.(id|optLock)$|^_/.test(k)) continue;
    p[k] = /\]\._status$/.test(k) ? 'insert' : v;
  }
  return p;
}
