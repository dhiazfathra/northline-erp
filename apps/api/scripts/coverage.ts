// Counts docs/reports/_coverage.md rows by Spec status so the parity done line is mechanical, not hand-edited.
import { readFileSync } from 'node:fs'

export function coverageCounts(md = readFileSync(new URL('../../../docs/reports/_coverage.md', import.meta.url), 'utf8')) {
  const rows = md.split('\n').filter((l) => l.startsWith('| [')).map((l) => l.split(' | ')[9])
  const n = (f: (s: string) => boolean) => rows.filter(f).length
  return {
    total: rows.length,
    done: n((s) => s === 'done'),
    outOfScope: n((s) => s.startsWith('done (out of scope')),
    blocked: n((s) => s.includes('blocked')),
  }
}

if (import.meta.main) console.log(coverageCounts())
