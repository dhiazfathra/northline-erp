// N1 click-through (docs/decisions/0049): every route + the PLAN.md flows against a seeded local API.
// Needs: local Postgres seeded (`bun run seed`), the API on :3000 and the web dev server (vite proxies /api).
// Env:
//   E2E_BASE_URL   web origin            (default http://localhost:5173)
//   E2E_EMAIL      seeded login          (default e2e@northline.test; seed with NL_EMAIL=… NL_PASSWORD=…)
//   E2E_PASSWORD   its password          (default e2e-secret-pass)
//   E2E_HEADED=1   watch it run;  E2E_ONLY=<substring> run matching flows only
//   E2E_EVIDENCE_DIR  write results.json there, plus a screenshot and video per failed flow and per flow matching
//                     E2E_MEDIA (a regex; `bun loop evals` passes `\[<item>\]`), at most 20 (ADR-0050)
// Tags in flow names feed the golden evals: [G3] round trip (save, reload, compare), [G6] picker options from the API.
// Run: node tools/e2e/n1-flows.mjs   (or `bun run e2e`) — exits 1 on any failure.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const EMAIL = process.env.E2E_EMAIL ?? 'e2e@northline.test'
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-secret-pass'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const WEB = path.join(ROOT, 'apps/web/src')

// Static routes from the file router + every concrete menu target in nav.ts (generic /modules/* screens included).
function routes() {
  const out = new Set()
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (!f.includes('$') && !f.startsWith('__') && f.endsWith('.tsx')) {
        const r = '/' + path.relative(path.join(WEB, 'routes'), p).replace(/\.tsx$/, '').replace(/(^|\/)index$/, '')
        out.add(r.replace(/\/$/, '') || '/')
      }
    }
  }
  walk(path.join(WEB, 'routes'))
  const nav = readFileSync(path.join(WEB, 'lib/nav.ts'), 'utf8')
  for (const m of nav.matchAll(/'(\/(?:docs|modules|ledger|cash-bank|fixed-assets|asset-modules|accounts|reports|ai|settings|workspaces)[^']+)'/g)) out.add(m[1])
  // generic (no explicit `to`) entries: sub('x', 'ID', 'English', ...) → /modules/<slug>
  for (const m of nav.matchAll(/sub\('[tmsr]', '[^']*', '([^']*)', '[^']*'\)/g))
    out.add('/modules/' + m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  out.delete('/auth')
  return [...out].sort()
}

const EVIDENCE = process.env.E2E_EVIDENCE_DIR
const MEDIA = new RegExp(process.env.E2E_MEDIA || '(?!)')
if (EVIDENCE) mkdirSync(path.join(EVIDENCE, 'shots'), { recursive: true })
const browser = await chromium.launch({ headless: !process.env.E2E_HEADED })
// Every page records video when evidence is on; a flow's video is kept or deleted when its page closes.
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  baseURL: BASE,
  ...(EVIDENCE && { recordVideo: { dir: path.join(EVIDENCE, 'videos'), size: { width: 960, height: 600 } } }),
})

let problems = []
// 401 on the session probe before sign-in is expected; validation flows may expect 4xx via `allow4xx`.
let allow4xx = false
const expected = (r) => (r.status() === 401 && new URL(r.url()).pathname.endsWith('/me')) || (allow4xx && r.status() < 500)

// One page per flow (the session cookie and language choice live in the shared context), so each flow is its own video.
let page
async function newPage() {
  page = await ctx.newPage()
  page.setDefaultTimeout(8000)
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('response', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/api/') && r.status() >= 400 && !expected(r)) problems.push(`api ${r.request().method()} ${u.pathname} → ${r.status()}`)
  })
}

const results = []
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
async function flow(name, fn) {
  if (process.env.E2E_ONLY && name !== 'sign in' && !name.includes(process.env.E2E_ONLY)) return
  await newPage()
  problems = []
  allow4xx = false
  const started = Date.now()
  let err
  try {
    await fn()
    await page.waitForTimeout(300)
  } catch (e) {
    err = e.message.split('\n')[0]
  }
  const fail = err ?? (problems.length ? [...new Set(problems)].join(' | ') : null)
  const r = { name, ok: !fail, fail, ms: Date.now() - started }
  const keep = EVIDENCE && (fail || MEDIA.test(name)) && results.filter((x) => x.shot).length < 20
  if (keep) {
    r.shot = `shots/${slug(name)}.jpg`
    await page.screenshot({ path: path.join(EVIDENCE, r.shot), type: 'jpeg', quality: 60 }).catch(() => delete r.shot)
  }
  await page.close()
  const video = page.video()
  if (video && keep) {
    r.video = `videos/${slug(name)}.webm`
    await video.saveAs(path.join(EVIDENCE, r.video))
  }
  await video?.delete()
  results.push(r)
  console.log(`${fail ? 'FAIL' : 'pass'}  ${name}${fail ? `\n      ${fail}` : ''}`)
}

const go = async (p) => {
  await page.goto(p)
  await page.waitForLoadState('networkidle')
}
const btn = (name, exact = true) => page.getByRole('button', { name, exact })
const popup = () => page.locator('[data-radix-popper-content-wrapper]').last()
const toast = () => page.getByRole('status').last()
const expect = (ok, msg) => { if (!ok) throw new Error(msg) }
const run = Date.now().toString(36) // unique labels so reruns against the same DB stay distinguishable

// ── sign in ──
await flow('sign in', async () => {
  await go('/auth')
  await page.locator('input[type=email]').fill(EMAIL)
  await page.locator('input[autocomplete=current-password]').fill(PASSWORD)
  await page.locator('button[type=submit]').click()
  await page.waitForURL('**/workspaces')
  await page.waitForLoadState('networkidle')
  await btn('EN').click() // flows below match English copy; the choice persists in localStorage
})

// ── route sweep at 1440 ──
for (const r of routes()) await flow(`route ${r}`, () => go(r))

// ── PLAN.md flows ──
await flow('mega menu → page + tab', async () => {
  await go('/')
  await btn('All modules').click()
  await page.getByRole('dialog').getByText('Sales', { exact: true }).click()
  await page.getByRole('dialog').getByText('Sales Invoices', { exact: true }).click()
  await page.waitForURL('**/docs/sales-invoice')
  await page.getByText('Sales Invoices ×').or(page.getByText(/^Sales Invoices$/)).first().waitFor()
  await page.getByRole('tab', { name: 'List' }).waitFor()
})

await flow('⌘K search', async () => {
  await go('/')
  await page.keyboard.press('Meta+k')
  await page.getByRole('dialog').getByRole('combobox').fill('Chart of Accounts')
  await page.getByRole('option', { name: /Chart of Accounts/ }).first().click()
  await page.waitForURL('**/accounts')
})

await flow('ID/EN toggle', async () => {
  await go('/')
  await btn('ID').click()
  await btn('Semua Modul').waitFor()
  await btn('EN').click()
  await btn('All modules').waitFor()
})

let invoiceNo
await flow('[G6] doc form add item + save (sales invoice)', async () => {
  await go('/docs/sales-invoice')
  await btn('+ New entry').click()
  await btn('Customer *').click()
  await page.getByRole('option', { name: 'NL-T2 Pelanggan A' }).click()
  await page.getByRole('button', { name: /Search\/select item/ }).click()
  await page.getByRole('option', { name: /NL-T2-S1/ }).click()
  await page.getByRole('textbox', { name: 'Unit price' }).fill('750000')
  await page.getByRole('textbox', { name: 'Notes' }).fill(`e2e ${run}`)
  await page.getByLabel('Belum disimpan').waitFor() // shell tab shows the dirty marker
  await page.getByRole('button', { name: /^Save/ }).click()
  await page.getByRole('tab', { name: 'List', selected: true }).waitFor()
  const row = page.getByRole('button', { name: new RegExp(`e2e ${run}`) })
  await row.waitFor()
  invoiceNo = (await row.innerText()).split(/\s/)[0]
  expect(/^SI\.\d{4}\.\d{2}\.\d{5}$/.test(invoiceNo), `unexpected number ${invoiceNo}`)
})

await flow('dirty-tab close confirm', async () => {
  await go('/docs/journal')
  await btn('+ New entry').click()
  await page.getByRole('textbox', { name: 'Notes' }).first().fill('dirty')
  await page.getByLabel('Belum disimpan').locator('..').getByText('×', { exact: true }).click()
  const d = page.getByRole('alertdialog', { name: 'Close tab without saving?' })
  await d.waitFor()
  await d.getByRole('button', { name: 'Close without saving' }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/docs/journal'))
})

await flow('trial-balance journal dialog + required error', async () => {
  await go('/ledger/trial-balance')
  await page.getByRole('button', { name: /^110301 / }).click()
  const d = page.getByRole('dialog', { name: /110301/ })
  await d.getByRole('button', { name: 'Continue' }).click()
  await d.getByText('Amount is required').waitFor()
  await d.getByRole('button', { name: 'Close' }).click()
})

await flow('overview new-transaction modal → full doc form', async () => {
  await go('/')
  await btn('New transaction').click()
  const d = page.getByRole('dialog', { name: 'New Transaction' })
  await d.getByRole('button', { name: 'Continue to Sales Invoice' }).click()
  await page.waitForURL('**/docs/sales-invoice')
  await page.getByRole('tab', { name: /New entry/, selected: true }).waitFor()
  await btn('Customer *').waitFor()
})

await flow('report params → view → AI panel', async () => {
  await go('/reports')
  await page.getByRole('button', { name: /^\S* ?Profit & Loss \(Standard\)/ }).first().click()
  await page.getByRole('dialog', { name: 'Profit & Loss (Standard)' }).getByRole('button', { name: 'Show' }).click()
  await page.waitForURL('**/reports/laba-rugi**')
  await page.getByText('LABA BERSIH').waitFor()
  await page.getByRole('button', { name: /AI$/ }).click()
  await page.getByRole('complementary').getByText('Report analysis').waitFor()
  await page.getByRole('button', { name: 'Close AI panel' }).click()
})

await flow('[G3] report star toggles and persists across reload', async () => {
  await go('/reports')
  const card = page.getByRole('button', { name: /Cash Flow Operating/ })
  const star = (s) => card.getByRole('button', { name: s, exact: true })
  const was = (await star('Remove from favourites').count()) > 0
  await star(was ? 'Remove from favourites' : 'Add to favourites').click()
  await star(was ? 'Add to favourites' : 'Remove from favourites').waitFor()
  await page.reload()
  await page.waitForLoadState('networkidle')
  await star(was ? 'Add to favourites' : 'Remove from favourites').waitFor()
  await star(was ? 'Add to favourites' : 'Remove from favourites').click() // restore
  await star(was ? 'Remove from favourites' : 'Add to favourites').waitFor()
})

await flow('asset expenditure create', async () => {
  await go('/asset-modules/new')
  await page.getByRole('textbox', { name: 'Asset Description *' }).fill(`Laptop e2e ${run}`)
  await page.getByRole('textbox', { name: 'DPP * Rp' }).fill('8000000')
  await page.getByRole('button', { name: /Add asset/ }).click()
  await page.getByRole('option', { name: /NL-T34 Printer/ }).click()
  await page.getByRole('button', { name: /Save/ }).click()
  await page.waitForURL((u) => u.pathname === '/asset-modules')
  await page.getByText(`Laptop e2e ${run}`).first().waitFor()
})

await flow('[G6] fixed-asset validation + create', async () => {
  await go('/fixed-assets/new')
  await btn('Save').click()
  await toast().getByText('Fill in the required fields').waitFor()
  await page.getByRole('textbox', { name: 'Asset Name *' }).fill(`Laptop e2e ${run}`)
  const pick = async (trigger, option) => {
    await page.getByRole('button', { name: trigger }).first().click()
    await popup().getByText(option, { exact: true }).click()
  }
  await pick(/Search category/, 'Peralatan Kantor')
  await pick(/Search account/, 'Inventaris Kantor')
  await pick(/Search account/, 'Akumulasi Penyusutan Inventaris Kantor')
  await pick(/Search account/, 'Beban Penyusutan Inventaris Kantor')
  await page.getByRole('textbox', { name: '0', exact: true }).first().fill('4')
  await page.getByText('Expenses', { exact: true }).click()
  await page.getByRole('button', { name: /Search asset expenditure/ }).click()
  await popup().getByText(`Laptop e2e ${run}`).first().click()
  await page.getByText('Other', { exact: true }).click()
  await page.getByRole('button', { name: /Search location/ }).click()
  await popup().getByText('Kantor Pusat', { exact: true }).click()
  await btn('Save').click()
  await page.waitForURL(/\/fixed-assets\/FAA\./)
})

await flow('[G3] account row → form (+ save details)', async () => {
  await go('/accounts')
  await page.getByText('Beban Listrik').first().click()
  await page.waitForURL('**/accounts/600011')
  await page.getByRole('textbox', { name: 'Notes' }).fill(`e2e ${run}`)
  await btn('Save').click()
  await page.waitForURL((u) => u.pathname === '/accounts')
  await go('/accounts/600011')
  const note = await page.getByRole('textbox', { name: 'Notes' }).inputValue()
  expect(note === `e2e ${run}`, `notes not saved: "${note}"`)
})

await flow('AI-history delete confirm', async () => {
  await go('/ai/history')
  await btn('Delete').click()
  const d = page.getByRole('alertdialog', { name: 'Delete conversation?' })
  await d.waitFor()
  await d.getByRole('button', { name: 'Cancel' }).click()
})

await flow('month-end screen loads', async () => {
  await go('/ledger/month-end')
  await page.getByRole('tab', { name: 'New Run' }).waitFor()
  await page.getByRole('tab', { name: 'History' }).click()
  await page.waitForLoadState('networkidle')
})

await flow('bank reconciliation screen loads', async () => {
  await go('/cash-bank/reconciliation')
  await btn('Bank *').click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: /Refresh/ }).click()
  await page.waitForLoadState('networkidle')
})

await flow('asset per location loads', async () => {
  await go('/asset-modules/by-location')
  await page.getByText('Kantor Pusat').first().waitFor()
})

await flow('workspace switch', async () => {
  await go('/workspaces')
  await page.getByRole('button', { name: /Kerr Consulting/ }).click()
  await page.waitForURL((u) => u.pathname === '/')
  await page.getByRole('link', { name: 'Kerr Consulting' }).waitFor()
  await go('/workspaces')
  await page.getByRole('button', { name: /PT Harbor Nusantara/ }).last().click() // back to the seeded company
})

await browser.close()
if (EVIDENCE) writeFileSync(path.join(EVIDENCE, 'results.json'), JSON.stringify({ base: BASE, flows: results }, null, 2))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} pass`)
process.exit(failed.length ? 1 : 0)
