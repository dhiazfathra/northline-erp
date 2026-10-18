// usage: node report.mjs <planId> '<param json>' <out.json>
import { openSandbox, assertSandbox, log, red } from './acc.mjs';
import { writeFileSync } from 'node:fs';

export async function runReport(app, planId, param, { keepEmpty = false, view = 'report', raw = false } = {}) {
  await assertSandbox(app);
  if (!(await app.evaluate(() => acc.isModuleOpened?.('accurate__report__report')))) { await app.evaluate(() => acc.openModule('accurate__report__report')); await app.waitForTimeout(4000); await assertSandbox(app); }
  return app.evaluate(async ({ planId, param }) => {
    const post = async (url, body) => {
      const fd = new URLSearchParams({ ...body, _dsi: acc._dsi, _usi: acc._usi });
      const r = await fetch(url, { method: 'POST', body: fd, credentials: 'include', headers: { accept: 'application/json, text/javascript, */*; q=0.01' } });
      return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
    };
    const reportInput = JSON.stringify({ param, filter: [], subSelection: 0, selection: [] });
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
  }, { planId, param }).then(async (r) => {
    if (r.error || !r.cacheId) return { error: { first: r.first, poll: r.meta } };
    // download-type reports: the HTML view of the cache is the file body (an export call afterwards finds the cache expired)
    if (view === 'csv') { const t = await (await app.request.get(r.host + '/accurate/report/report-output-html.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, reportView: 'download' }))).text(); const link = /"downloadLink":"([^"]+)"/.exec(t)?.[1]?.replace(/\\u0026/g, '&');
      const zip = link ? (await (await app.request.get(r.host + link)).body()).toString('base64') : null
      return { meta: 'ok', csv: red(t), zip } }
    const html = await (await app.request.get(r.host + '/accurate/report/report-output-html.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, reportView: view === 'xls' ? 'chart' : view }))).text();
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

if (process.argv[1].endsWith('report.mjs')) {
  const [planId, p, out] = process.argv.slice(2);
  const { browser, app } = await openSandbox();
  const res = await runReport(app, planId, JSON.parse(p));
  if (out) writeFileSync(out, JSON.stringify({ planId, param: JSON.parse(p), rows: res.rows }, null, 1));
  log(res.error ?? res.meta, 'rows', res.rows?.length);
  log(JSON.stringify(res.rows?.slice(0, 15)));
  await browser.close();
}
