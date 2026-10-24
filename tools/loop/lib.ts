// Loop state, plan changelog and evidence records (ADR-0050). state.json is the only source of truth: STATE.md,
// CHANGELOG.md entries and evidence/<item>/README.md are rendered from it and from runs.jsonl, never edited by hand.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const ROOT = process.env.LOOP_ROOT ?? path.resolve(import.meta.dir, '../..')
export const LOOP = path.join(ROOT, 'docs/strategy/loop')

// The architecture pass runs before the gate, so no-mistakes and CodeRabbit review the final diff once.
export const STAGES = ['plan', 'build', 'verify', 'arch', 'gate', 'retro', 'done'] as const
export type Stage = (typeof STAGES)[number]
export type Slice = { id: string; title: string; files: string[]; status: 'todo' | 'done' }
export type Plan = { version: number; title: string; doneWhen: string; slices: Slice[]; evalCases: string[]; ownerSteps: string[] }
export type Item = { id: string; status: string; pr: number | null; evals: string; coderabbit: string; notes: string }
export type State = {
  item: string | null
  stage: Stage | null
  branch: string | null
  pr: number | null
  startedAt: string | null
  budgetHours: number
  nm: string | null
  nmSha: string | null // the code commit no-mistakes last passed; the gate exit wants it to be the current one
  pushedAt: string | null // when no-mistakes last pushed; a CodeRabbit limit notice older than this is stale
  published?: boolean // the done stage pushed the retro and final state; the guard stands down
  baseline: Record<string, number>
  phase0: { id: string; text: string; done: boolean }[]
  items: Item[]
  plan: Plan | null
  arch: { id: string; title: string; status: 'todo' | 'done' | 'reverted'; ref: string }[]
  // files: blob hash of each loop file the change covers, so a later edit to the same file needs its own `learn`.
  learnings: { item: string; check: string; text: string; files?: Record<string, string> }[]
}
export type StepResult = { name: string; ok: boolean; ms: number; note: string; tail?: string[] }
export type Run = {
  id: string
  item: string
  stage: string
  kind: string
  plan?: number // plan version the run was judged under
  sha: string
  ok: boolean
  ms: number
  steps: StepResult[]
  cases?: Record<string, (boolean | null)[]>
  metrics?: Record<string, number>
  flows?: { file: string; name: string; ok: boolean; fail: string | null; shot?: string; video?: string }[]
}

export class Stop extends Error {} // exit 3: a stop condition from the skill; the agent asks the owner

export const sh = (cmd: string[], cwd = ROOT, env: Record<string, string> = {}) => {
  const p = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' })
  return { ok: p.exitCode === 0, out: p.stdout.toString().trim(), err: p.stderr.toString().trim() }
}
export const branch = () => sh(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).out
const OUTSIDE_LOOP = ['--', '.', ':(exclude)docs/strategy/loop']
/** The commit runs are judged against: the last commit outside docs/strategy/loop, "+dirty" with uncommitted code. */
export const codeSha = () => {
  const sha = sh(['git', 'log', '-1', '--format=%h', ...OUTSIDE_LOOP]).out
  return sh(['git', 'status', '--porcelain', ...OUTSIDE_LOOP]).out ? `${sha}+dirty` : sha
}

const STATE = () => path.join(LOOP, 'state.json')
export const load = (): State => JSON.parse(readFileSync(STATE(), 'utf8'))
/** Write a whole file or nothing: a temp file in the same dir, then a rename, so an interrupted write never truncates. */
export function writeAtomic(f: string, body: string) {
  const tmp = `${f}.${process.pid}.tmp`
  writeFileSync(tmp, body)
  renameSync(tmp, f)
}
export function save(s: State) {
  writeAtomic(STATE(), JSON.stringify(s, null, 2) + '\n')
  writeAtomic(path.join(LOOP, 'STATE.md'), renderState(s))
}

const row = (...c: (string | number | null | undefined)[]) => `| ${c.map((v) => v ?? '').join(' | ')} |`
const rule = (n: number) => row(...Array(n).fill('---'))

export function renderState(s: State) {
  const p = s.plan
  return [
    '# Strategy loop state',
    '',
    'Rendered from [state.json](state.json) by `bun loop` ([ADR-0050](../../decisions/0050-strategy-loop.md)); do not edit',
    'by hand. Plan and loop changes: [CHANGELOG.md](CHANGELOG.md). Verification runs: `evidence/<item>/README.md`.',
    '',
    '## Now',
    '',
    s.item
      ? `${s.item} · stage **${s.stage}** · branch \`${s.branch}\` · PR ${s.pr ? `#${s.pr}` : '–'} · no-mistakes ${s.nm ? `${s.nm} on \`${s.nmSha}\`` : '–'} · started ${s.startedAt ?? '–'}, budget ${s.budgetHours} h`
      : 'No item in progress. Next: `bun loop start`.',
    '',
    '## Phase 0',
    '',
    ...s.phase0.map((x) => `- [${x.done ? 'x' : ' '}] ${x.id}: ${x.text}`),
    '',
    '## Baseline',
    '',
    row('Measure', 'Value'),
    rule(2),
    ...Object.entries(s.baseline).map(([k, v]) => row(`\`${k}\``, v)),
    '',
    '## Items',
    '',
    row('Item', 'Status', 'PR', 'Evals', 'CodeRabbit', 'Notes'),
    rule(6),
    ...s.items.map((i) => row(i.id, i.status, i.pr ? `#${i.pr}` : '', i.evals, i.coderabbit, i.notes)),
    '',
    '## Plan',
    '',
    ...(p
      ? [
          `v${p.version} · ${p.title}`,
          '',
          `Done when: \`${p.doneWhen}\``,
          '',
          ...p.slices.map((x) => `- [${x.status === 'done' ? 'x' : ' '}] ${x.id} ${x.title} (${x.files.join(', ')})`),
          '',
          `Eval flows promised: ${p.evalCases.join(', ') || 'none'}`,
          '',
          `Owner steps (the loop never runs these): ${p.ownerSteps.join('; ') || 'none'}`,
        ]
      : ['(none)']),
    '',
    '## Architecture suggestions',
    '',
    ...(s.arch.length ? s.arch.map((a) => `- ${a.id} [${a.status}] ${a.title}${a.ref ? ` (${a.ref})` : ''}`) : ['(none)']),
    '',
    '## Learnings',
    '',
    ...(s.learnings.length ? s.learnings.map((l) => `- ${l.item} (${l.check}): ${l.text}`) : ['(none)']),
    '',
  ].join('\n')
}

/** Structural plan changes, one line each. Slice status is progress, not a plan change, so it is left out. */
export function planDiff(a: Plan | null, b: Omit<Plan, 'version'>): string[] {
  if (!a) return [`new plan: ${b.slices.length} slices, done when \`${b.doneWhen}\``]
  const out: string[] = []
  if (a.title !== b.title) out.push(`title: ${a.title} → ${b.title}`)
  // ⚠ marks a moved goalpost; the PR body repeats those lines for the owner.
  if (a.doneWhen !== b.doneWhen) out.push(`⚠ done when: \`${a.doneWhen}\` → \`${b.doneWhen}\``)
  const old = new Map(a.slices.map((x) => [x.id, x]))
  const ids = new Set(b.slices.map((x) => x.id))
  for (const x of b.slices) {
    const o = old.get(x.id)
    if (!o) out.push(`added ${x.id} "${x.title}" (${x.files.join(', ')})`)
    else {
      if (o.title !== x.title) out.push(`${x.id} title: "${o.title}" → "${x.title}"`)
      if (o.files.join() !== x.files.join()) out.push(`${x.id} files: ${o.files.join(', ')} → ${x.files.join(', ')}`)
    }
  }
  for (const o of a.slices) if (!ids.has(o.id)) out.push(`removed ${o.id} "${o.title}"${o.status === 'done' ? ' (was done)' : ''}`)
  const kept = (p: { slices: Slice[] }) => p.slices.map((x) => x.id).filter((id) => old.has(id) && ids.has(id)).join(', ')
  if (kept(a) !== kept(b)) out.push(`order: ${kept(a)} → ${kept(b)}`)
  const dropped = a.evalCases.some((e) => !b.evalCases.includes(e))
  if (a.evalCases.join() !== b.evalCases.join()) out.push(`${dropped ? '⚠ ' : ''}eval flows: ${a.evalCases.join(', ') || 'none'} → ${b.evalCases.join(', ') || 'none'}`)
  if (a.ownerSteps.join() !== b.ownerSteps.join()) out.push(`owner steps: ${a.ownerSteps.join('; ') || 'none'} → ${b.ownerSteps.join('; ') || 'none'}`)
  return out
}

export const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z'

export function changelog(title: string, lines: string[]) {
  const f = path.join(LOOP, 'CHANGELOG.md')
  if (!existsSync(f))
    writeFileSync(f, '# Loop changelog\n\nAppended by `bun loop` on every plan change and every change to the loop itself. Oldest first.\n')
  appendFileSync(f, `\n## ${title}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`)
}

// ── evidence ──
export const evidenceDir = (item: string) => path.join(LOOP, 'evidence', item)
export const runDir = (item: string, id: string) => path.join(evidenceDir(item), 'runs', id)
export const newRunId = (kind: string) => `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}-${kind}`

export function runs(item: string): Run[] {
  const f = path.join(evidenceDir(item), 'runs.jsonl')
  // A line torn by an interrupted append is skipped, not fatal: the runs around it still count.
  const parse = (l: string): Run[] => {
    try {
      return [JSON.parse(l)]
    } catch {
      return []
    }
  }
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap(parse) : []
}

export function record(run: Run) {
  const dir = evidenceDir(run.item)
  mkdirSync(dir, { recursive: true })
  appendFileSync(path.join(dir, 'runs.jsonl'), JSON.stringify(run) + '\n')
  // Bounded evidence: the latest run of each kind and the latest passing one (the last known good) keep logs and
  // media, older failing runs keep their logs, older passing runs keep only their runs.jsonl line.
  const all = runs(run.item)
  for (const r of all) {
    if (r === all.findLast((x) => x.kind === r.kind) || r === all.findLast((x) => x.kind === r.kind && x.ok)) continue
    if (r.ok) rmSync(runDir(run.item, r.id), { recursive: true, force: true })
    else dropMedia(runDir(run.item, r.id))
  }
  writeFileSync(path.join(dir, 'README.md'), renderEvidence(run.item, all))
}

function dropMedia(dir: string) {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true }).filter((x) => x.isDirectory()))
    if (e.name === 'shots' || e.name === 'videos') rmSync(path.join(dir, e.name), { recursive: true, force: true })
    else dropMedia(path.join(dir, e.name))
}

const secs = (ms: number) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)}m${Math.round((ms % 60_000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`)
const mark = (v: boolean | null) => (v === null ? 'n/a' : v ? 'pass' : 'FAIL')

export function renderEvidence(item: string, all: Run[]) {
  const lines = [
    `# ${item} verification evidence`,
    '',
    'Rendered by `bun loop` from [runs.jsonl](runs.jsonl), oldest first. In git: this page, runs.jsonl, results.json and',
    'screenshots. Local only (gitignored): full logs and videos. The latest run of each kind keeps its files; older',
    'failing runs keep their logs; failing steps keep their last lines below.',
    '',
    row('Run', 'Stage', 'Kind', 'Code', 'Result', 'Time', 'Steps'),
    rule(7),
    ...all.map((r) =>
      row(
        existsSync(runDir(item, r.id)) ? `[${r.id}](runs/${r.id}/)` : r.id,
        r.stage,
        r.kind,
        `\`${r.sha}\``,
        r.ok ? 'pass' : '**FAIL**',
        secs(r.ms),
        r.cases ? `${r.steps.filter((s) => s.ok).length}/${r.steps.length} ok` : r.steps.map((s) => `${s.name} ${s.ok ? '✓' : '✗'}`).join(' · '),
      ),
    ),
  ]
  const ev = all.findLast((r) => r.cases)
  if (ev?.cases)
    lines.push(
      '',
      `## Golden evals: ${ev.id} on \`${ev.sha}\``,
      '',
      row('Case', ...ev.cases.G1!.map((_, i) => `Run ${i + 1}`), 'pass^k'),
      rule(ev.cases.G1!.length + 2),
      ...Object.entries(ev.cases).map(([id, v]) => row(id, ...v.map(mark), v.every((x) => x === null) ? 'n/a' : v.every((x) => x !== false) ? '✓' : '✗')),
    )
  const tails = all.flatMap((r) => r.steps.filter((s) => s.tail?.length).map((s) => ({ r, s })))
  if (tails.length)
    lines.push('', '## Failing steps (last lines of each log)', ...tails.flatMap(({ r, s }) => ['', `${r.id} · ${s.name} · ${s.note}`, '', '```', ...s.tail!, '```']))
  const fl = all.findLast((r) => r.flows?.length)
  if (fl?.flows) {
    const failed = fl.flows.filter((f) => !f.ok)
    const media = fl.flows.filter((f) => f.shot || f.video)
    const at = (f: { file: string }, p: string) => `runs/${fl.id}/${f.file}/${p}`
    const rounds = Map.groupBy(fl.flows, (f) => (f.file.match(/^run-\d+/)?.[0] ?? 'run'))
    lines.push(
      '',
      `## Latest e2e: ${fl.id} on \`${fl.sha}\` (${[...rounds].map(([k, v]) => `${k} ${v.filter((f) => f.ok).length}/${v.length}`).join(', ')} flows pass)`,
      '',
      failed.length ? failed.map((f) => `- FAIL ${f.file.split('/')[0]} ${f.name}: ${f.fail}`).join('\n') : 'No failures.',
    )
    if (media.length)
      lines.push(
        '',
        row('Flow', 'Result', 'Screenshot', 'Video'),
        rule(4),
        ...media.map((f) =>
          // Videos are gitignored, so they are named, not linked: a link would 404 on GitHub.
          row(f.name.replaceAll('|', '\\|'), f.ok ? 'pass' : 'FAIL', f.shot && `<img src="${at(f, f.shot)}" width="320">`, f.video && `local: \`${at(f, f.video)}\``),
        ),
      )
  }
  return lines.join('\n') + '\n'
}
