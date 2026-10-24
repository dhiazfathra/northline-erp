// PreToolUse hook (ADR-0050). While a loop item is in progress (a worktree on the item's branch, until the done stage
// has published it), it keeps production, secrets and the loop's own controls out of the agent's reach:
// - Neon and Cloudflare MCP tools; the neon, neonctl and wrangler CLIs however they are wrapped;
// - NEON_* variables, neon.tech hosts, .env files (Bash, Read, Grep), deploy:prod and switch:prod;
// - writes to the loop state, the project settings and this guard by any tool (only `bun loop` writes state);
// - the owner's levers `bun loop budget|phase0|init`, which the owner runs in a terminal.
// A tripwire, not a sandbox: loop sessions should also run without production credentials. Exit 2 blocks the call
// and shows the reason to the agent; any error also blocks (fails closed).
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const SECRET = /deploy[:-]prod|switch[:-]prod|NEON_[A-Z_]+|neon\.tech|(^|[\s'"=/<])\.env(?!\.example)(\.[a-z]+)?\b/
const CLI = new Set(['neon', 'neonctl', 'wrangler'])
const WRAPPERS = new Set(['env', 'exec', 'time', 'nohup', 'sudo', 'bunx', 'npx', 'command', 'do', 'then', 'else', 'if', 'while', 'until', '!'])
// The ledger exit checks trust (runs.jsonl) and the rendered files count as state too.
const LOCKED = /docs\/strategy\/loop\/(state\.json|STATE\.md|CHANGELOG\.md)|runs\.jsonl|\.claude\/settings(\.local)?\.json|tools\/loop\/guard\.ts/
const LOCKED_DIR = /(^|\/)docs\/strategy\/loop\/|(^|\/)\.claude\/settings(\.local)?\.json$|(^|\/)tools\/loop\/guard\.ts$/
const OWNER = /\bbun\s+(run\s+)?loop\s+(budget|phase0|init)\b/
const ENV_FILE = /(^|\/)\.env(\.[a-z]+)?$/

/** The program each shell segment runs, through wrappers (`env A=1`, `bunx`, `pnpm dlx`, `bun x`, `bash -c "…"`). */
export function programs(command: string): string[] {
  const out: string[] = []
  // Code inside `bash -c "…"`, `$( … )` and backticks runs even within quotes; other quoted text is data
  // (a commit message saying "fix(neon): …" runs nothing).
  for (const m of command.matchAll(/\b(?:bash|sh|zsh)\s+-c\s+(["'])([\s\S]*?)\1/g)) out.push(...programs(m[2]!))
  for (const m of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) out.push(...programs(m[1] ?? m[2] ?? ''))
  const bare = command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')
  for (const segment of bare.split(/\n|;|&&|\|\||\||&|\(|\)|\{|\}/)) {
    const words = segment.trim().split(/\s+/).filter(Boolean)
    let i = 0
    while (i < words.length) {
      const w = words[i]!
      const base = path.basename(w)
      if (/^[A-Z_][A-Z0-9_]*=/.test(w) || WRAPPERS.has(base) || w.startsWith('-')) i++
      else if ((base === 'pnpm' && ['dlx', 'exec'].includes(words[i + 1] ?? '')) || (base === 'bun' && words[i + 1] === 'x')) i += 2
      else {
        out.push(base)
        break
      }
    }
  }
  return out
}

type Input = { command?: string; file_path?: string; notebook_path?: string; path?: string; glob?: string }

export function blocked(tool: string, input: Input & Record<string, unknown> = {}) {
  if (tool.startsWith('mcp__')) return /neon|cloudflare/i.test(tool) || LOCKED.test(JSON.stringify(input)) ? tool : null
  const file = input.file_path ?? input.notebook_path ?? ''
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) return LOCKED_DIR.test(file) ? `${tool} ${file} (written only by bun loop)` : null
  if (tool === 'Read') return ENV_FILE.test(file) && !file.endsWith('.example') ? `Read ${file}` : null
  if (tool === 'Grep') return [input.path, input.glob].some((p) => p && /\.env(\.[a-z]+)?\b/.test(p) && !p.includes('.env.example')) ? 'Grep over .env files' : null
  if (tool !== 'Bash') return null
  const cmd = input.command ?? ''
  // Only the CLI may touch the locked files; reading state goes through `bun loop status`.
  const viaCli = /^\s*bun\s+(run\s+)?loop\b/.test(cmd) && !/[;&|]/.test(cmd)
  if (OWNER.test(cmd)) return `${cmd} (an owner lever: the owner runs it in a terminal)`
  if (LOCKED.test(cmd) && !viaCli) return `${cmd} (names a file only bun loop writes)`
  return SECRET.test(cmd) || programs(cmd).some((p) => CLI.has(p)) ? cmd : null
}

/** The worktree on an item's branch whose item is not yet done and published, if any. */
export function activeWorktree(dir: string) {
  const list = Bun.spawnSync(['git', 'worktree', 'list', '--porcelain'], { cwd: dir, stdout: 'pipe', stderr: 'ignore' }).stdout.toString()
  for (const block of list.split('\n\n')) {
    const tree = block.match(/^worktree (.+)$/m)?.[1]
    const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1]
    const f = tree && path.join(tree, 'docs/strategy/loop/state.json')
    if (!f || !existsSync(f)) continue
    const s = JSON.parse(readFileSync(f, 'utf8'))
    if (s.item && s.branch === branch && !(s.stage === 'done' && s.published)) return { item: s.item as string, stage: s.stage as string, path: tree }
  }
}

if (import.meta.main) {
  try {
    const input = JSON.parse(await Bun.stdin.text())
    const what = blocked(input.tool_name ?? '', input.tool_input ?? {})
    const active = what && activeWorktree(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd())
    if (active) {
      console.error(`loop guard (ADR-0050): ${active.item} is in progress; production, secrets and loop controls are owner-only. Blocked: ${what.slice(0, 160)}`)
      process.exit(2)
    }
  } catch (e) {
    console.error(`loop guard (ADR-0050) failed closed: ${(e as Error).message}`)
    process.exit(2)
  }
}
