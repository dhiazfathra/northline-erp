// PreToolUse hook (ADR-0050). While a loop item is in progress (a worktree on the item's branch, stage not done), it
// keeps production and the loop's own controls out of the agent's reach: Neon and Cloudflare MCP tools; the neon,
// neonctl and wrangler CLIs however they are wrapped; NEON_* variables, neon.tech hosts, .env files, deploy:prod and
// switch:prod; edits to the loop state and to this guard. A tripwire, not a sandbox: loop sessions should also run
// without production credentials. Exit 2 blocks the call and shows the reason to the agent; any error also blocks.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const SECRET = /deploy[:-]prod|switch[:-]prod|NEON_[A-Z_]+|neon\.tech|(^|[\s'"=/<])\.env(?!\.example)(\.[a-z]+)?\b/
const CLI = new Set(['neon', 'neonctl', 'wrangler'])
const WRAPPERS = new Set(['env', 'exec', 'time', 'nohup', 'sudo', 'bunx', 'npx', 'command'])
const LOCKED = /(^|\/)docs\/strategy\/loop\/|(^|\/)\.claude\/settings(\.local)?\.json$|(^|\/)tools\/loop\/guard\.ts$/

/** The program each shell segment runs, through wrappers (`env A=1`, `bunx`, `pnpm dlx`, `bun x`, `bash -c "…"`). */
export function programs(command: string): string[] {
  const out: string[] = []
  for (const segment of command.split(/\n|;|&&|\|\||\||\$\(|`/)) {
    const words = segment.trim().match(/"[^"]*"|'[^']*'|\S+/g) ?? []
    let i = 0
    while (i < words.length) {
      const w = words[i]!.replace(/^["']|["']$/g, '')
      const base = path.basename(w)
      if (/^[A-Z_][A-Z0-9_]*=/.test(w) || WRAPPERS.has(base) || w.startsWith('-')) i++
      else if ((base === 'pnpm' && words[i + 1] === 'dlx') || (base === 'bun' && words[i + 1] === 'x') || (base === 'pnpm' && words[i + 1] === 'exec')) i += 2
      else if (['bash', 'sh', 'zsh'].includes(base) && words[i + 1] === '-c') {
        out.push(...programs(words.slice(i + 2).join(' ').replace(/^["']|["']$/g, '')))
        break
      } else {
        out.push(base)
        break
      }
    }
  }
  return out
}

export function blocked(tool: string, input: { command?: string; file_path?: string; notebook_path?: string } = {}) {
  if (tool.startsWith('mcp__')) return /neon|cloudflare/i.test(tool) ? tool : null
  const file = input.file_path ?? input.notebook_path ?? ''
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) return LOCKED.test(file) ? `${tool} ${file} (written only by bun loop)` : null
  if (tool === 'Read') return /(^|\/)\.env(\.[a-z]+)?$/.test(file) && !file.endsWith('.example') ? `Read ${file}` : null
  if (tool !== 'Bash') return null
  const cmd = input.command ?? ''
  return SECRET.test(cmd) || programs(cmd).some((p) => CLI.has(p)) ? cmd : null
}

/** The worktree whose checkout is an item's branch with the item not yet done, if any. */
export function activeWorktree(dir: string) {
  const list = Bun.spawnSync(['git', 'worktree', 'list', '--porcelain'], { cwd: dir, stdout: 'pipe', stderr: 'ignore' }).stdout.toString()
  for (const block of list.split('\n\n')) {
    const tree = block.match(/^worktree (.+)$/m)?.[1]
    const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1]
    const f = tree && path.join(tree, 'docs/strategy/loop/state.json')
    if (!f || !existsSync(f)) continue
    const s = JSON.parse(readFileSync(f, 'utf8'))
    if (s.item && s.stage !== 'done' && s.branch === branch) return { item: s.item as string, stage: s.stage as string, path: tree }
  }
}

if (import.meta.main) {
  try {
    const input = JSON.parse(await Bun.stdin.text())
    const what = blocked(input.tool_name ?? '', input.tool_input ?? {})
    const active = what && activeWorktree(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd())
    if (active) {
      console.error(`loop guard (ADR-0050): ${active.item} is in progress; production, secrets and loop state are owner-only. Blocked: ${what.slice(0, 160)}`)
      process.exit(2)
    }
  } catch (e) {
    console.error(`loop guard (ADR-0050) failed closed: ${(e as Error).message}`)
    process.exit(2)
  }
}
