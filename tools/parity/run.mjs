// usage: ERP_EMAIL=… ERP_PASSWORD=… [ERP_URL=http://localhost:3100] node tools/parity/run.mjs <scenario>
// Runs tools/parity/scenarios/<scenario>.mjs on both sides with the same inputs: Accurate (Manufaktur Demo, ACC_DB unset)
// through the tools/accurate session, the ERP through a local seeded API. Writes docs/parity/<module>/<form>/
// (README.md, run.log scrubbed by acc.mjs `red`, accurate-<step>.png, erp-<step>.png; VIDEO=1 adds accurate.webm, never committed).
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { DB, openSandbox } from '../accurate/acc.mjs';
import { erpLogin, red } from './lib.mjs';

if (process.env.ACC_DB && process.env.ACC_DB !== 'manufaktur') throw new Error('P4 batch 1 runs on Manufaktur Demo only');
const name = process.argv[2];
const sc = (await import(`./scenarios/${name}.mjs`)).default;
const dir = new URL(`../../docs/parity/${sc.dir}/`, import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const lines = [];
const log = (...a) => { const s = red(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); lines.push(s); console.log(s) };
const shot = (side, step) => `${dir}${side}-${step}.png`;

const o = await openSandbox();
const { browser } = o;
let app = o.app, vctx = null;
// VIDEO=1 (scenarios with a divergence): the Accurate run is recorded in a second context that reuses the session (the login
// page is never recorded). A persistent mask hides the header and any text with the Data Usaha name, an email or an IP;
// it is asserted by computed style before the run and the recording is dropped if the assert fails.
if (process.env.VIDEO) {
  vctx = await browser.newContext({ storageState: await o.ctx.storageState(), recordVideo: { dir: dir + '.video/', size: { width: 1280, height: 720 } }, viewport: { width: 1280, height: 720 } });
  await vctx.addInitScript((db) => {
    const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/, IP = /\b\d{1,3}(\.\d{1,3}){3}\b/;
    const hide = () => {
      for (const el of document.querySelectorAll('.user-id, .user-id-name, span.first-name')) el.style.setProperty('visibility', 'hidden', 'important');
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { const t = n.textContent; if (n.parentElement && (t.includes(db) || EMAIL.test(t) || IP.test(t))) n.parentElement.style.setProperty('visibility', 'hidden', 'important') }
    };
    const st = document.createElement('style'); st.textContent = '.user-id, .user-id-name, span.first-name { visibility: hidden !important }';
    document.addEventListener('DOMContentLoaded', () => { document.head.appendChild(st); hide(); new MutationObserver(hide).observe(document.body, { subtree: true, childList: true, characterData: true }) });
  }, DB);
  app = await vctx.newPage();
  await app.goto(o.app.url(), { waitUntil: 'networkidle', timeout: 90000 });
  await app.waitForSelector('span.first-name', { state: 'attached', timeout: 60000 });
  const masked = await app.evaluate(() => [...document.querySelectorAll('.user-id, .user-id-name, span.first-name')].every((e) => getComputedStyle(e).visibility === 'hidden'));
  if (!masked) { await vctx.close(); rmSync(dir + '.video/', { recursive: true, force: true }); throw new Error('video mask assert failed; recording dropped') }
}
let acc, erp;
try {
  log(`# ${sc.title} — inputs`, sc.inputs);
  log('## Accurate');
  acc = await sc.accurate({ app, log, shot: (s) => shot('accurate', s), browser });
  if (vctx) { const v = app.video(); await vctx.close(); renameSync(await v.path(), dir + 'accurate.webm'); rmSync(dir + '.video/', { recursive: true, force: true }); app = o.app }
  log('## ERP (local seeded instance)');
  await erpLogin();
  erp = await sc.erp({ log, shot: (s) => shot('erp', s), browser });
} finally { await browser.close() }

const rows = sc.compare(acc, erp);
const diffs = rows.filter((r) => !r.same);
log('## Compare', diffs.length ? `${diffs.length} differing aspect(s): ${diffs.map((r) => r.aspect).join(', ')}` : 'all aspects match');
const verdict = sc.stopped ? `stopped: ${sc.stopped}` : diffs.length === 0 ? 'pass' : diffs.every((r) => sc.accepted?.[r.aspect]) ? 'accepted divergence (ADR-0041)' : 'FAIL';
log('verdict', verdict);
writeFileSync(dir + 'run.log', lines.join('\n') + '\n');

const cell = (v) => red(typeof v === 'string' ? v : JSON.stringify(v)).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return '<sha>' } })();
const shots = ['create', 'edit', 'reject', 'delete', 'journal'];
writeFileSync(dir + 'README.md', `# ${sc.title}

Module: ${sc.module}. Accurate: ${sc.accuratePath} (\`${sc.mod}\`), Manufaktur Demo. ERP: ${sc.erpRoute}.

**Verdict:** ${verdict}${diffs.length ? ` (${diffs.map((r) => r.aspect).join(', ')})` : ''}

Date: ${new Date().toISOString().slice(0, 10)}. Commit: \`<commit-sha>\` (placeholder, filled in at commit; run on \`${sha}\` plus the batch's uncommitted fixes).
Script: [\`tools/parity/scenarios/${name}.mjs\`](../../../../tools/parity/scenarios/${name}.mjs), runner \`tools/parity/run.mjs\`.

## Scenario
${sc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Inputs
\`\`\`json
${JSON.stringify(sc.inputs, null, 1)}
\`\`\`

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
${rows.map((r) => `| ${r.aspect} | ${cell(r.accurate)} | ${cell(r.northline)} | ${r.same ? 'yes' : 'no'} |`).join('\n')}
${sc.stopped ? `\n## Stopped\n${sc.stoppedNote}\n` : ''}${diffs.length ? `\n## Divergences\n${diffs.map((r) => `- **${r.aspect}**: ${sc.accepted?.[r.aspect] ?? 'not accepted'}`).join('\n')}\n\nSee [ADR-0041](../../../decisions/0041-p4-batch-1-screen-divergences.md). A video of the Accurate run (\`accurate.webm\`) is kept locally, not committed.\n` : ''}
## Evidence
- [run.log](run.log)
${shots.map((s) => `- ${s}: [Accurate](accurate-${s}.png), [ERP](erp-${s}.png)`).join('\n')}

ERP screenshots render the API request and response: the web doc screens are still mock data (\`apps/web/src/api/docs.ts\`).
Accurate screenshots mask the header (Data Usaha name, user menu) and any email or IP; the mask is asserted before each capture.
`);
console.log('wrote', dir);
