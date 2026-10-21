#!/usr/bin/env node
// Northline infra cost model: Cloudflare Workers + Neon vs on-premise, per scale tier (ADR-0047).
// Feeds docs/strategy/scale-and-cost.md and docs/strategy/northline-strategy.html. Run: node tools/cost-model.mjs
// Each input is tagged: verified = read from the vendor page on READ; quote = budgetary, replace with two vendor
// quotes before any bid; assumption = planning input. Change an input, rerun, paste the tables into the doc.
import assert from 'node:assert/strict'

const READ = '2026-10-21'
const FX = 18_000 // Rp per US$, the planning rate in docs/business/README.md
const CF = 'https://developers.cloudflare.com/workers/platform/pricing/'
const NEON = 'https://neon.com/pricing'
const ACC = 'https://accurate.id/harga/'
const PLN = 'https://web.pln.co.id/pelanggan/tarif-tenaga-listrik'

const P = {
  workersBase: 5, workersReqIncl: 10e6, workersReq: 0.3 / 1e6, workersCpuIncl: 30e6, workersCpu: 0.02 / 1e6,
  queuesIncl: 1e6, queues: 0.4 / 1e6, r2Free: 10, r2: 0.015,
  cu: { Free: 0, Launch: 0.106, Scale: 0.222 }, storage: 0.35, restore: 0.2, egressIncl: 500, egress: 0.1,
  accBase: 333_000, accUser: 22_200, kwh: 1_444.7, staff: 30e6, life: 60, support: 0.2,
}
const SOURCES = [
  ['Workers Paid base (10M req + 30M CPU ms incl.)', 'US$5 / month', 'verified', CF],
  ['Workers extra requests', 'US$0.30 / million', 'verified', CF],
  ['Workers extra CPU time', 'US$0.02 / million CPU ms', 'verified', CF],
  ['Queues (1M ops/month incl.)', 'US$0.40 / million ops', 'verified', CF],
  ['R2 storage (10 GB free)', 'US$0.015 / GB-month', 'verified', CF],
  ['Neon Launch compute', 'US$0.106 / CU-hour', 'verified', NEON],
  ['Neon Scale compute (SLA, SOC 2, 30-day restore)', 'US$0.222 / CU-hour', 'verified', NEON],
  ['Neon storage', 'US$0.35 / GB-month', 'verified', NEON],
  ['Neon instant-restore history', 'US$0.20 / GB-month', 'verified', NEON],
  ['Neon egress beyond 500 GB/project', 'US$0.10 / GB', 'verified', NEON],
  ['Accurate base package (1 user, PPN incl.)', 'Rp 333,000 / month', 'verified', ACC],
  ['Accurate extra user', 'Rp 22,200 / month', 'verified', ACC],
  ['PLN business tariff B-2', 'Rp 1,444.70 / kWh', 'assumption: check the current quarter', PLN],
  ['Ops engineer, fully loaded', 'Rp 30M / month', 'assumption', '-'],
  ['Hardware life / support after warranty', '60 months / 20% of CapEx over life', 'assumption', '-'],
  ['Exchange rate', 'Rp 18,000 / US$', 'assumption', 'docs/business/README.md'],
]

// Workload per tier: users, API requests per user per working day, working days, CPU ms per request,
// Neon compute as [CU, hours/month] (730 h = always on, 312 h = 12 h x 26 days), backups as [GB per dump, dumps kept].
const T = [
  { id: 'T0', name: 'Trial', users: 3, reqDay: 300, days: 22, cpuMs: 10, docs: 300, plan: 'Free',
    cu: [[0.25, 60]], storageGb: 0.5, restoreGb: 0, backups: [0.1, 7], egressGb: 0, fte: [0, 0], capex: [], kw: 0, site: 0 },
  { id: 'T1', name: 'Small', users: 10, reqDay: 600, days: 22, cpuMs: 20, docs: 5e3, plan: 'Launch',
    cu: [[0.5, 220]], storageGb: 5, restoreGb: 1, backups: [1, 30], egressGb: 20, fte: [0.02, 0.1],
    capex: [['Tower server 8C / 64 GB ECC / 2x1.92 TB NVMe', 1, 85e6], ['NAS 4x8 TB', 1, 25e6], ['UPS 3 kVA', 1, 15e6]],
    kw: 0.3, site: 1.5e6 },
  { id: 'T2', name: 'Mid-market', users: 75, reqDay: 800, days: 26, cpuMs: 25, docs: 50e3, plan: 'Scale',
    cu: [[0.5, 730], [1, 312]], storageGb: 50, restoreGb: 10, backups: [10, 30], egressGb: 150, fte: [0.05, 0.25],
    capex: [['Server 16C / 128 GB / 4x1.92 TB NVMe (app + DB, primary and standby)', 2, 180e6],
      ['Backup NAS 8x12 TB', 1, 60e6], ['Switch + firewall', 1, 60e6], ['Rack + UPS 6 kVA', 1, 50e6]],
    kw: 0.9, site: 5e6 },
  { id: 'T3', name: 'Enterprise', users: 400, reqDay: 1000, days: 26, cpuMs: 30, docs: 500e3, plan: 'Scale', queue: true,
    cu: [[8, 730]], replica: [[4, 312]], storageGb: 500, restoreGb: 50, backups: [100, 4], egressGb: 400, fte: [0.2, 1],
    capex: [['App node 16C / 64 GB', 2, 150e6], ['DB node 32C / 256 GB / 4x3.84 TB NVMe', 2, 450e6],
      ['Backup node 8x12 TB', 1, 180e6], ['2x 10GbE switch + 2x firewall', 1, 200e6], ['Rack, PDU, cabling', 1, 50e6]],
    kw: 0, site: 20e6 },
  { id: 'T4', name: 'Large group', users: 2000, reqDay: 1200, days: 26, cpuMs: 30, docs: 5e6, plan: 'Scale', queue: true,
    cu: [[32, 730]], replica: [[16, 312], [16, 312]], dr: [[8, 730]], drStorageGb: 3000, storageGb: 3000,
    restoreGb: 300, backups: [600, 4], egressGb: 1500, fte: [0.5, 4],
    capex: [['DB node 64C / 768 GB / 8x7.68 TB NVMe (3 primary site, 2 DR)', 5, 1.2e9],
      ['App node 32C / 128 GB (6 primary, 3 DR)', 9, 250e6], ['Backup / object node (4 primary, 2 DR)', 6, 250e6],
      ['Network, primary site', 1, 450e6], ['Network, DR site', 1, 300e6]],
    kw: 0, site: 85e6 },
]

const cuh = (xs = []) => xs.reduce((s, [cu, h]) => s + cu * h, 0)

function serverless(t) {
  const req = t.users * t.reqDay * t.days
  const cpu = req * t.cpuMs
  const rate = P.cu[t.plan]
  const free = t.plan === 'Free'
  if (free) {
    assert.ok(cuh(t.cu) <= 100 && t.storageGb <= 1 && req / t.days <= 100e3, `${t.id} exceeds the free plans`)
  }
  const lines = {
    workers: free ? 0 : P.workersBase + Math.max(0, req - P.workersReqIncl) * P.workersReq
      + Math.max(0, cpu - P.workersCpuIncl) * P.workersCpu,
    queues: t.queue ? Math.max(0, t.docs * 3 * 3 - P.queuesIncl) * P.queues : 0, // 3 events per doc, 3 ops per message
    compute: cuh(t.cu) * rate,
    replicas: cuh(t.replica) * rate,
    storage: free ? 0 : t.storageGb * P.storage + t.restoreGb * P.restore + Math.max(0, t.egressGb - P.egressIncl) * P.egress,
    dr: cuh(t.dr) * rate + (t.drStorageGb ?? 0) * P.storage,
    backups: free ? 0 : Math.max(0, t.backups[0] * t.backups[1] - P.r2Free) * P.r2,
  }
  const usd = Object.values(lines).reduce((a, b) => a + b, 0)
  return { req, cpu, lines, usd, rp: usd * FX, ops: t.fte[0] * P.staff }
}

function onprem(t, s) {
  const capex = t.capex.reduce((sum, [, n, rp]) => sum + n * rp, 0)
  const m = { amort: capex / P.life, support: capex * P.support / P.life, power: t.kw * 730 * P.kwh, site: t.site,
    backups: s.lines.backups * FX, staff: t.fte[1] * P.staff }
  return { capex, m, tco: Object.values(m).reduce((a, b) => a + b, 0) }
}

const rp = (x) => (x === 0 ? 'Rp 0' : x >= 1e9 ? `Rp ${(x / 1e9).toFixed(2)}B` : x >= 1e6 ? `Rp ${(x / 1e6).toFixed(1)}M` : `Rp ${Math.round(x / 1e3)}k`)
const usd = (x) => `$${x.toFixed(2)}`
const row = (cells) => `| ${cells.join(' | ')} |`
const sep = (n) => row(Array(n).fill('---'))

const results = T.map((t) => {
  const s = serverless(t)
  return { t, s, o: t.capex.length ? onprem(t, s) : null }
})
for (let i = 1; i < results.length; i++) assert.ok(results[i].s.usd > results[i - 1].s.usd, 'tiers must grow in cost')
assert.equal(results[0].s.usd, 0, 'T0 must fit both free plans')

const out = [`<!-- generated by node tools/cost-model.mjs, prices read ${READ} -->`, '', '### Unit prices', '',
  row(['Item', 'Price', 'Status', 'Source']), sep(4), ...SOURCES.map(row), '', '### Workload per tier', '',
  row(['Tier', 'Users', 'API requests / month', 'CPU ms / month', 'Documents / month', 'DB size (GB)', 'Neon plan']), sep(7),
  ...results.map(({ t, s }) => row([`${t.id} ${t.name}`, t.users, s.req.toLocaleString('en'), s.cpu.toLocaleString('en'),
    t.docs.toLocaleString('en'), t.storageGb, t.plan])),
  '', '### Serverless (Workers + Neon), per instance per month', '',
  row(['Tier', 'Workers', 'Queues', 'Neon compute', 'Read replicas', 'Storage + restore + egress', 'DR standby',
    'R2 backups', 'Total US$', 'Total Rp', 'Rp / user']), sep(11),
  ...results.map(({ t, s }) => row([t.id, ...Object.values(s.lines).map(usd), `**${usd(s.usd)}**`, `**${rp(s.rp)}**`,
    rp(s.rp / t.users)])),
  '', '### On-premise vs serverless, monthly total cost of ownership', '',
  row(['Tier', 'CapEx', 'CapEx / 60 mo', 'Support', 'Power', 'Site (internet / colo)', 'Off-site backup', 'Ops staff',
    '**On-prem TCO**', '**Serverless + ops**', 'Accurate list price, same users']), sep(11),
  ...results.filter((r) => r.o).map(({ t, s, o }) => row([t.id, rp(o.capex), ...Object.values(o.m).map(rp),
    `**${rp(o.tco)}**`, `**${rp(s.rp + s.ops)}**`,
    t.users <= 100 ? rp(P.accBase + (t.users - 1) * P.accUser) : 'n/a (outside its market)'])),
  '', '### On-premise bill of materials (budgetary, status: quote)', '',
  row(['Tier', 'Item', 'Qty', 'Unit price']), sep(4),
  ...results.flatMap(({ t }) => t.capex.map(([label, n, price]) => row([t.id, label, n, rp(price)]))),
]
console.log(out.join('\n'))
