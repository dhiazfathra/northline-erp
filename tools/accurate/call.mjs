// usage: node call.mjs <path.do> '<json body>' [out]   (read-only probing; writes go through dedicated scripts)
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { writeFileSync } from 'node:fs';
export async function call(app, path, body) {
  await assertSandbox(app);
  return app.evaluate(async ({ path, body }) => {
    const fd = new URLSearchParams({ ...body, _dsi: acc._dsi, _usi: acc._usi });
    const r = await fetch(path, { method: 'POST', body: fd, credentials: 'include', headers: { accept: 'application/json, text/javascript, */*; q=0.01' } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return t.slice(0, 2000); }
  }, { path, body });
}
if (process.argv[1].endsWith('call.mjs')) {
  const [path, b, out] = process.argv.slice(2);
  const { browser, app } = await openSandbox();
  const res = await call(app, path, JSON.parse(b || '{}'));
  if (out) writeFileSync(out, JSON.stringify(res, null, 1));
  log(JSON.stringify(res).slice(0, 3000));
  await browser.close();
}
