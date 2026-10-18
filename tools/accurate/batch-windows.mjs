// usage: node batch-windows.mjs '<planIds json>' '<[[from,to,extraParamJson?],...]>' <out.json>
// Runs each report over each window in one login; prints NL rows; writes {planId: [{from,to,param,rows}]}.
import { openSandbox, log } from './acc.mjs';
import { runReport } from './report.mjs';
import { writeFileSync } from 'node:fs';
const [ids, wins, out] = [JSON.parse(process.argv[2]), JSON.parse(process.argv[3]), process.argv[4]];
const res = {};
const { browser, app } = await openSandbox();
for (const id of ids) for (const [from, to, extra] of wins) {
  const param = { startDate: from, endDate: to, selectedBranch: [{ name: '[Semua Cabang]', id: null }], ...(extra ?? {}) };
  const r = await runReport(app, id, param);
  (res[id] ??= []).push({ from, to, param, rows: r.rows ?? { error: r.error } });
  log(id, from, to, JSON.stringify((r.rows ?? []).filter(x => x.some(c => /NL-|^Total|^Umum/.test(c)))).slice(0, 600));
}
writeFileSync(out, JSON.stringify(res, null, 1));
await browser.close();
