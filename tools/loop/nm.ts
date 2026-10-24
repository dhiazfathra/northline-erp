// Drives `no-mistakes axi` for the gate (ADR-0050) without --yes: the pipeline fixes mechanical findings, anything that
// is the owner's call stops the loop. Reads only the TOON fields it needs: gate, findings table, outcome, next_action.
import { sh } from './lib'

export type Finding = Record<'id' | 'severity' | 'file' | 'action' | 'description', string>
export type Decision =
  | { kind: 'respond'; args: string[] }
  | { kind: 'stop'; why: string }
  | { kind: 'done'; outcome: string; sync: boolean }
  | { kind: 'failed'; outcome: string }
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
const PASS = ['checks-passed', 'passed', 'passed-with-skips', 'passed-with-override']

/** The whole decision table. Pure, so it is tested on recorded output without a pipeline. */
export function decide(out: string): Decision {
  const outcome = field(out, 'outcome')
  if (outcome) return PASS.includes(outcome) ? { kind: 'done', outcome, sync: /next_action:\s*\n\s+code: sync\b/.test(out) } : { kind: 'failed', outcome }
  const gate = field(out, 'gate')
  if (!gate) return { kind: 'reattach' }
  const f = findings(out)
  const owner = f.filter((x) => x.action === 'ask-user')
  if (owner.length || /protected-path-refusal|test-agent-unvalidated-work/.test(out))
    return { kind: 'stop', why: `no-mistakes ${gate} needs the owner: ${owner.map((x) => `${x.id} ${x.file}: ${x.description}`).join('; ') || 'protected path or unvalidated work'}` }
  const fix = f.filter((x) => x.action === 'auto-fix').map((x) => x.id)
  return { kind: 'respond', args: fix.length ? ['--action', 'fix', '--findings', fix.join(',')] : ['--action', 'approve'] }
}

const axi = (args: string[]) => {
  const r = sh(['no-mistakes', 'axi', ...args])
  return `${r.out}\n${r.err}`
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
      if (d.kind === 'done' && d.sync) axi(['sync'])
      return d
    }
  }
  return { kind: 'stop', why: 'no-mistakes did not finish in 60 turns' }
}
