// Steps behind `bun loop check` and `bun loop evals` (ADR-0050). Each step writes its full output to the run's
// evidence dir and returns one line; the golden cases G1–G10 are judged from step results, never by the agent.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { coverageCounts } from '../../apps/api/scripts/coverage'
import { LOOP, renderState, ROOT, type Run, sh, type State, type StepResult } from './lib'

const API = path.join(ROOT, 'apps/api')
const WEB = path.join(ROOT, 'apps/web')
const MIGRATIONS = path.join(API, 'migrations')
const DB_TS = path.join(API, 'src/db.ts')
const PG = 'postgres://postgres:northline@localhost:55432' // the local docker Postgres (root `bun run dev:db`, CI service)
const TEST_DB = { E2E_DB: 'northline_loop_test' } // the loop's own test database: other worktrees' tests cannot deadlock it
const LOGIN = { NL_EMAIL: 'e2e@northline.test', NL_PASSWORD: 'e2e-secret-pass' } // tools/e2e defaults

export type Metrics = Partial<Record<'mockCalls' | 'oxlintWarnings' | 'accurateZeroDiff' | 'g3Flows' | 'g6Flows', number>>
type Ctx = { dir: string; state: State; media: string; flows: NonNullable<Run['flows']>; metrics: Metrics }
type Step = { name: string; run: (c: Ctx) => Promise<{ ok: boolean; note: string }> }

async function exec(c: Ctx, name: string, cmd: string[], cwd = ROOT, env: Record<string, string> = {}) {
  const p = Bun.spawn(cmd, { cwd, env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' })
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()])
  const code = await p.exited
  const log = `$ ${cmd.join(' ')}  (in ${path.relative(ROOT, cwd) || '.'})\n${out}${err}\nexit ${code}\n`
  writeFileSync(path.join(c.dir, `${name}.log`), log.length > 200_000 ? `…trimmed\n${log.slice(-200_000)}` : log)
  return { code, out, err }
}

const cmd = (name: string, argv: string[], cwd: string): Step => ({
  name,
  run: async (c) => { const { code } = await exec(c, name, argv, cwd); return { ok: code === 0, note: code ? `exit ${code}` : '' } },
})

const bunTest = (out: string, code: number) => {
  const n = (k: string) => Number(out.match(new RegExp(`^\\s*(\\d+) ${k}$`, 'm'))?.[1] ?? 0)
  return { ok: code === 0 && n('fail') === 0, note: `${n('pass')} pass, ${n('fail')} fail` }
}

const testApi = (name: string, file?: string): Step => ({
  name,
  run: async (c) => {
    const db = file ? null : await exec(c, `${name}-db`, ['bun', 'apps/api/scripts/e2e-db.ts', 'reset'], ROOT, TEST_DB)
    if (db?.code) return { ok: false, note: `test database: ${lastLine(db.out + db.err)}` }
    // 20 s per test and hook: the first file migrates a brand-new database, which takes over bun's 5 s default under load.
    const r = await exec(c, name, ['bun', 'test', '--timeout', '20000', ...(file ? [file] : [])], API, { TEST_DATABASE_URL: `${PG}/${TEST_DB.E2E_DB}` })
    return bunTest(r.out + r.err, r.code)
  },
})

// ── static checks ──
export function migrationProblems() {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
  const registered = [...readFileSync(DB_TS, 'utf8').matchAll(/'(\d{4}_[\w-]+\.sql)':/g)].map((m) => m[1]!)
  const out: string[] = []
  const seen = new Map<string, string>()
  for (const f of files) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(f)) out.push(`bad name ${f}`)
    const n = f.slice(0, 4)
    if (seen.has(n)) out.push(`duplicate ${n}: ${seen.get(n)}, ${f}`)
    seen.set(n, f)
    if (!registered.includes(f)) out.push(`not registered in db.ts: ${f}`)
  }
  for (const r of registered) if (!files.includes(r)) out.push(`db.ts registers missing ${r}`)
  return out
}

/** Creates the next migration file and registers it in db.ts; the only way the loop gets a migration number. */
export function claimMigration(name: string) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error('migration name: lowercase letters, digits and _ only')
  const problems = migrationProblems()
  if (problems.length) throw new Error(problems.join('; '))
  const nums = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).map((f) => Number(f.slice(0, 4)))
  const n = String(Math.max(0, ...nums) + 1).padStart(4, '0')
  const file = `${n}_${name}.sql`
  let db = readFileSync(DB_TS, 'utf8')
  const last = [...db.matchAll(/^import m\d{4} from '\.\.\/migrations\/.+$/gm)].at(-1)
  const registry = /(const MIGRATIONS: Record<string, string> = \{[^}]*?)\s*\}/
  if (!last || !registry.test(db)) throw new Error('db.ts layout changed: cannot register the migration')
  const at = last.index! + last[0].length
  db = db.slice(0, at) + `\nimport m${n} from '../migrations/${file}' with { type: 'text' }` + db.slice(at)
  db = db.replace(registry, `$1, '${file}': m${n} }`)
  writeFileSync(path.join(MIGRATIONS, file), `-- ${file}: what changes and why.\n`, { flag: 'wx' })
  writeFileSync(DB_TS, db)
  return `apps/api/migrations/${file}`
}

export function mockCalls() {
  const dir = path.join(WEB, 'src/api')
  return readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f) && f !== 'mock.ts' && !f.includes('.test.'))
    .reduce((n, f) => n + (readFileSync(path.join(dir, f), 'utf8').match(/\bmock\(/g)?.length ?? 0), 0)
}

const changedSinceMain = (...paths: string[]) => {
  const base = sh(['git', 'merge-base', 'HEAD', 'origin/main']).out
  const diff = sh(['git', 'diff', '--name-only', base, '--', ...paths]).out
  const untracked = sh(['git', 'ls-files', '--others', '--exclude-standard', '--', ...paths]).out
  return [...new Set([diff, untracked].join('\n').split('\n').filter(Boolean))]
}
const LOOP_FILES = ['tools/loop', '.claude/skills/strategy-loop', '.claude/agents', '.claude/settings.json']

export const STATIC: Step[] = [
  { name: 'migrations', run: async () => { const p = migrationProblems(); return { ok: !p.length, note: p.join('; ') } } },
  {
    name: 'mocks',
    run: async (c) => { const n = (c.metrics.mockCalls = mockCalls()); return { ok: n <= c.state.baseline.mockCalls!, note: `${n} calls (baseline ${c.state.baseline.mockCalls})` } },
  },
  {
    name: 'coverage',
    run: async (c) => {
      const n = (c.metrics.accurateZeroDiff = coverageCounts(readFileSync(path.join(ROOT, 'docs/reports/_coverage.md'), 'utf8')).done)
      return { ok: n >= c.state.baseline.accurateZeroDiff!, note: `${n} zero-diff (baseline ${c.state.baseline.accurateZeroDiff})` }
    },
  },
  {
    // A stop condition (ADR-0050): any change to Accurate captures, reports or _coverage.md goes to the owner.
    name: 'parity',
    run: async () => {
      const f = changedSinceMain('docs/reports', ':(exclude)docs/reports/architecture')
      return { ok: !f.length, note: f.length ? `changed: ${f.slice(0, 3).join(', ')}` : 'reports unchanged' }
    },
  },
  {
    // STATE.md is rendered, never hand-edited; changes to the loop itself need `bun loop learn` (at most 2 per item).
    name: 'state',
    run: async (c) => {
      const md = readFileSync(path.join(LOOP, 'STATE.md'), 'utf8') === renderState(c.state)
      const loop = c.state.item ? changedSinceMain(...LOOP_FILES) : []
      const learned = c.state.learnings.some((l) => l.item === c.state.item)
      const note = !md ? 'STATE.md differs from state.json (bun loop render)' : loop.length && !learned ? `loop files changed without bun loop learn: ${loop[0]}` : ''
      return { ok: md && (!loop.length || learned), note }
    },
  },
  cmd('typecheck-api', ['bun', 'run', 'typecheck'], API),
  cmd('typecheck-web', ['bun', 'run', 'typecheck'], WEB),
  cmd('typecheck-loop', [path.join(API, 'node_modules/.bin/tsc'), '-p', 'tools/loop'], ROOT),
  {
    name: 'lint-web',
    run: async (c) => {
      const { out } = await exec(c, 'lint-web', ['./node_modules/.bin/oxlint', 'src', '--format', 'json'], WEB)
      const d: { severity: string }[] = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)).diagnostics
      const w = (c.metrics.oxlintWarnings = d.filter((x) => x.severity === 'warning').length)
      return { ok: d.length === w && w <= c.state.baseline.oxlintWarnings!, note: `${w} warnings (baseline ${c.state.baseline.oxlintWarnings}), ${d.length - w} errors` }
    },
  },
]

export const TESTS: Step[] = [
  testApi('test-api'),
  { name: 'test-web', run: async (c) => { const r = await exec(c, 'test-web', ['bun', 'test'], WEB); return bunTest(r.out + r.err, r.code) } },
  { name: 'test-loop', run: async (c) => { const r = await exec(c, 'test-loop', ['bun', 'test', 'tools/loop'], ROOT); return bunTest(r.out + r.err, r.code) } },
]

// ── e2e stack: fresh local database, seeded login, API + web dev server on free ports, every tools/e2e/*-flows.mjs ──
const busy = async (port: number) =>
  (
    await Promise.all(
      ['127.0.0.1', '::1'].map(
        (host) => new Promise<boolean>((res) => { const s = net.connect({ port, host }).once('connect', () => { s.destroy(); res(true) }).once('error', () => res(false)) }),
      ),
    )
  ).some(Boolean)
const freePort = async (from: number) => {
  for (let p = from; p < from + 50; p++) if (!(await busy(p))) return p
  throw new Error(`no free port in ${from}–${from + 49}`)
}

async function ready(url: string, seconds: number) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await fetch(url).then(() => true, () => false)) return true
    await Bun.sleep(500)
  }
  return false
}

const serve = (argv: string[], cwd: string, log: string, env: Record<string, string>) =>
  Bun.spawn(['bash', '-c', 'exec "$@" >"$LOG" 2>&1', 'serve', ...argv], { cwd, env: { ...process.env, ...env, LOG: log } })

async function e2e(c: Ctx) {
  const [apiPort, webPort] = [await freePort(3100), await freePort(5180)]
  const api = serve(['bun', 'apps/api/src/main.ts', '--role=all'], ROOT, path.join(c.dir, 'api.log'), { DATABASE_URL: `${PG}/northline_e2e`, PORT: String(apiPort) })
  const web = serve(['./node_modules/.bin/vite', '--port', String(webPort), '--strictPort'], WEB, path.join(c.dir, 'web.log'), { API_URL: `http://localhost:${apiPort}` })
  try {
    if (!(await ready(`http://localhost:${apiPort}/api/me`, 60))) return { ok: false, note: 'API did not start (api.log)' }
    if (!(await ready(`http://localhost:${webPort}/`, 60))) return { ok: false, note: 'web did not start (web.log)' }
    for (const f of readdirSync(path.join(ROOT, 'tools/e2e')).filter((f) => f.endsWith('-flows.mjs')).sort()) {
      const file = f.replace(/\.mjs$/, '')
      const out = path.join(c.dir, file)
      mkdirSync(out, { recursive: true })
      await exec(c, file, ['node', `tools/e2e/${f}`], ROOT, { E2E_BASE_URL: `http://localhost:${webPort}`, E2E_EVIDENCE_DIR: out, E2E_MEDIA: c.media })
      const results = path.join(out, 'results.json')
      if (!existsSync(results)) c.flows.push({ file, name: `${f} crashed`, ok: false, fail: `no results.json, see ${file}.log` })
      else for (const r of JSON.parse(readFileSync(results, 'utf8')).flows) c.flows.push({ file, ...r })
    }
    c.metrics.g3Flows = c.flows.filter((f) => f.name.includes('[G3]')).length
    c.metrics.g6Flows = c.flows.filter((f) => f.name.includes('[G6]')).length
    const pass = c.flows.filter((f) => f.ok).length
    return { ok: c.flows.length > 0 && pass === c.flows.length, note: `${pass}/${c.flows.length} flows` }
  } finally {
    api.kill()
    web.kill()
    await Promise.all([api.exited, web.exited])
  }
}

const lastLine = (s: string) => s.trim().split('\n').at(-1) ?? ''
const script = (name: string, argv: string[], env: Record<string, string> = {}): Step => ({
  name,
  run: async (c) => { const r = await exec(c, name, argv, ROOT, env); return { ok: !r.code, note: lastLine(r.out + r.err) } },
})

export const STACK: Step[] = [
  script('db', ['bun', 'apps/api/scripts/e2e-db.ts', 'reset']),
  script('seed', ['bun', 'apps/api/scripts/seed.ts'], { DATABASE_URL: `${PG}/northline_e2e`, ...LOGIN }),
  { name: 'e2e', run: e2e },
  script('balance', ['bun', 'apps/api/scripts/e2e-db.ts', 'balance']),
  testApi('access', 'test/access-enforcement.test.ts'),
]

/** Runs steps in parallel (independent checks) or in order, skipping the rest after a failed `db` or `seed`. */
export async function runSteps(steps: Step[], c: Ctx, parallel: boolean): Promise<StepResult[]> {
  const one = async (s: Step): Promise<StepResult> => {
    const t = performance.now()
    const r = await s.run(c).catch((e: Error) => ({ ok: false, note: String(e.message).split('\n')[0]! }))
    return { name: s.name, ...r, ms: Math.round(performance.now() - t) }
  }
  if (parallel) return Promise.all(steps.map(one))
  const out: StepResult[] = []
  for (const s of steps) {
    const blocked = out.find((r) => !r.ok && (r.name === 'db' || r.name === 'seed'))
    out.push(blocked ? { name: s.name, ok: false, ms: 0, note: `skipped: ${blocked.name} failed` } : await one(s))
  }
  return out
}

export const ctx = (dir: string, state: State, media = '(?!)'): Ctx => (mkdirSync(dir, { recursive: true }), { dir, state, media, flows: [], metrics: {} })

// ── golden cases (evals/golden.md is rendered from this list) ──
type Round = { steps: Record<string, StepResult>; flows: NonNullable<Run['flows']>; prBody: boolean | null }
const ok = (r: Round, ...names: string[]) => names.every((n) => r.steps[n]?.ok)
const tagged = (r: Round, tag: string, min: number) => {
  const f = r.flows.filter((x) => x.name.includes(`[${tag}]`))
  return f.length >= min && f.every((x) => x.ok)
}

export const CASES: { id: string; name: string; passWhen: string; steps: string; source: string; judge: (r: Round, s: State) => boolean | null }[] = [
  { id: 'G1', name: 'Migrations apply from empty', passWhen: 'Every migration file is registered once in `db.ts` under a unique number; a fresh database migrates and seeds', steps: '`migrations`, `db`, `seed`', source: 'N1: two agents took 0064', judge: (r) => ok(r, 'migrations', 'db', 'seed') },
  { id: 'G2', name: 'Typecheck and lint', passWhen: '`tsc` clean in api (with `tsconfig.types.json`), web and `tools/loop`; oxlint 0 errors, warnings ≤ `oxlintWarnings`', steps: '`typecheck-api`, `typecheck-web`, `typecheck-loop`, `lint-web`', source: 'N1: TS2589 in `app.ts`', judge: (r) => ok(r, 'typecheck-api', 'typecheck-web', 'typecheck-loop', 'lint-web') },
  { id: 'G3', name: 'Round trip, no silent loss', passWhen: 'Every e2e flow tagged `[G3]` passes (save, reload, every field equal; or the field is disabled and the API answers 409) and there are ≥ `g3Flows` of them', steps: '`e2e`', source: 'N1: 3 of 4 slices dropped fields', judge: (r, s) => tagged(r, 'G3', s.baseline.g3Flows!) },
  { id: 'G4', name: 'Accurate parity', passWhen: '`_coverage.md` zero-diff count ≥ `accurateZeroDiff`, and nothing under `docs/reports/` except `architecture/` changed since `origin/main`', steps: '`coverage`, `parity`', source: 'Strategy scorecard; stop condition', judge: (r) => ok(r, 'coverage', 'parity') },
  { id: 'G5', name: 'Privilege matrix', passWhen: '`access-enforcement.test.ts` passes (each route reaches its handler with its privilege and answers 403 without it) and the seeded login opens every route (`route …` flows)', steps: '`access`, `e2e`', source: 'N1: seed login had no privileges', judge: (r) => ok(r, 'access') && r.flows.some((f) => f.name.startsWith('route ')) && r.flows.filter((f) => f.name === 'sign in' || f.name.startsWith('route ')).every((f) => f.ok) },
  { id: 'G6', name: 'Real data in pickers', passWhen: 'Every flow tagged `[G6]` passes (it saves a document with picker options the seeded API returned) and there are ≥ `g6Flows` of them', steps: '`e2e`', source: 'N1: pickers listed fixture names', judge: (r, s) => tagged(r, 'G6', s.baseline.g6Flows!) },
  { id: 'G7', name: 'Mocks only go down', passWhen: '`mock(` calls in `apps/web/src/api` ≤ `mockCalls`', steps: '`mocks`', source: 'Strategy scorecard', judge: (r) => ok(r, 'mocks') },
  { id: 'G8', name: 'Books balance', passWhen: 'After the e2e run, debits = credits in every month of `journal_lines`', steps: '`balance`', source: 'ERP invariant', judge: (r) => ok(r, 'balance') },
  { id: 'G9', name: 'Full test suites', passWhen: "`bun test` in api (on the loop's own database), web and `tools/loop`: 0 failures", steps: '`test-api`, `test-web`, `test-loop`', source: 'Baseline', judge: (r) => ok(r, 'test-api', 'test-web', 'test-loop') },
  { id: 'G10', name: 'PR body survives the gate', passWhen: 'The PR body holds the current loop section between the markers; n/a before the PR exists', steps: '`pr-body`', source: 'N1: no-mistakes overwrote the body', judge: (r) => r.prBody },
]

export const judge = (r: Round, s: State) => Object.fromEntries(CASES.map((k) => [k.id, k.judge(r, s)]))

export function renderGolden() {
  const esc = (s: string) => s.replaceAll('|', '\\|')
  return [
    '# Golden evals',
    '',
    'Rendered from `CASES` in `tools/loop/checks.ts` by `bun loop render`; edit the code, not this file. `bun loop evals`',
    'runs the static steps once and the tests and e2e stack twice, each on a fresh local database; a case passes only',
    'when both runs pass (pass^2). Baselines live in `docs/strategy/loop/state.json` and move only through',
    '`bun loop baseline`, which ratchets them in the improving direction. Logs, screenshots and videos land in',
    '`docs/strategy/loop/evidence/<item>/`.',
    '',
    '| # | Case | Pass when | Steps | Source |',
    '|---|---|---|---|---|',
    ...CASES.map((k) => `| ${k.id} | ${k.name} | ${esc(k.passWhen)} | ${k.steps} | ${k.source} |`),
    '',
    '## Adding a case',
    '',
    'New G-cases come only from a failure that got past this set or the gate; `bun loop learn --check <case>` records',
    "the change and refuses one without an existing case or step. Flows for an item's forms and pickers are not new",
    'cases: tag them `[G3]` / `[G6]` and run `bun loop baseline` to raise the counts. Past 15 cases, merge the ones that',
    'check the same thing.',
    '',
  ].join('\n')
}
