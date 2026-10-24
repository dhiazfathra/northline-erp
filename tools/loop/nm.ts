// Drives `no-mistakes axi` for the gate (ADR-0050) without --yes: the pipeline fixes mechanical findings, anything that
// is the owner's call stops the loop. Reads only the TOON fields it needs: gate, findings table, outcome, next_action.
import { sh } from './lib'

export type Finding = Record<'id' | 'severity' | 'file' | 'action' | 'description', string>
export type Decision =
  | { kind: 'respond'; args: string[] }
  | { kind: 'stop'; why: string }
  | { kind: 'done'; outcome: string; sync: boolean }
  | { kind: 'failed'; outcome: string; sync: boolean }
  | { kind: 'reattach' }

/** Splits one TOON table row; quoted cells may hold commas and "" escapes. */
export function cells(line: string) {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cur += '"'
      i++
    } else if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  return [...out, cur]
}

export function findings(out: string): Finding[] {
  const m = out.match(/^findings\[(\d+)\]\{([^}]*)\}:\n((?: {2}.*(?:\n|$))*)/m)
  if (!m) return []
  const cols = m[2]!.split(',')
  return m[3]!
    .split('\n')
    .filter((l) => l.startsWith('  '))
    .slice(0, Number(m[1]))
    .map((l) => { const c = cells(l.slice(2)); return Object.fromEntries(cols.map((k, i) => [k, c[i] ?? ''])) as Finding })
}

const field = (out: string, key: string) => out.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1]?.trim()
const PASS = ['checks-passed', 'passed']
// An approved test or CI exception, or skipped publication or CI: the owner sees those, the loop never accepts them.
const OWNER_OUTCOMES = ['passed-with-override', 'passed-with-skips']

/** branch_sync.next_action, keys in any order: the indented lines under `next_action:`. */
export function nextAction(out: string) {
  const block = out.match(/^([ \t]*)next_action:\n((?:\1[ \t]+.*(?:\n|$))*)/m)?.[2] ?? ''
  const code = block.match(/^[ \t]+code: (\S+)/m)?.[1]
  return code ? { code, command: block.match(/^[ \t]+command: (.+)$/m)?.[1]?.trim() } : null
}

/** The whole decision table. Pure, so it is tested on recorded output without a pipeline. */
export function decide(out: string): Decision {
  const outcome = field(out, 'outcome')
  const action = nextAction(out)
  if (outcome) {
    if (OWNER_OUTCOMES.includes(outcome)) return { kind: 'stop', why: `no-mistakes ended ${outcome}: the owner decides whether that is acceptable` }
    // recover_custody and adopt_published can drop or replace commits: the owner runs those, whatever the outcome.
    if (action && !['none', 'sync'].includes(action.code))
      return { kind: 'stop', why: `no-mistakes ${outcome}, but the branch needs ${action.code}${action.command ? ` (${action.command})` : ''}` }
    const sync = action?.code === 'sync'
    return PASS.includes(outcome) ? { kind: 'done', outcome, sync } : { kind: 'failed', outcome, sync }
  }
  if (action?.code === 'continue_active_run') return { kind: 'reattach' }
  const gate = field(out, 'gate')
  if (!gate) return { kind: 'reattach' }
  const f = findings(out)
  // A gate the parser cannot read, or a finding with an action it does not know, is never approved blindly.
  const declared = Number(out.match(/^findings\[(\d+)\]/m)?.[1] ?? -1)
  if (declared !== f.length || f.some((x) => !['auto-fix', 'no-op', 'ask-user'].includes(x.action)))
    return { kind: 'stop', why: `no-mistakes ${gate}: gate output not understood (${declared < 0 ? 'no findings table' : `${f.length} of ${declared} findings read`}); the owner decides` }
  const owner = f.filter((x) => x.action === 'ask-user')
  if (owner.length || /protected-path-refusal|test-agent-unvalidated-work/.test(out))
    return { kind: 'stop', why: `no-mistakes ${gate} needs the owner: ${owner.map((x) => `${x.id} ${x.file}: ${x.description}`).join('; ') || 'protected path or unvalidated work'}` }
  const fix = f.filter((x) => x.action === 'auto-fix').map((x) => x.id)
  return { kind: 'respond', args: fix.length ? ['--action', 'fix', '--findings', fix.join(',')] : ['--action', 'approve'] }
}

const axi = (args: string[]) => {
  const r = sh(['no-mistakes', 'axi', ...args])
  return Object.assign(`${r.out}\n${r.err}`, { ok: r.ok })
}

/** Runs or reattaches the pipeline for HEAD until an outcome or a stop. Each call blocks up to no-mistakes' 8-minute hold. */
export function drive(intent: string, log: (line: string) => void): Decision {
  let out = axi(['run', '--intent', intent])
  for (let turn = 0; turn < 60; turn++) {
    const d = decide(out)
    if (d.kind === 'respond') {
      log(`gate ${field(out, 'gate')}: respond ${d.args.join(' ')}`)
      out = axi(['respond', ...d.args])
    } else if (d.kind === 'reattach') {
      log('hold elapsed: reattach')
      out = axi(['run', '--intent', intent])
    } else {
      // The branch must be synced before any local commit, on success and failure alike.
      if ((d.kind === 'done' || d.kind === 'failed') && d.sync) {
        const s = axi(['sync'])
        if (!s.ok) return { kind: 'stop', why: `no-mistakes axi sync failed: ${s.trim().split('\n').at(-1)}` }
      }
      return d
    }
  }
  return { kind: 'stop', why: 'no-mistakes did not finish in 60 turns' }
}
