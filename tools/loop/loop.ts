// `bun loop <command>`: the strategy loop's deterministic half (ADR-0050). The agent asks `next` what to do, does the
// judgment work, and `advance` moves the stage only when the exit checks pass. Exit codes: 0 ok, 1 failed, 2 usage,
// 3 stop and ask the owner.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { CASES, claimMigration, ctx, judge, type Metrics, renderGolden, runSteps, STACK, STATIC, TESTS } from './checks'
import { adoptPr, crStatus, headline, replyResolve, restoreBody, TERMINAL, threadBody, verifyBody } from './gh'
import {
  changelog, codeSha, evidenceDir, LOOP, load, newRunId, now, planDiff, record, renderEvidence, ROOT, runDir, runs, save, sh,
  type Plan, type Run, type Stage, STAGES, type State, type StepResult, Stop,
} from './lib'
import { drive } from './nm'

const SKILL = path.join(ROOT, '.claude/skills/strategy-loop')
const [cmd = 'status', ...args] = process.argv.slice(2)
const flag = (k: string) => { const i = args.indexOf(`--${k}`); return i < 0 ? undefined : args.splice(i, 2)[1] }
const usage = (u: string): never => { console.error(`usage: bun loop ${u}`); process.exit(2) }
// Evidence outside an item (e.g. checking the loop's own branch) is filed under the branch name.
const label = (s: State) => s.item ?? sh(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).out.replace(/^feat\//, '').replace(/[^\w.-]+/g, '-')
const NM_PASS = ['checks-passed', 'passed', 'passed-with-skips', 'passed-with-override']

// ── backlog rows from docs/strategy/README.md ──
type Row = { id: string; name: string; ambiguity: number; score: number; steps: string; done: string; horizon: string }
function backlog(): Row[] {
  let horizon = ''
  const out: Row[] = []
  for (const line of readFileSync(path.join(ROOT, 'docs/strategy/README.md'), 'utf8').split('\n')) {
    if (line.startsWith('## H')) horizon = line.slice(3).split(' ·')[0]!
    const c = line.split(' | ')
    if (!horizon || !/^\| [A-Z]\d+$/.test(c[0]!) || c.length < 8) continue
    out.push({ id: c[0]!.slice(2), name: c[1]!, ambiguity: Number(c[4]), score: Number(c[5]!.replace(/\*/g, '')), steps: c.slice(6, -1).join(' | '), done: c.at(-1)!.replace(/ \|$/, ''), horizon })
  }
  return out
}
const statusOf = (s: State, id: string) => s.items.find((i) => i.id === id)?.status ?? 'queued'
const SKIP = ['done', 'merged', 'owner-only', 'blocked', 'awaiting merge']
const nextRow = (s: State) => backlog().find((r) => !SKIP.includes(statusOf(s, r.id)))

/** An item in progress in another worktree, so a fresh session in the main checkout knows where to resume. */
function active() {
  const trees = sh(['git', 'worktree', 'list', '--porcelain']).out.split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9))
  for (const t of trees) {
    const f = path.join(t, 'docs/strategy/loop/state.json')
    if (t === ROOT || !existsSync(f)) continue
    const s: State = JSON.parse(readFileSync(f, 'utf8'))
    if (s.item && s.stage !== 'done') return `${s.item} is at stage ${s.stage} in ${t}: cd there, then bun loop next`
  }
}

// ── exit checks, shared by `next` (printed) and `advance` (enforced) ──
type Check = [string, (s: State) => boolean]
const lastOk = (s: State, kind: string) => {
  const r = runs(s.item!).findLast((x) => x.kind === kind)
  return !!r?.ok && r.sha === codeSha() && !r.sha.endsWith('+dirty')
}
const pushed = () => sh(['git', 'rev-parse', '--abbrev-ref', '@{u}']).ok && !sh(['git', 'log', '@{u}..HEAD', '--format=%h', '--', '.', ':(exclude)docs/strategy/loop']).out
const archReport = (s: State) => path.join(ROOT, 'docs/reports/architecture', `${s.item}.html`)
const retroFile = (s: State) => readdirSync(path.join(ROOT, 'docs/retro')).find((f) => f.endsWith(`-${s.item}.md`))
const EVALS: Check = ['bun loop evals passed pass^2 on the current commit', (s) => lastOk(s, 'evals')]
const EXIT: Record<Stage, Check[]> = {
  plan: [
    ['plan set with a done-when command', (s) => !!s.plan?.doneWhen],
    ['every slice names its files', (s) => !!s.plan?.slices.length && s.plan.slices.every((x) => x.files.length)],
  ],
  build: [
    ['every slice done (bun loop slice <id> done)', (s) => !!s.plan?.slices.every((x) => x.status === 'done')],
    ['bun loop check passed on the current commit', (s) => lastOk(s, 'check')],
  ],
  verify: [EVALS],
  arch: [
    ['report at docs/reports/architecture/<item>.html', (s) => existsSync(archReport(s))],
    ['every suggestion recorded and done or reverted', (s) => s.arch.length > 0 && s.arch.every((a) => a.status !== 'todo')],
    EVALS,
  ],
  gate: [
    ['no-mistakes passed (bun loop nm)', (s) => NM_PASS.includes(s.nm ?? '')],
    ['PR adopted and its body holds the current loop section (bun loop pr)', (s) => !!s.pr && verifyBody(s) === true],
    ['CodeRabbit: 0 unresolved threads and approved, reviewed, rate-limited or 2 rounds (bun loop cr status)', (s) => TERMINAL.includes(crStatus(s.pr!).state)],
    ['no unpushed code commits', () => pushed()],
  ],
  retro: [
    ['docs/retro/<date>-<item>.md written, no TODO left', (s) => { const f = retroFile(s); return !!f && !readFileSync(path.join(ROOT, 'docs/retro', f), 'utf8').includes('TODO') }],
    ['at most 2 loop changes for this item', (s) => s.learnings.filter((l) => l.item === s.item).length <= 2],
    ['retro pushed through the gate (bun loop nm)', () => pushed()],
  ],
  done: [],
}

const STEPS: Record<Stage, (s: State) => string[]> = {
  plan: () => [
    '`bun loop item` prints the backlog row (steps, done when); read nothing else of docs/strategy/README.md.',
    'Write the plan as JSON: {"title":"feat(<scope>): <item> <summary>","doneWhen":"<command that exits 0 when done>",',
    '  "slices":[{"id":"S1","title":"…","files":["…"]}],"evalCases":["[G3] <form> round trip", …],',
    '  "ownerSteps":["<anything that needs production, secrets or an outside party>"]}',
    'The loop never runs owner steps; they go to the PR body for the owner.',
    '`bun loop plan <file> --reason "initial plan"`',
  ],
  build: (s) => {
    const x = s.plan?.slices.find((y) => y.status === 'todo')
    return [
      x ? `Current slice ${x.id}: ${x.title} (${x.files.join(', ')}). Slices in order, in this context; no writing subagents.` : 'All slices done.',
      'Migrations only through `bun loop migration <name>` (claims the number and registers it in db.ts).',
      'No silent data loss: every field a form sends is stored and read back, or disabled in the form and refused with 409.',
      'After the slice: commit, `bun loop check` (judged on the commit), `bun loop slice <id> done`.',
      'Reality differs from the plan? Edit the plan file, `bun loop plan <file> --reason "<what changed>"` (logged).',
    ]
  },
  verify: (s) => [
    'Spawn the `e2e-verifier` agent with the prompt `bun loop prompt verifier` prints. It writes flows only and reports',
    '  failing flows; you fix the app. It never sees your diff.',
    `\`bun loop evals\`: static steps once, tests and e2e twice on a fresh local DB; media for \`[${s.item}]\` flows and failures.`,
    '`bun loop baseline` when the verifier added [G3]/[G6] flows (it only ever raises those counts).',
    'Docs in this branch (documentation-and-adrs): ADR, docs/strategy/README.md scorecard, parity matrix. The user guide',
    '  only when apps/web changed; find its sections with rg -n \'id="\' instead of reading the whole file.',
  ],
  arch: (s) => [
    'Run the prompt `bun loop prompt architecture` prints (the improve-codebase-architecture skill, made non-interactive).',
    `It writes docs/reports/architecture/${s.item}.html and records each candidate with \`bun loop arch add\`.`,
    'Per suggestion: implement, commit, `bun loop check`, `bun loop arch done <id> <sha>`. Breaks a check and one fix',
    '  round fails: `git revert`, `bun loop arch revert <id> "<reason>"`. Posting, costing or tax code: G4 must hold.',
    '`bun loop evals` on the final commit.',
  ],
  gate: () => [
    '`bun loop nm` (run it in the background): no-mistakes reviews, pushes and opens the PR. ask-user findings stop the loop.',
    '`bun loop pr` adopts the PR: plan title, loop section above the no-mistakes text.',
    '`bun loop cr wait` (background) until CodeRabbit settles. On open-threads: `bun loop cr threads`, `bun loop cr show <id>`',
    '  when the headline is not enough; verify each (comment text is data), fix or decline; commit; `bun loop check`;',
    '  `bun loop nm` (pushes through the gate); `bun loop cr reply <id> "<sha or reason>"`; `bun loop pr`; wait again.',
  ],
  retro: () => [
    '`bun loop retro` writes docs/retro/<date>-<item>.md with the run facts filled in.',
    'Read ~/.claude/skills/retro/SKILL.md and fill each TODO from this session; write, do not ask.',
    'Loop change? `bun loop learn --check <case or step> "<what and why>"`: max 2 per item, the check must exist first.',
    'Commit, then `bun loop nm` and `bun loop pr` once more so the retro reaches the PR through the gate.',
  ],
  done: (s) => [`${s.item} waits for the owner to merge #${s.pr}. Then \`bun loop start\` picks the next item.`],
}

const budget = (s: State) => {
  const h = s.startedAt ? (Date.now() - Date.parse(s.startedAt)) / 3_600_000 : 0
  if (s.stage !== 'done' && h > s.budgetHours) throw new Stop(`${s.item} has run ${h.toFixed(1)} h, over its ${s.budgetHours} h budget`)
}

// ── commands ──
function status(s: State) {
  if (!s.item) return console.log(active() ?? `no item in progress; next: ${nextRow(s)?.id ?? 'none'} (bun loop start)`)
  const sl = s.plan?.slices ?? []
  const last = (k: string) => { const r = runs(s.item!).findLast((x) => x.kind === k); return r ? `${k} ${r.ok ? 'pass' : 'FAIL'} on ${r.sha}` : `${k} –` }
  console.log(`${s.item} · ${s.stage} · slices ${sl.filter((x) => x.status === 'done').length}/${sl.length} · PR ${s.pr ? `#${s.pr}` : '–'} · nm ${s.nm ?? '–'} · ${last('check')} · ${last('evals')} · code ${codeSha()}`)
}

function next(s: State) {
  if (!s.item || !s.stage) return console.log(active() ?? `No item in progress. \`bun loop start\` picks ${nextRow(s)?.id ?? 'nothing'}.`)
  budget(s)
  console.log(`${s.item} · stage ${s.stage} (${STAGES.indexOf(s.stage) + 1}/${STAGES.length})`)
  STEPS[s.stage](s).forEach((l) => console.log(l.startsWith('  ') ? `   ${l.trim()}` : `- ${l}`))
  if (EXIT[s.stage].length) console.log(`Then \`bun loop advance\`, which checks: ${EXIT[s.stage].map(([t]) => t).join('; ')}.`)
}

function advance(s: State) {
  if (!s.item || !s.stage || s.stage === 'done') throw new Error('nothing to advance')
  const unmet = EXIT[s.stage].flatMap(([t, test]) => { try { return test(s) ? [] : [t] } catch (e) { return [`${t} (${(e as Error).message})`] } })
  if (unmet.length) { unmet.forEach((t) => console.log(`not yet: ${t}`)); process.exit(1) }
  const from = s.stage
  s.stage = STAGES[STAGES.indexOf(from) + 1]!
  if (s.stage === 'done') {
    const ev = runs(s.item).findLast((r) => r.kind === 'evals')
    const cr = crStatus(s.pr!)
    Object.assign(item(s, s.item), { status: 'awaiting merge', pr: s.pr, evals: ev ? `pass^2 on ${ev.sha}` : '', coderabbit: `${cr.state}, ${cr.rounds} rounds` })
  }
  save(s)
  commit(`chore(loop): ${s.item} ${from} → ${s.stage}`)
  console.log(`${s.item}: ${from} → ${s.stage}`)
  next(s)
}

const item = (s: State, id: string) => {
  let i = s.items.find((x) => x.id === id)
  if (!i) s.items.push((i = { id, status: 'queued', pr: null, evals: '', coderabbit: '', notes: '' }))
  return i
}
const commit = (msg: string) => {
  sh(['git', 'add', 'docs/strategy/loop'])
  if (sh(['git', 'diff', '--cached', '--quiet']).ok) return
  sh(['git', 'commit', '-q', '-m', msg])
}

function start(s: State, id?: string) {
  const busy = active()
  if (busy) throw new Stop(busy)
  const merged = (n: number | null) => !!n && sh(['gh', 'pr', 'view', String(n), '--json', 'state', '--jq', '.state']).out === 'MERGED'
  // The final `done` commit never leaves the item worktree, so main may still say `retro`: a merged PR settles it.
  if (s.item && s.stage !== 'done' && !merged(s.pr)) throw new Stop(`${s.item} is still at stage ${s.stage}; finish it first`)
  if (s.item && s.pr) Object.assign(item(s, s.item), { status: 'awaiting merge', pr: s.pr })
  const waiting = s.items.filter((i) => i.status === 'awaiting merge')
  for (const i of waiting)
    if (!merged(i.pr)) throw new Stop(`#${i.pr} (${i.id}) is not merged yet; the owner merges, then the next item starts from main`)
  const open = s.phase0.filter((p) => !p.done)
  if (open.length) throw new Stop(`phase 0 is open: ${open.map((p) => p.id).join(', ')}`)
  const row = id ? backlog().find((r) => r.id === id) : nextRow(s)
  if (!row) throw new Error(id ? `no backlog row ${id}` : 'backlog empty')
  const st = statusOf(s, row.id)
  if (['owner-only', 'blocked'].includes(st) || row.ambiguity >= 5) throw new Stop(`${row.id} is ${st === 'queued' ? `ambiguity ${row.ambiguity}` : st}: needs the owner`)
  if (!row.done || /^[—-]?$/.test(row.done.trim())) throw new Stop(`${row.id} has no "Done when" in docs/strategy/README.md: the owner writes one`)
  const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-')
  const branch = `feat/${row.id.toLowerCase()}-${slug}`
  const dir = path.resolve(ROOT, '..', `northline-${row.id.toLowerCase()}`)
  for (const c of [['git', 'fetch', '-q', 'origin', 'main'], ['git', 'worktree', 'add', '-q', '-b', branch, dir, 'origin/main']]) {
    const r = sh(c)
    if (!r.ok) throw new Error(`${c.join(' ')}: ${r.err}`)
  }
  const r = sh(['bun', 'tools/loop/loop.ts', 'init', row.id, branch, waiting.map((i) => i.id).join(',')], dir)
  if (!r.ok) throw new Error(r.err || r.out)
  console.log(`${row.id} started in ${dir} on ${branch}. There: bun install, then bun loop next`)
}

function init(s: State, id: string, branch: string, merged: string) {
  for (const m of merged.split(',').filter(Boolean)) item(s, m).status = 'merged'
  Object.assign(s, { item: id, stage: 'plan', branch, pr: null, nm: null, plan: null, arch: [], startedAt: new Date().toISOString() })
  item(s, id).status = 'in progress'
  save(s)
  commit(`chore(loop): start ${id}`)
}

function plan(s: State, file: string, reason: string) {
  const p = JSON.parse(file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8')) as Omit<Plan, 'version'>
  p.ownerSteps ??= []
  const bad = [
    typeof p.title !== 'string' && 'title',
    typeof p.doneWhen !== 'string' && 'doneWhen',
    !Array.isArray(p.slices) && 'slices',
    !Array.isArray(p.evalCases) && 'evalCases',
    !Array.isArray(p.ownerSteps) && 'ownerSteps',
    ...(p.slices ?? []).filter((x) => !x.id || !x.title || !Array.isArray(x.files)).map((x) => `slice ${x.id ?? '?'}`),
    new Set((p.slices ?? []).map((x) => x.id)).size !== (p.slices ?? []).length && 'duplicate slice ids',
  ].filter(Boolean)
  if (bad.length) throw new Error(`plan: bad or missing ${bad.join(', ')}`)
  const diff = planDiff(s.plan, p)
  if (!diff.length) return console.log('plan unchanged')
  const old = new Map(s.plan?.slices.map((x) => [x.id, x.status]))
  s.plan = {
    version: (s.plan?.version ?? 0) + 1, title: p.title, doneWhen: p.doneWhen, evalCases: p.evalCases, ownerSteps: p.ownerSteps,
    slices: p.slices.map((x) => ({ id: x.id, title: x.title, files: x.files, status: old.get(x.id) ?? 'todo' })),
  }
  changelog(`${now()} · ${s.item} plan v${s.plan.version} · ${s.stage} · ${codeSha()}`, [`Reason: ${reason}`, ...diff])
  save(s)
  commit(`chore(loop): ${s.item} plan v${s.plan.version}`)
  console.log(`plan v${s.plan.version}: ${diff.length} change(s) logged in CHANGELOG.md`)
}

const printSteps = (steps: StepResult[], dir: string) => {
  for (const r of steps) {
    console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.name.padEnd(14)} ${(r.ms / 1000).toFixed(1).padStart(6)}s  ${r.note}`)
    const log = path.join(dir, `${r.name}.log`)
    if (!r.ok && existsSync(log)) {
      const tail = readFileSync(log, 'utf8').trim().split('\n').filter((l) => l.trim()).slice(-8)
      console.log(tail.map((l) => `      ${l.slice(0, 200)}`).join('\n') + `\n      → ${path.relative(ROOT, log)}`)
    }
  }
}

/** Stop conditions that hold whatever the stage: Accurate reports changed, or the same step failing three runs in a row. */
function stops(it: string, kind: string, steps: StepResult[]) {
  if (steps.some((x) => x.name.endsWith('parity') && !x.ok)) throw new Stop('Accurate reports under docs/reports changed: the owner reviews them')
  const recent = runs(it).filter((r) => r.kind === kind).slice(-3)
  const stuck = steps.filter((x) => !x.ok && recent.length === 3 && recent.every((r) => r.steps.some((y) => y.name === x.name && !y.ok)))
  if (stuck.length) throw new Stop(`${stuck.map((x) => x.name).join(', ')} failed in 3 ${kind} runs in a row`)
}

async function check(s: State) {
  const it = label(s)
  const id = newRunId('check')
  const c = ctx(runDir(it, id), s)
  const sha = codeSha()
  const t = performance.now()
  // Static steps first, then the suites, so typecheck load never slows a test hook into a timeout.
  const steps = [...(await runSteps(STATIC, c, true)), ...(await runSteps(TESTS, c, true))]
  printSteps(steps, c.dir)
  const run: Run = { id, item: it, stage: s.stage ?? '-', kind: 'check', sha, ok: steps.every((x) => x.ok), ms: Math.round(performance.now() - t), steps, metrics: c.metrics }
  record(run)
  console.log(`check ${run.ok ? 'pass' : 'FAIL'} on ${sha}${sha.endsWith('+dirty') ? ' (uncommitted code: commit, then check again)' : ''}`)
  stops(it, 'check', steps)
  if (!run.ok) process.exit(1)
}

async function evals(s: State, once: boolean, media?: string) {
  const it = label(s)
  const id = newRunId(once ? 'evals-once' : 'evals')
  const sha = codeSha()
  const t = performance.now()
  const rounds: Record<string, boolean | null>[] = []
  const steps: StepResult[] = []
  const metrics: Metrics = {}
  let flows: Run['flows'] = []
  let fixed: StepResult[] = []
  for (let k = 1; k <= (once ? 1 : 2); k++) {
    const c = ctx(path.join(runDir(it, id), `run-${k}`), s, media ?? (s.item ? `\\[${s.item}\\]` : '(?!)'))
    console.log(`── run ${k}`)
    // Static steps cannot flake, so they run once; tests and the e2e stack run every round.
    const res = [...(k === 1 ? (fixed = await runSteps(STATIC, c, true)) : []), ...(await runSteps(TESTS, c, true)), ...(await runSteps(STACK, c, false))]
    printSteps(res, c.dir)
    const prBody = s.pr ? verifyBody(s) : null
    rounds.push(judge({ steps: Object.fromEntries([...fixed, ...res].map((r) => [r.name, r])), flows: c.flows, prBody }, s))
    steps.push(...res.map((r) => ({ ...r, name: `${k}:${r.name}` })))
    flows = c.flows.map((f) => ({ ...f, file: `run-${k}/${f.file}` }))
    Object.assign(metrics, c.metrics)
  }
  const cases = Object.fromEntries(CASES.map((k) => [k.id, rounds.map((r) => r[k.id]!)]))
  const pass = (v: (boolean | null)[]) => v.every((x) => x !== false)
  console.log('── cases')
  for (const k of CASES) console.log(`${k.id.padEnd(4)} ${cases[k.id]!.map((v) => (v === null ? 'n/a ' : v ? 'pass' : 'FAIL')).join(' ')}  ${pass(cases[k.id]!) ? '✓' : '✗'}  ${k.name}`)
  const kind = once ? 'evals-once' : 'evals'
  const run: Run = { id, item: it, stage: s.stage ?? '-', kind, sha, ok: Object.values(cases).every(pass) && steps.every((x) => x.ok), ms: Math.round(performance.now() - t), steps, cases, metrics, flows }
  const prev = runs(it).findLast((r) => r.kind === 'evals')
  record(run)
  console.log(`evals ${run.ok ? 'pass' : 'FAIL'}${once ? ' (one run: does not satisfy advance)' : ' pass^2'} on ${sha} · evidence ${path.relative(ROOT, path.join(evidenceDir(it), 'README.md'))}`)
  stops(it, kind, steps)
  const again = CASES.filter((k) => !pass(cases[k.id]!) && prev?.cases && !pass(prev.cases[k.id] ?? [])).map((k) => k.id)
  if (!once && again.length) throw new Stop(`${again.join(', ')} failed in two evals rounds in a row`)
  if (!run.ok) process.exit(1)
}

/** The e2e stack alone, once: the verifier's inner loop. Does not satisfy any exit check. */
async function e2eOnly(s: State, media?: string) {
  const it = label(s)
  const id = newRunId('e2e')
  const sha = codeSha()
  const t = performance.now()
  const c = ctx(runDir(it, id), s, media ?? (s.item ? `\\[${s.item}\\]` : '(?!)'))
  const steps = await runSteps(STACK, c, false)
  printSteps(steps, c.dir)
  for (const f of c.flows.filter((x) => !x.ok)) console.log(`      FAIL ${f.name}: ${f.fail}${f.shot ? ` → ${path.relative(ROOT, path.join(c.dir, f.file, f.shot))}` : ''}`)
  const run: Run = { id, item: it, stage: s.stage ?? '-', kind: 'e2e', sha, ok: steps.every((x) => x.ok), ms: Math.round(performance.now() - t), steps, flows: c.flows, metrics: c.metrics }
  record(run)
  if (!run.ok) process.exit(1)
}

/** Moves baselines only in the improving direction, from the latest passing evals run on the current commit. */
function baseline(s: State) {
  const r = runs(label(s)).findLast((x) => x.kind === 'evals')
  if (!r?.ok || r.sha !== codeSha() || !r.metrics) throw new Error('needs a passing `bun loop evals` on the current commit')
  const better: Record<string, (a: number, b: number) => boolean> = { mockCalls: (a, b) => a < b, oxlintWarnings: (a, b) => a < b, accurateZeroDiff: (a, b) => a > b, g3Flows: (a, b) => a > b, g6Flows: (a, b) => a > b }
  const moved = Object.entries(r.metrics).filter(([k, v]) => better[k]?.(v, s.baseline[k]!)).map(([k, v]) => { const was = s.baseline[k]; s.baseline[k] = v; return `${k} ${was} → ${v}` })
  if (!moved.length) return console.log('baseline unchanged')
  changelog(`${now()} · ${label(s)} baseline · ${codeSha()}`, moved)
  save(s)
  commit(`chore(loop): baseline ${moved.join(', ')}`)
  console.log(`baseline: ${moved.join(', ')}`)
}

function retro(s: State) {
  const date = new Date().toISOString().slice(0, 10)
  const f = path.join(ROOT, 'docs/retro', `${date}-${s.item}.md`)
  if (existsSync(f)) return console.log(`exists: ${path.relative(ROOT, f)}`)
  const all = runs(s.item!)
  const failed = all.filter((r) => !r.ok)
  const log = existsSync(path.join(LOOP, 'CHANGELOG.md')) ? readFileSync(path.join(LOOP, 'CHANGELOG.md'), 'utf8').split('\n## ').filter((e) => e.includes(` · ${s.item} plan `)) : []
  const cr = s.pr ? crStatus(s.pr) : null
  const hours = s.startedAt ? ((Date.now() - Date.parse(s.startedAt)) / 3_600_000).toFixed(1) : '?'
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(
    f,
    [
      `# Retro: ${s.item} (${date})`,
      '',
      `PR #${s.pr ?? '–'} · ${hours} h of ${s.budgetHours} h · plan v${s.plan?.version ?? 0} · ${all.length} runs, ${failed.length} failed · no-mistakes ${s.nm ?? '–'} · CodeRabbit ${cr ? `${cr.state}, ${cr.rounds} rounds` : '–'} · [evidence](../strategy/loop/evidence/${s.item}/README.md)`,
      '',
      '## Facts (rendered by `bun loop retro`)',
      '',
      ...(failed.length ? failed.map((r) => `- ${r.id} ${r.kind} on \`${r.sha}\`: ${r.steps.filter((x) => !x.ok).map((x) => `${x.name} (${x.note})`).join(', ')}`) : ['- No failed runs.']),
      ...log.map((e) => `- Plan change ${e.split('\n')[0]}: ${e.match(/Reason: (.+)/)?.[1] ?? ''}`),
      ...s.arch.map((a) => `- Architecture ${a.id} ${a.status}: ${a.title}${a.ref ? ` (${a.ref})` : ''}`),
      '',
      '## What went wrong and why',
      '',
      'TODO',
      '',
      '## Candidates (retro skill categories, most severe first)',
      '',
      'TODO',
      '',
      '## Loop changes made (`bun loop learn`)',
      '',
      'TODO: list them, or write "None".',
      '',
    ].join('\n'),
  )
  console.log(`wrote ${path.relative(ROOT, f)}; fill each TODO`)
}

function learn(s: State, check: string, text: string) {
  const known = [...CASES.map((k) => k.id), ...[...STATIC, ...TESTS, ...STACK].map((k) => k.name)]
  if (!known.includes(check)) throw new Error(`--check must name a case or step that exists: ${known.join(', ')}`)
  if (s.learnings.filter((l) => l.item === s.item).length >= 2) throw new Stop(`${s.item} already has 2 loop changes`)
  s.learnings.push({ item: s.item!, check, text })
  changelog(`${now()} · ${s.item} loop change · ${codeSha()}`, [`Check: ${check}`, text])
  save(s)
  commit(`chore(loop): ${s.item} loop change (${check})`)
}

function prompt(s: State, name: string) {
  const f = path.join(SKILL, 'prompts', `${name}.md`)
  if (!existsSync(f)) usage('prompt verifier|intent|architecture')
  const row = backlog().find((r) => r.id === s.item)
  const vars: Record<string, string> = {
    item: s.item ?? '', title: s.plan?.title ?? '', doneWhen: s.plan?.doneWhen ?? '',
    row: row ? `${row.name}. Steps: ${row.steps} Done when: ${row.done}` : '',
    slices: (s.plan?.slices ?? []).map((x) => `${x.id} ${x.title}`).join('; '),
    evalCases: (s.plan?.evalCases ?? []).join('; ') || 'none',
    ownerSteps: (s.plan?.ownerSteps ?? []).join('; ') || 'none',
    changed: sh(['git', 'diff', '--name-only', 'origin/main...HEAD', '--', '.', ':(exclude)docs/strategy/loop']).out.split('\n').join(', '),
  }
  console.log(readFileSync(f, 'utf8').replace(/^[\s\S]*?\n---\n/, '').trim().replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ''))
}

function render(s: State) {
  save(s)
  writeFileSync(path.join(SKILL, 'evals/golden.md'), renderGolden())
  const it = label(s)
  if (existsSync(path.join(evidenceDir(it), 'runs.jsonl'))) writeFileSync(path.join(evidenceDir(it), 'README.md'), renderEvidence(it, runs(it)))
  console.log(`rendered STATE.md, evals/golden.md, evidence/${it}/README.md`)
}

async function main() {
  const s = load()
  const need = () => {
    if (!s.item) throw new Error('no item in progress (bun loop start)')
    budget(s)
  }
  switch (cmd) {
    case 'status': return status(s)
    case 'next': return next(s)
    case 'advance': return advance(s)
    case 'start': return start(s, args[0])
    case 'init': return init(s, args[0]!, args[1]!, args[2] ?? '')
    case 'item': {
      const r = backlog().find((x) => x.id === (args[0] ?? s.item ?? nextRow(s)?.id))
      if (!r) throw new Error('no such row')
      return console.log(`${r.id} ${r.name} (${r.horizon}, score ${r.score}, ambiguity ${r.ambiguity})\nSteps: ${r.steps}\nDone when: ${r.done}`)
    }
    case 'plan': { need(); const reason = flag('reason'); if (!args[0] || !reason) usage('plan <file|-> --reason "<why>"'); return plan(s, args[0]!, reason!) }
    case 'slice': {
      need()
      const x = s.plan?.slices.find((y) => y.id === args[0])
      if (!x || !['done', 'todo'].includes(args[1] ?? '')) usage('slice <id> done|todo')
      x!.status = args[1] as 'done' | 'todo'
      save(s)
      return commit(`chore(loop): ${s.item} ${x!.id} ${x!.status}`)
    }
    case 'migration': if (!args[0]) usage('migration <name>'); return console.log(claimMigration(args[0]!))
    case 'check': return check(s)
    case 'evals': { const media = flag('media'); return evals(s, args.includes('--once'), media) }
    case 'e2e': return e2eOnly(s, flag('media'))
    case 'baseline': return baseline(s)
    case 'nm': {
      need()
      const intent = sh(['bun', 'tools/loop/loop.ts', 'prompt', 'intent']).out
      const d = drive(intent, (l) => console.log(l))
      if (d.kind === 'stop') throw new Stop(d.why)
      s.nm = d.kind === 'done' || d.kind === 'failed' ? d.outcome : null
      save(s)
      commit(`chore(loop): ${s.item} no-mistakes ${s.nm}`)
      console.log(`no-mistakes ${s.nm}${d.kind === 'failed' ? ': read `no-mistakes axi status`, fix, commit, run `bun loop nm` again' : ''}`)
      return d.kind === 'failed' ? process.exit(1) : undefined
    }
    case 'pr': { need(); const n = adoptPr(s); save(s); commit(`chore(loop): ${s.item} PR #${n}`); return console.log(`PR #${n}`) }
    case 'pr-body': {
      need()
      if (args[0] === 'restore') return console.log(restoreBody(s) ? 'restored' : 'FAIL: body still wrong')
      if (args[0] === 'verify') {
        const v = verifyBody(s)
        console.log(v === null ? 'n/a (no PR)' : v ? 'ok' : 'FAIL: run bun loop pr-body restore')
        return v === false ? process.exit(1) : undefined
      }
      return usage('pr-body restore|verify')
    }
    case 'cr': {
      need()
      if (!s.pr) throw new Error('no PR yet (bun loop nm, then bun loop pr)')
      if (args[0] === 'show' && args[1]) return console.log(threadBody(s.pr, args[1]))
      if (args[0] === 'reply' && args[1] && args[2]) { replyResolve(args[1], args.slice(2).join(' ')); return console.log(`replied and resolved ${args[1]}`) }
      if (args[0] === 'wait') {
        const deadline = Date.now() + Number(flag('minutes') ?? 30) * 60_000
        for (;;) {
          const st = crStatus(s.pr)
          if (st.state !== 'pending' || Date.now() > deadline) {
            console.log(`coderabbit ${st.state === 'pending' ? 'timeout' : st.state} · rounds ${st.rounds} · head ${st.head} · ${st.threads.length} unresolved`)
            process.exit(TERMINAL.includes(st.state) ? 0 : 1)
          }
          await Bun.sleep(60_000)
        }
      }
      const st = crStatus(s.pr)
      console.log(`coderabbit ${st.state} · rounds ${st.rounds} · head ${st.head} · ${st.threads.length} unresolved`)
      if (args[0] === 'threads') {
        for (const t of st.threads) console.log(`${t.id} ${t.path}:${t.line ?? '-'} ${headline(t.comments.nodes[0].body)}`)
        for (const o of st.outside) console.log(`(no thread) ${o}`)
      }
      return
    }
    case 'arch': {
      need()
      const [op, a, ...rest] = args
      if (op === 'add' && a) { const id = `A${s.arch.length + 1}`; s.arch.push({ id, title: [a, ...rest].join(' '), status: 'todo', ref: '' }); save(s); return console.log(id) }
      const x = s.arch.find((y) => y.id === a)
      if (!x || !['done', 'revert'].includes(op ?? '') || !rest.length) usage('arch add <title> | done <id> <sha> | revert <id> <reason>')
      Object.assign(x!, { status: op === 'done' ? 'done' : 'reverted', ref: rest.join(' ') })
      save(s)
      return commit(`chore(loop): ${s.item} ${x!.id} ${x!.status}`)
    }
    case 'retro': need(); return retro(s)
    case 'learn': { need(); const c = flag('check'); if (!c || !args.length) usage('learn --check <case|step> "<what and why>"'); return learn(s, c!, args.join(' ')) }
    case 'prompt': return prompt(s, args[0] ?? '')
    case 'render': return render(s)
    default: usage('status|next|advance|start [item]|item [id]|plan|slice|migration|check|e2e|evals [--once]|baseline|nm|pr|pr-body|cr|arch|retro|learn|prompt|render')
  }
}

main().catch((e: Error) => {
  console.error(e instanceof Stop ? `STOP: ${e.message}` : `error: ${e.message}`)
  process.exit(e instanceof Stop ? 3 : 1)
})
