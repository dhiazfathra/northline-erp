import { afterAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { judge, redact, sameDeclarations } from './checks'
import { bodyFindings, bodyOk, detail, headline, withSection } from './gh'
import { blocked } from './guard'
import { type Plan, planDiff, renderState, type State } from './lib'
import { cells, decide, findings, nextAction } from './nm'

const plan = (over: Partial<Plan> = {}): Plan => ({
  version: 1,
  title: 'feat(ops): N2 backups',
  doneWhen: 'bun run drill',
  slices: [
    { id: 'S1', title: 'dump workflow', files: ['.github/workflows/backup.yml'], status: 'done' },
    { id: 'S2', title: 'restore drill', files: ['tools/drill.ts'], status: 'todo' },
  ],
  evalCases: ['[G3] backup settings round trip'],
  ownerSteps: [],
  ...over,
})

describe('planDiff', () => {
  test('a first plan is one line', () => {
    expect(planDiff(null, plan())).toEqual(['new plan: 2 slices, done when `bun run drill`'])
  })
  test('structural changes are listed; moved goalposts are marked', () => {
    const next = plan({
      doneWhen: 'bun run drill --quick',
      slices: [plan().slices[1]!, { id: 'S3', title: 'alerts', files: ['tools/alert.ts'], status: 'todo' }],
      evalCases: [],
      ownerSteps: ['add R2 secrets'],
    })
    expect(planDiff(plan(), next)).toEqual([
      '⚠ done when: `bun run drill` → `bun run drill --quick`',
      'added S3 "alerts" (tools/alert.ts)',
      'removed S1 "dump workflow" (was done)',
      '⚠ eval flows: [G3] backup settings round trip → none',
      'owner steps: none → add R2 secrets',
    ])
  })
  test('slice progress is not a plan change', () => {
    expect(planDiff(plan(), plan({ slices: plan().slices.map((s) => ({ ...s, status: 'done' as const })) }))).toEqual([])
  })
})

describe('PR body section', () => {
  const sec = '<!-- loop:begin -->\n## N2\n<!-- loop:end -->'
  test('goes above the no-mistakes text and replaces an old section', () => {
    const body = withSection('<!-- loop:begin -->\nold\n<!-- loop:end -->\n\n---\n\n## Intent\nno-mistakes text', sec)
    expect(body).toBe(`${sec}\n\n---\n\n## Intent\nno-mistakes text\n`)
    expect(withSection(body, sec)).toBe(body)
    expect(bodyOk(body, sec)).toBe(true)
  })
  test('an overwritten or stale body fails verification', () => {
    expect(bodyOk('## Intent\nonly no-mistakes', sec)).toBe(false)
    expect(bodyOk(withSection('', '<!-- loop:begin -->\n## N2 old\n<!-- loop:end -->'), sec)).toBe(false)
  })
})

// A real thread comment and review body from PR #3 (images stripped), so the parsers track CodeRabbit's actual format.
describe('CodeRabbit comments', () => {
  const f = JSON.parse(readFileSync(path.join(import.meta.dir, 'coderabbit.fixture.json'), 'utf8'))
  test('a thread reads as severity and title', () => {
    expect(headline(f.thread)).toBe('🎯 Functional Correctness | Minor | ⚡ Quick win · Upgrade the existing sandbox login when reseeding.')
    expect(headline('_⚠️ Potential issue_ | _🟠 Major_\n\n**Missing await.**\n\nThe call…')).toBe('⚠️ Potential issue | 🟠 Major · Missing await.')
  })
  test('show prints the explanation and the suggested fix, not the analysis transcript', () => {
    const d = detail(f.thread)
    expect(d).toStartWith('**Upgrade the existing sandbox login when reseeding.**')
    expect(d).toContain('Suggested fix:')
    expect(d).not.toContain('Script executed')
  })
  test('findings outside the diff are listed with their full path', () => {
    expect(bodyFindings(f.review)).toEqual([
      'outside apps/web/src/features/accounts/form.tsx:76 [Minor] Do not report a failed journal-line request as an empty account.',
      'outside docs/guide/northline-user-guide.html:245-246 [Minor] Split returns from job costing in the Live status table.',
    ])
  })
})

describe('no-mistakes decisions', () => {
  const gate = (rows: string[]) => `gate: review\nfindings[${rows.length}]{id,severity,file,line,action,description}:\n${rows.map((r) => `  ${r}`).join('\n')}\nhelp[1]:\n  Run x`
  test('quoted cells keep their commas', () => {
    expect(cells('r1,warning,"a, b.ts",,auto-fix,"say ""hi"", then go"')).toEqual(['r1', 'warning', 'a, b.ts', '', 'auto-fix', 'say "hi", then go'])
    expect(findings(gate(['r1,warning,x.ts,,auto-fix,"one, two"']))[0]).toMatchObject({ id: 'r1', action: 'auto-fix', description: 'one, two' })
  })
  test('auto-fix findings go back to the pipeline, no-op ones are approved', () => {
    expect(decide(gate(['r1,warning,x.ts,,auto-fix,a', 'r2,info,y.ts,,no-op,b', 'r3,warning,z.ts,,auto-fix,c']))).toEqual({ kind: 'respond', args: ['--action', 'fix', '--findings', 'r1,r3'] })
    expect(decide(gate(['r2,info,y.ts,,no-op,b']))).toEqual({ kind: 'respond', args: ['--action', 'approve'] })
  })
  test("the owner's calls stop the loop", () => {
    expect(decide(gate(['r1,warning,x.ts,,auto-fix,a', 'r2,error,tax.ts,,ask-user,changes PPN rounding'])).kind).toBe('stop')
    expect(decide('gate: push\nnote: protected-path-refusal on .github/workflows/check.yml').kind).toBe('stop')
  })
  test('outcomes end the drive; a held wait reattaches', () => {
    expect(decide('outcome: checks-passed\nbranch_sync:\n  next_action:\n    code: sync')).toEqual({ kind: 'done', outcome: 'checks-passed', sync: true })
    expect(decide('outcome: passed')).toEqual({ kind: 'done', outcome: 'passed', sync: false })
    expect(decide('outcome: failed')).toEqual({ kind: 'failed', outcome: 'failed', sync: false })
    expect(decide('outcome: failed\nbranch_sync:\n  next_action:\n    code: sync')).toEqual({ kind: 'failed', outcome: 'failed', sync: true })
    expect(decide('run: 01ABC\nstatus: running')).toEqual({ kind: 'reattach' })
  })
  test('an override or a skip is never the loop’s to accept', () => {
    expect(decide('outcome: passed-with-override').kind).toBe('stop')
    expect(decide('outcome: passed-with-skips').kind).toBe('stop')
  })
  test('branch custody: sync is run, a live run is reattached, recovery goes to the owner', () => {
    const sync = 'branch_sync:\n  state: behind\n  next_action:\n    command: no-mistakes axi sync\n    code: sync\noutcome: checks-passed'
    expect(nextAction(sync)).toEqual({ code: 'sync', command: 'no-mistakes axi sync' })
    expect(decide(sync)).toMatchObject({ kind: 'done', sync: true })
    expect(decide('branch_sync:\n  next_action:\n    code: continue_active_run')).toEqual({ kind: 'reattach' })
    expect(decide('outcome: passed\nbranch_sync:\n  next_action:\n    code: recover_custody\n    command: no-mistakes axi sync --recover').kind).toBe('stop')
  })
})

describe('production guard', () => {
  const bash = (command: string) => blocked('Bash', { command })
  test.each([
    'bun run deploy:prod',
    'cd x && neon connection-string main',
    'echo $NEON_DATABASE_URL',
    'psql postgres://u@ep-x.neon.tech/db',
    'npx wrangler deploy',
    'echo ok\nwrangler deploy',
    'pnpm dlx wrangler deploy',
    'bun x neonctl branches list',
    'env A=1 wrangler deploy',
    './node_modules/.bin/wrangler deploy',
    'bash -c "wrangler deploy"',
    'cat ../northline-erp/.env',
    'sleep 1 & wrangler deploy',
    '(wrangler deploy)',
    'if true; then wrangler deploy; fi',
    "sed -i '' 's/build/done/' docs/strategy/loop/state.json",
    'echo {} > tools/loop/guard.ts',
    'bun loop budget 40 --reason more',
    'bun run loop phase0 P7 done --reason x',
  ])('blocks %p', (command) => expect(bash(command)).toBeTruthy())
  test.each(['git commit -m "docs: neon backup notes"', 'grep -n neon docs/strategy/README.md', 'bun test', 'cat .env.example', 'bun loop status', 'bun loop render'])('allows %p', (command) =>
    expect(bash(command)).toBeNull(),
  )
  test('MCP, edits and reads', () => {
    expect(blocked('mcp__plugin_neon_neon__run_sql')).toBeTruthy()
    expect(blocked('mcp__plugin_cloudflare_cloudflare__execute')).toBeTruthy()
    expect(blocked('mcp__serena__find_symbol')).toBeNull()
    expect(blocked('mcp__serena__replace_content', { relative_path: 'docs/strategy/loop/state.json' })).toBeTruthy()
    expect(blocked('Grep', { pattern: 'URL', path: '/r/.env' })).toBeTruthy()
    expect(blocked('Edit', { file_path: '/r/docs/strategy/loop/state.json' })).toBeTruthy()
    expect(blocked('Write', { file_path: '/r/tools/loop/guard.ts' })).toBeTruthy()
    expect(blocked('Edit', { file_path: '/r/tools/loop/checks.ts' })).toBeNull()
    expect(blocked('Read', { file_path: '/r/.env' })).toBeTruthy()
    expect(blocked('Read', { file_path: '/r/apps/api/src/db.ts' })).toBeNull()
  })
})

describe('checks', () => {
  test('committed tails carry no credentials or tokens', () => {
    expect(redact('connect postgres://app:s3cret@db.example.com/x failed')).toBe('connect postgres://***@db.example.com/x failed')
    expect(redact('Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456')).toBe('Authorization: Bearer ***')
    expect(redact('webhook https://hooks.example.com/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toContain('/***')
    expect(redact('commit 0123456789abcdef0123456789abcdef01234567')).toContain('0123456789abcdef0123456789abcdef01234567')
  })
  test('declaration files differing only in union order are the same', () => {
    expect(sameDeclarations('type A = 401 | 429;', 'type A = 429 | 401;')).toBe(true)
    expect(sameDeclarations('type A = 401 | 429;', 'type A = 401 | 500;')).toBe(false)
    // The shape tsc actually reordered in apps/api/types/auth.d.ts: whole object members of a union.
    const one = '} | {\n    status: 429;\n} | {\n    status: 401;\n}'
    expect(sameDeclarations(one, '} | {\n    status: 401;\n} | {\n    status: 429;\n}')).toBe(true)
    expect(sameDeclarations(one, '} | {\n    status: 401;\n} | {\n    status: 403;\n}')).toBe(false)
  })
  test('G12: every promised flow ran and passed', () => {
    const s = { plan: { evalCases: ['[N2] restore drill'] }, baseline: { g3Flows: 0, g6Flows: 0 } } as unknown as State
    const round = (flows: { name: string; ok: boolean }[]) => judge({ steps: {}, flows: flows.map((f) => ({ ...f, file: 'x', fail: null })), prBody: null }, s).G12
    expect(round([{ name: '[N2] restore drill', ok: true }])).toBe(true)
    expect(round([{ name: '[N2] restore drill', ok: false }])).toBe(false)
    expect(round([])).toBe(false)
  })
})

describe('renderState', () => {
  test('is a pure function of the state', () => {
    const s: State = {
      item: 'N2', stage: 'build', branch: 'feat/n2-backups', pr: null, startedAt: '2026-10-25T00:00:00Z', budgetHours: 12, nm: null, nmSha: null, pushedAt: null,
      baseline: { mockCalls: 9 }, phase0: [], items: [], plan: plan(), arch: [], learnings: [],
    }
    expect(renderState(s)).toBe(renderState(structuredClone(s)))
    expect(renderState(s)).toContain('- [x] S1 dump workflow (.github/workflows/backup.yml)')
  })
})

// ── the CLI against a throwaway repo ──
const CLI = path.join(import.meta.dir, 'loop.ts')
const made: string[] = []
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })))
/** A throwaway repo in its own parent dir (start puts the item worktree next to it). `main`: no item yet, with an origin. */
function repo(main = false) {
  const parent = mkdtempSync(path.join(tmpdir(), 'loop-test-'))
  made.push(parent)
  const root = path.join(parent, 'repo')
  const w = (f: string, body: string) => { mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); writeFileSync(path.join(root, f), body) }
  const state: State = {
    item: main ? null : 'N2', stage: main ? null : 'plan', branch: main ? null : 'feat/n2-backups', pr: null, startedAt: new Date().toISOString(), budgetHours: 12,
    nm: null, nmSha: null, pushedAt: null, baseline: { mockCalls: 0 }, phase0: [], items: [], plan: null, arch: [], learnings: [],
  }
  w('docs/strategy/loop/state.json', JSON.stringify(state))
  w('docs/strategy/README.md', '## H0 · Now\n\n| # | Item | I | E | A | Score | Steps | Done when |\n|---|---|---|---|---|---|---|---|\n| N2 | Backups | 4 | 1 | 1 | **6** | Dump nightly | A drill log |\n')
  w('apps/api/migrations/0001_ledger.sql', '')
  w('apps/api/migrations/0002_auth.sql', '')
  w('apps/api/src/db.ts', "import m0001 from '../migrations/0001_ledger.sql' with { type: 'text' }\nimport m0002 from '../migrations/0002_auth.sql' with { type: 'text' }\n\nconst MIGRATIONS: Record<string, string> = { '0001_ledger.sql': m0001, '0002_auth.sql': m0002 }\n")
  w('.claude/skills/strategy-loop/evals/golden.md', '')
  w('docs/retro/.keep', '')
  // No global git config: the developer's global hooks must not run (or slow down) inside the throwaway repo.
  const env = { ...process.env, LOOP_ROOT: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }
  const git = (...c: string[]) => Bun.spawnSync(['git', ...c], { cwd: root, env, stdout: 'pipe', stderr: 'pipe' })
  for (const c of [['init', '-q', '-b', main ? 'main' : 'feat/n2-backups'], ['add', '-A'], ['commit', '-q', '-m', 'init']]) git(...c)
  if (main) {
    Bun.spawnSync(['git', 'init', '-q', '--bare', path.join(parent, 'origin.git')], { env })
    for (const c of [['remote', 'add', 'origin', path.join(parent, 'origin.git')], ['push', '-q', 'origin', 'main']]) git(...c)
  }
  const run = (...args: string[]) => {
    const p = Bun.spawnSync(['bun', CLI, ...args], { cwd: root, env, stdout: 'pipe', stderr: 'pipe' })
    return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() }
  }
  return { parent, root, run, git, read: (f: string) => readFileSync(path.join(root, f), 'utf8') }
}

// Each case spawns the CLI a few times; a cold bun cache can take seconds.
describe('bun loop', () => {
  setDefaultTimeout(30_000)
  test('advance refuses a stage whose exit checks fail', () => {
    const r = repo()
    const a = r.run('advance')
    expect(a.code).toBe(1)
    expect(a.out).toContain('not yet: plan set with a done-when command')
  })

  test('plan changes are versioned and logged; an unchanged plan is not', () => {
    const r = repo()
    const p = { title: 'feat(ops): N2 backups', doneWhen: 'bun run drill', slices: [{ id: 'S1', title: 'dump', files: ['a.ts'] }], evalCases: [] }
    writeFileSync(path.join(r.root, 'p.json'), JSON.stringify(p))
    expect(r.run('plan', 'p.json', '--reason', 'initial plan').out).toContain('plan v1')
    expect(r.run('plan', 'p.json', '--reason', 'again').out).toContain('plan unchanged')
    writeFileSync(path.join(r.root, 'p.json'), JSON.stringify({ ...p, doneWhen: 'bun run drill --quick' }))
    expect(r.run('plan', 'p.json', '--reason', 'drill too slow').out).toContain('plan v2')
    const log = r.read('docs/strategy/loop/CHANGELOG.md')
    expect(log).toContain('N2 plan v2')
    expect(log).toContain('- Reason: drill too slow')
    expect(log).toContain('- ⚠ done when: `bun run drill` → `bun run drill --quick`')
    expect(r.read('docs/strategy/loop/STATE.md')).toContain('v2 · feat(ops): N2 backups')
    expect(r.run('advance').out).toContain('N2: plan → build')
  })

  test('a migration gets the next number and is registered', () => {
    const r = repo()
    expect(r.run('migration', 'backup_runs').out.trim()).toBe('apps/api/migrations/0003_backup_runs.sql')
    const db = r.read('apps/api/src/db.ts')
    expect(db).toContain("import m0003 from '../migrations/0003_backup_runs.sql' with { type: 'text' }")
    expect(db).toContain("'0002_auth.sql': m0002, '0003_backup_runs.sql': m0003 }")
    expect(r.run('migration', 'Bad Name').code).toBe(1)
  })

  test('the guard hook blocks production commands only while an item is in progress', () => {
    const r = repo()
    const hook = (stage: string, published = false) => {
      const f = path.join(r.root, 'docs/strategy/loop/state.json')
      writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, 'utf8')), stage, published }))
      const p = Bun.spawnSync(['bun', path.join(import.meta.dir, 'guard.ts')], {
        cwd: r.root,
        env: { ...process.env, CLAUDE_PROJECT_DIR: r.root },
        stdin: new TextEncoder().encode(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'bun run deploy:prod' } })),
        stderr: 'pipe',
      })
      return { code: p.exitCode, err: p.stderr.toString() }
    }
    expect(hook('build')).toMatchObject({ code: 2, err: expect.stringContaining('N2 is in progress') })
    expect(hook('done').code).toBe(2) // the done stage still pushes through the gate
    expect(hook('done', true).code).toBe(0)
    // Main after the merge holds N2's state but is not on N2's branch: nothing is in progress there.
    r.git('checkout', '-q', '-b', 'main')
    expect(hook('retro').code).toBe(0)
  })

  test('start picks the next row and makes a worktree with no upstream', () => {
    const r = repo(true)
    const out = r.run('start').out
    expect(out).toContain('N2 started in')
    const wt = path.join(r.parent, 'northline-n2')
    const s = JSON.parse(readFileSync(path.join(wt, 'docs/strategy/loop/state.json'), 'utf8'))
    expect(s).toMatchObject({ item: 'N2', stage: 'plan', branch: 'feat/n2-backups' })
    expect(Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', '@{u}'], { cwd: wt, stderr: 'pipe' }).exitCode).not.toBe(0)
    expect(r.run('start').out).toContain('STOP: N2 is at stage plan in')
  })

  test('a loop change needs an existing check', () => {
    const r = repo()
    expect(r.run('learn', '--check', 'G99', 'something').out).toContain('--check must name a case or step that exists')
    expect(r.run('learn', '--check', 'G1', 'claim migrations through the CLI').code).toBe(0)
    expect(r.read('docs/strategy/loop/CHANGELOG.md')).toContain('- Check: G1')
  })
})
