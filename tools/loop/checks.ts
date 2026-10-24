// Steps behind `bun loop check` and `bun loop evals` (ADR-0050). Each step writes its full output to the run's
// evidence dir and returns one line; the golden cases G1–G12 are judged from step results, never by the agent.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { coverageCounts } from '../../apps/api/scripts/coverage'
import { blocked } from './guard'
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

// Every child the loop starts, so an interrupted run (SIGINT, SIGTERM, a harness timeout) leaves no server behind.
const children = new Set<{ kill: (sig?: number | NodeJS.Signals) => void }>()
export const killChildren = () => children.forEach((p) => p.kill('SIGTERM'))

async function exec(c: Ctx, name: string, cmd: string[], cwd = ROOT, env: Record<string, string> = {}, minutes = 10) {
  const p = Bun.spawn(cmd, { cwd, env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' })
  children.add(p)
  const timer = setTimeout(() => p.kill('SIGTERM'), minutes * 60_000)
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()])
  const code = await p.exited
  clearTimeout(timer)
  children.delete(p)
  const timedOut = p.signalCode === 'SIGTERM' ? `\nkilled after ${minutes} min\n` : ''
  const log = `$ ${cmd.join(' ')}  (in ${path.relative(ROOT, cwd) || '.'})\n${out}${err}${timedOut}\nexit ${code}\n`
  writeFileSync(path.join(c.dir, `${name}.log`), log.length > 200_000 ? `…trimmed\n${log.slice(-200_000)}` : log)
  return { code, out, err }
}

const cmd = (name: string, argv: string[], cwd: string): Step => ({
  name,
  run: async (c) => { const { code } = await exec(c, name, argv, cwd); return { ok: code === 0, note: code ? `exit ${code}` : '' } },
})

const TSC = path.join(API, 'node_modules/.bin/tsc')
const files = (dir: string, at = ''): string[] =>
  readdirSync(path.join(dir, at), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(dir, path.join(at, e.name)) : [path.join(at, e.name)]))
// tsc may print a union's members in a different order run to run, on one line (`401 | 429`) or as multi-line object
// members, so files compare as a multiset of lines with each one-line union run sorted.
export const sameDeclarations = (a: string, b: string) => {
  const run = /(?:[^\s|;,(){}<>[\]]+ \| )+[^\s|;,(){}<>[\]]+/g
  const norm = (s: string) => s.split('\n').map((l) => l.trimEnd().replace(run, (m) => m.split(' | ').sort().join(' | '))).sort().join('\n')
  return norm(a) === norm(b)
}
// apps/api's `typecheck` script also regenerates the tracked apps/api/types/*.d.ts that web compiles against. The loop
// builds them into a scratch dir instead and fails when the tracked ones are stale, so web is never checked against
// old API types and no check rewrites tracked files.
const typecheckApi: Step = {
  name: 'typecheck-api',
  run: async (c) => {
    const a = await exec(c, 'typecheck-api', [TSC, '--noEmit'], API)
    if (a.code) return { ok: false, note: `exit ${a.code}` }
    const out = path.join(c.dir, 'types')
    const b = await exec(c, 'typecheck-api-types', [TSC, '-p', 'tsconfig.types.json', '--outDir', out], API)
    if (b.code) return { ok: false, note: `declaration build: exit ${b.code} (typecheck-api-types.log)` }
    const tracked = path.join(API, 'types')
    const names = [...new Set([...files(out), ...files(tracked)])]
    const stale = names.filter((f) => !existsSync(path.join(out, f)) || !existsSync(path.join(tracked, f)) || !sameDeclarations(readFileSync(path.join(out, f), 'utf8'), readFileSync(path.join(tracked, f), 'utf8')))
    return { ok: !stale.length, note: stale.length ? `apps/api/types is stale (${stale.slice(0, 2).join(', ')}): run \`bun run --cwd apps/api typecheck\` and commit` : '' }
  },
}

/** Connection strings and token-shaped values out of anything that is committed (tails, notes): the repo is public. */
export const redact = (s: string) =>
  s
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s:/@]+:[^\s@/]+@/gi, '$1***@')
    .replace(/\b(bearer|token|secret|password|apikey|api_key)(\s*[:=]\s*|\s+)["']?[^\s"']{8,}/gi, '$1$2***')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, (m) => (/^[a-f0-9]{40}$/.test(m) ? m : '***'))

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
    const r = await exec(c, name, ['bun', 'test', '--timeout', '20000', ...(file ? [file] : [])], API, { TEST_DATABASE_URL: `${PG}/${TEST_DB.E2E_DB}` }, 20)
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

export const changedSinceMain = (...paths: string[]) => {
  const base = sh(['git', 'merge-base', 'HEAD', 'origin/main']).out
  const diff = sh(['git', 'diff', '--name-only', base, '--', ...paths]).out
  const untracked = sh(['git', 'ls-files', '--others', '--exclude-standard', '--', ...paths]).out
  return [...new Set([diff, untracked].join('\n').split('\n').filter(Boolean))]
}
// The loop's own controls: changing one needs `bun loop learn`, which records the file's content hash.
export const LOOP_FILES = ['tools/loop', '.claude/skills/strategy-loop', '.claude/agents', '.claude/settings.json', 'apps/api/scripts/e2e-db.ts', 'apps/api/scripts/coverage.ts', '.github/workflows/check.yml']
export const blob = (f: string) => sh(['git', 'hash-object', '--', f]).out

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
    // State changes only through `bun loop`: STATE.md matches state.json, state.json has no uncommitted edits, every
    // commit that touched it is a `chore(loop):` commit, and each changed loop file is the exact content a
    // `bun loop learn` recorded.
    name: 'state',
    run: async (c) => {
      const problems: string[] = []
      if (readFileSync(path.join(LOOP, 'STATE.md'), 'utf8') !== renderState(c.state)) problems.push('STATE.md differs from state.json')
      if (c.state.item) {
        if (sh(['git', 'status', '--porcelain', '--', 'docs/strategy/loop/state.json']).out) problems.push('state.json has uncommitted edits')
        const base = sh(['git', 'merge-base', 'HEAD', 'origin/main']).out
        const foreign = sh(['git', 'log', '--format=%h %s', `${base}..HEAD`, '--', 'docs/strategy/loop/state.json']).out.split('\n').filter((l) => l && !/^\w+ chore\(loop\):/.test(l))
        if (foreign.length) problems.push(`state.json changed outside bun loop: ${foreign[0]}`)
        const learned = new Set(c.state.learnings.filter((l) => l.item === c.state.item).flatMap((l) => Object.entries(l.files ?? {}).map(([f, h]) => `${f}@${h}`)))
        const unlearned = changedSinceMain(...LOOP_FILES).filter((f) => !learned.has(`${f}@${existsSync(path.join(ROOT, f)) ? blob(f) : 'deleted'}`))
        if (unlearned.length) problems.push(`loop files changed without bun loop learn: ${unlearned.slice(0, 2).join(', ')}`)
      }
      return { ok: !problems.length, note: problems.join('; ') }
    },
  },
  typecheckApi,
  cmd('typecheck-web', ['bun', 'run', 'typecheck'], WEB),
  cmd('typecheck-loop', [TSC, '-p', 'tools/loop'], ROOT),
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
    if (await fetch(url, { signal: AbortSignal.timeout(2000) }).then(() => true, () => false)) return true
    await Bun.sleep(500)
  }
  return false
}

const serve = (argv: string[], cwd: string, log: string, env: Record<string, string>) => {
  const p = Bun.spawn(['bash', '-c', 'exec "$@" >"$LOG" 2>&1', 'serve', ...argv], { cwd, env: { ...process.env, ...env, LOG: log } })
  children.add(p)
  return p
}

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
      await exec(c, file, ['node', `tools/e2e/${f}`], ROOT, { E2E_BASE_URL: `http://localhost:${webPort}`, E2E_EVIDENCE_DIR: out, E2E_MEDIA: c.media }, 30)
      const results = path.join(out, 'results.json')
      if (!existsSync(results)) c.flows.push({ file, name: `${f} crashed`, ok: false, fail: `no results.json, see ${file}.log` })
      else for (const r of JSON.parse(readFileSync(results, 'utf8')).flows) c.flows.push({ file, ...r })
    }
    c.metrics.g3Flows = c.flows.filter((f) => f.name.includes('[G3]')).length
    c.metrics.g6Flows = c.flows.filter((f) => f.name.includes('[G6]')).length
    const pass = c.flows.filter((f) => f.ok).length
    return { ok: c.flows.length > 0 && pass === c.flows.length, note: `${pass}/${c.flows.length} flows` }
  } finally {
    for (const p of [api, web]) {
      p.kill()
      await p.exited
      children.delete(p)
    }
  }
}

// One line per step: the first error line when it failed, else the tail ("seeded manufaktur { events: … }").
const lastLine = (s: string) => {
  const lines = s.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  return (lines.find((l) => /^(error|\w*Error)\b/i.test(l)) ?? lines.slice(-6).join(' ')).replace(/\s+/g, ' ').slice(0, 200)
}
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
  {
    // The item's own acceptance command, run after the stack stops; the guard hook cannot see inside `bun loop`.
    name: 'done-when',
    run: async (c) => {
      const cmd = c.state.plan?.doneWhen
      if (!cmd) return { ok: true, note: 'n/a: no plan' }
      if (blocked('Bash', { command: cmd })) return { ok: false, note: 'done-when reaches production or secrets: an owner step' }
      const r = await exec(c, 'done-when', ['bash', '-c', cmd], ROOT)
      return { ok: !r.code, note: r.code ? `exit ${r.code}: ${lastLine(r.out + r.err)}` : cmd }
    },
  },
]

/** Runs steps in parallel (independent checks) or in order, skipping the rest after a failed `db` or `seed`. */
export async function runSteps(steps: Step[], c: Ctx, parallel: boolean): Promise<StepResult[]> {
  const one = async (s: Step): Promise<StepResult> => {
    const t = performance.now()
    const r = await s.run(c).catch((e: Error) => ({ ok: false, note: String(e.message).split('\n')[0]! }))
    const log = path.join(c.dir, `${s.name}.log`)
    // Logs stay local (gitignored); a failing step keeps its last lines, redacted, in runs.jsonl, which is committed.
    const tail = !r.ok && existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter((l) => l.trim()).slice(-15).map((l) => redact(l).slice(0, 200)) : undefined
    return { name: s.name, ok: r.ok, note: redact(r.note), ms: Math.round(performance.now() - t), ...(tail && { tail }) }
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
  { id: 'G11', name: "The item's done-when", passWhen: "The plan's done-when command exits 0 (and does not reach production); n/a without a plan", steps: '`done-when`', source: 'Review round 2: done-when was never run', judge: (r, s) => (s.plan?.doneWhen ? ok(r, 'done-when') : null) },
  { id: 'G12', name: 'Promised flows exist', passWhen: "Every flow name in the plan's `evalCases` is an e2e flow that ran and passed; n/a when the plan promises none", steps: '`e2e`', source: 'Review round 3: promised flows were never checked', judge: (r, s) => (s.plan?.evalCases.length ? s.plan.evalCases.every((name) => r.flows.some((f) => f.name === name && f.ok)) : null) },
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
