// usage: node report.mjs <planId> '<param json>' <out.json>
import { openSandbox, assertSandbox, log, red } from './acc.mjs';
import { writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export async function runReport(app, planId, param, { keepEmpty = false, view = 'report', raw = false, input = {} } = {}) {
  await assertSandbox(app);
  if (!(await app.evaluate(() => acc.isModuleOpened?.('accurate__report__report')))) { await app.evaluate(() => acc.openModule('accurate__report__report')); await app.waitForTimeout(4000); await assertSandbox(app); }
  return app.evaluate(async ({ planId, param, input }) => {
    const post = async (url, body) => {
      const fd = new URLSearchParams({ ...body, _dsi: acc._dsi, _usi: acc._usi });
      const r = await fetch(url, { method: 'POST', body: fd, credentials: 'include', headers: { accept: 'application/json, text/javascript, */*; q=0.01' } });
      return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
    };
    const reportInput = JSON.stringify({ param, filter: [], subSelection: 0, selection: [], ...input });
    await post('/accurate/report/report-input.do', { id: 0, planId });
    await post('/accurate/report/init-report-input.do', { id: 0, planId });
    let d = await post('/accurate/report/bg-execute-report.do', { id: 0, planId, reportInput, cacheId: '', pageIndex: 0 });
    if (!d.s) return { error: d };
    const first = JSON.stringify(d).slice(0, 400); let bgPid = d.b;
    for (let i = 0; i < 60; i++) {
      const p = await post('/accurate/company/bg-proc-response.do', { bgPid, keepCache: true });
      if (p.d?.status !== 'RUNNING') { d = p; break; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    const cacheId = d.d?.response?.cacheId ?? d.d?.cacheId ?? d.d?.result?.cacheId ?? d.cacheId ?? (typeof d.d === 'string' ? d.d : undefined); const pollRaw = JSON.stringify(d).slice(0, 300);
    return { first: pollRaw, meta: d.d, cacheId, dsi: acc._dsi, usi: acc._usi, host: acc.reportHost };
  }, { planId, param, input }).then(async (r) => {
    if (r.error || !r.cacheId) return { error: { first: r.first, poll: r.meta } };
    if (planId === 'AuditListReport' && view === 'report') { // xlsx export, rebuilt into logical rows; identity columns never returned
      const b = await (await app.request.get(r.host + '/accurate/report/export-report.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, exportType: 'xls' }))).body();
      return { meta: 'ok', rows: auditRecords(xlsxRows(b), await auditVocabulary(app)).map((row) => row.map(red)) } }
    // download-type reports: the HTML view of the cache is the file body (an export call afterwards finds the cache expired)
    if (view === 'csv') { const t = await (await app.request.get(r.host + '/accurate/report/report-output-html.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, reportView: 'download' }))).text(); const link = /"downloadLink":"([^"]+)"/.exec(t)?.[1]?.replace(/\\u0026/g, '&');
      const zip = link ? (await (await app.request.get(r.host + link)).body()).toString('base64') : null
      return { meta: 'ok', csv: red(t), zip } }
    const html = await (await app.request.get(r.host + '/accurate/report/report-output-html.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, reportView: view === 'xls' ? 'chart' : view }))).text();
    if (raw && planId === 'AuditListReport') throw new Error('raw HTML of AuditListReport carries the login and IP; refused');
    if (raw) return { meta: 'ok', html: red(html) } // chart views render a PNG; use xls for the numbers
    if (view === 'xls') { const b = await (await app.request.get(r.host + '/accurate/report/export-report.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, exportType: 'xls' }))).body(); return { meta: 'ok', xls: b } }
    const rows = await app.evaluate(({ html, keepEmpty }) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.querySelectorAll('tr')].filter((tr) => !tr.querySelector('tr')).map((tr) => [...tr.querySelectorAll('td,th')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).filter((r) => keepEmpty || r.length); // keepEmpty: blank spacer rows matter for two-column layouts
    }, { html, keepEmpty });
    // Secrets (e.g. the login shown in 'Direkonsiliasi Oleh') never leave the runner: scrubbed before any caller sees rows.
    return { meta: 'ok', rows: rows.map((r) => r.map(red)) };
  });
}

// Daftar Log Aktifitas prints the real login, email and IP in grid columns 12/14/16 (Pengguna | Email | Alamat IP); they are
// replaced by fixture placeholders and never returned. Jasper splits a record across a page break: the tail lands on the next
// page as a row without an action cell, and both halves carry hard line breaks where the text wrapped. Tails are merged back,
// and ref/type text is restored from Accurate's own activity list (`search-audit.do`), matched ignoring whitespace.
export const AUDIT_ID = ['nl-tester', 'nl-tester@example.test', '203.0.113.10'];
const AUDIT_COLS = ['No/Nama Referensi', 'Tgl Transaksi', 'Tipe Tindakan', 'Tipe Transaksi', 'Tanggal', 'Pengguna', 'Email', 'Alamat IP'];
export async function auditVocabulary(app) {
  await assertSandbox(app);
  return app.evaluate(async () => {
    const post = async (url, body) => (await fetch(url, { method: 'POST', body: new URLSearchParams({ ...body, _dsi: acc._dsi, _usi: acc._usi }), credentials: 'include', headers: { accept: 'application/json' } })).json();
    await post('/accurate/company/init-audit.do', {});
    const v = new Set();
    for (let start = 0; ; start += 500) {
      const r = await post('/accurate/company/search-audit.do', { keywords: '', resetFilter: 'false', 'sp.pageSize': 500, 'sp.start': start, 'sp.limit': 500 });
      const rows = Object.values(r.d ?? {});
      for (const x of rows) { v.add(x.description); v.add(x.transactionTypeName) } // only these two fields leave the page
      if (rows.length < 500) break;
    }
    return [...v].filter(Boolean);
  });
}
export function auditRecords(rows, vocab) {
  const key = (t) => t.replace(/\s+/g, '');
  const byKey = new Map(vocab.map((t) => [key(t), t]));
  const out = [], seen = new Set(), recs = [];
  for (const r of rows) {
    if (r[1]) { if (/^(Daftar Log Aktifitas|Dari )/.test(r[1]) && !seen.has(r[1])) { seen.add(r[1]); out.push([r[1]]) } continue }
    if (r[2] === AUDIT_COLS[0]) { if (!seen.has('h')) { seen.add('h'); out.push(AUDIT_COLS) } continue }
    if (r[6]) { recs.push([2, 4, 6, 8, 10].map((k) => r[k] ?? '').concat([12, 14, 16].map((k, i) => (r[k] ? AUDIT_ID[i] : '')))); continue }
    const last = recs.at(-1);
    if (!last) throw new Error('auditRecords: continuation before first record');
    for (const [i, k] of [[0, 2], [1, 4], [3, 8], [4, 10]]) if (r[k]) last[i] = last[i] ? last[i] + ' ' + r[k] : r[k];
    for (const [i, k] of [[5, 12], [6, 14], [7, 16]]) if (r[k]) last[i] = AUDIT_ID[i - 5];
  }
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = (v) => { if (!/^\d+(\.0+)?$/.test(v)) return v; const d = new Date(Date.UTC(1899, 11, 30) + Number(v) * 864e5); // xlsx date serial
    return `${String(d.getUTCDate()).padStart(2, '0')} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}` };
  for (const rec of recs) { for (const i of [0, 3]) rec[i] = byKey.get(key(rec[i])) ?? rec[i]; rec[1] = day(rec[1]); rec[4] = day(rec[4]) }
  return out.concat(recs);
}

// Minimal xlsx reader (stored/deflated zip + sharedStrings + first sheet): rows as arrays indexed by column, '' for gaps.
export function xlsxRows(buf) {
  const files = {};
  let e = buf.length - 22; while (buf.readUInt32LE(e) !== 0x06054b50) e--;
  for (let o = buf.readUInt32LE(e + 16), n = buf.readUInt16LE(e + 10); n--;) {
    const method = buf.readUInt16LE(o + 10), size = buf.readUInt32LE(o + 20), nl = buf.readUInt16LE(o + 28), xl = buf.readUInt16LE(o + 30), cl = buf.readUInt16LE(o + 32), lo = buf.readUInt32LE(o + 42);
    const name = buf.toString('utf8', o + 46, o + 46 + nl);
    const start = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28);
    const raw = buf.subarray(start, start + size);
    files[name] = (method === 8 ? inflateRawSync(raw) : raw).toString('utf8');
    o += 46 + nl + xl + cl;
  }
  const xml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const ss = [...(files['xl/sharedStrings.xml'] ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const sheet = files[Object.keys(files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort()[0]];
  const col = (ref) => [...ref.replace(/\d+/, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((m) => {
    const r = [];
    for (const c of m[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] ?? '')?.[1];
      if (v === undefined) continue;
      r[col(c[1])] = /t="s"/.test(c[2]) ? ss[+v] : xml(v);
    }
    return Array.from(r, (x) => (x ?? '').replace(/\s+/g, ' ').trim());
  }).filter((r) => r.some(Boolean));
}

if (process.argv[1].endsWith('report.mjs')) {
  const [planId, p, out] = process.argv.slice(2);
  const { browser, app } = await openSandbox();
  const res = await runReport(app, planId, JSON.parse(p));
  if (out) writeFileSync(out, JSON.stringify({ planId, param: JSON.parse(p), rows: res.rows }, null, 1));
  log(res.error ?? res.meta, 'rows', res.rows?.length);
  log(JSON.stringify(res.rows?.slice(0, 15)));
  await browser.close();
}
