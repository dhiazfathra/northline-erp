// usage: node report.mjs <planId> '<param json>' <out.json>
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { writeFileSync } from 'node:fs';

export async function runReport(app, planId, param) {
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
    const html = await (await app.request.get(r.host + '/accurate/report/report-output-html.do?' + new URLSearchParams({ _dsi: r.dsi, _usi: r.usi, cacheId: r.cacheId, reportView: 'report' }))).text();
    const rows = await app.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.querySelectorAll('tr')].filter((tr) => !tr.querySelector('tr')).map((tr) => [...tr.querySelectorAll('td,th')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).filter((r) => r.length);
    }, html);
    return { meta: 'ok', rows };
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
