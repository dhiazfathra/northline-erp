// usage: ACC_DB=retail node session.mjs steps-capture-missing.mjs <meta.json> <outDir>
// Captures each report in meta (planId -> {p: paramDate, a: [[name, type, default]]}) with default parameters over
// the sandbox's whole history, one file per report in outDir. Daftar Laporan metadata comes from init-report.do.
import { readFileSync, writeFileSync } from 'node:fs';
const TRADE = process.env.ACC_DB === 'trade';
const ALL_BRANCH = [{ name: '[Semua Cabang]', id: null }];
const DATES = {
  FROMTO: { startDate: '01/01/2000', endDate: '31/12/2040' }, FROMTO_TIMESTAMP: { startDate: '01/01/2000', endDate: '31/12/2040' },
  ASOF: { asOfDate: '31/12/2040' }, ASOFYEAR: { asOfYear: 2026 }, PERIOD: { periodMonth: '12', periodYear: 2026 },
  PERIODFROMTO: { periodStartMonth: '1', periodStartYear: 2026, periodEndMonth: '12', periodEndYear: 2026 },
  COMPAREFROMTO: { startDate: '01/01/2025', endDate: '31/12/2025', startDateCompare: '01/01/2026', endDateCompare: '31/12/2026' }, DATECOMPARE: { startDate: '31/12/2025', endDate: '31/12/2040' }, YEARTODATE: { startDate: '01/01/2000', endDate: '31/12/2040' }, NONE: {},
};
export default async ({ app, runReport, log }) => {
  const [metaPath, outDir] = process.argv.slice(3);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  for (const [planId, m] of Object.entries(meta)) {
    const param = { ...DATES[m.p] };
    for (const [name, type, def] of m.a) {
      if (type === 'BOOLEAN') param[name] = def;
      else if (type === 'WAREHOUSE') param[name] = TRADE ? [{ name: 'Utama', id: 50 }] : null;
      else if (type.startsWith('BRANCH_MULTI')) param[name] = ALL_BRANCH;
      // Trade Portal Demo 500s on omitted branch/currency params; explicit [] means all there.
      else if (TRADE) param[name] = [];
      else if (type.endsWith('_MULTI')) param[name] = [];
    }
    let r = await runReport(app, planId, param);
    // Trade Portal Demo: some reports 500 on [Semua Cabang] (where [] would return nothing elsewhere); retry with [].
    if (TRADE && !r.rows) for (const [name, type] of m.a) if (type.startsWith('BRANCH_MULTI')) { param[name] = []; r = await runReport(app, planId, param) }
    writeFileSync(`${outDir}/${planId}.json`, JSON.stringify({ planId, dataUsaha: { retail: 'Retail Demo', trade: 'Trade Portal Demo' }[process.env.ACC_DB] ?? 'Manufaktur Demo',
      capturedFrom: 'Accurate Online sandbox, 2026-10-19, default params over the demo data', param, rows: r.rows ?? { error: r.error } }, null, 1));
    log(planId, r.rows ? `rows ${r.rows.length}` : 'ERROR ' + JSON.stringify(r.error).slice(0, 160));
  }
};
