// PreToolUse hook (ADR-0050): while any worktree of this repo has a loop item in progress, production stays out of the
// agent's reach: Neon CLI and MCP tools, NEON_* variables, neon.tech hosts, wrangler, deploy:prod and switch:prod.
// Exit 2 blocks the call and shows the reason to the agent; exit 0 lets it through.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// CLI names count only in command position (start, or after ; & | ( ), so commit messages may still say "neon".
export const PROD = /deploy[:-]prod|switch[:-]prod|(^|[;&|(]\s*)(bunx\s+|npx\s+)?(neon|neonctl|wrangler)\s|NEON_[A-Z_]+|neon\.tech/

export function blocked(tool: string, command = '') {
  if (/neon/i.test(tool) && tool.startsWith('mcp__')) return tool
  return tool === 'Bash' && PROD.test(command) ? command : null
}

function activeItem(dir: string) {
  const list = Bun.spawnSync(['git', 'worktree', 'list', '--porcelain'], { cwd: dir, stdout: 'pipe', stderr: 'ignore' }).stdout.toString()
  for (const t of list.split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9))) {
    const f = path.join(t, 'docs/strategy/loop/state.json')
    if (!existsSync(f)) continue
    const s = JSON.parse(readFileSync(f, 'utf8'))
    if (s.item && s.stage !== 'done') return s.item as string
  }
}

if (import.meta.main) {
  const input = JSON.parse(await Bun.stdin.text())
  const what = blocked(input.tool_name ?? '', input.tool_input?.command)
  const item = what && activeItem(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd())
  if (item) {
    console.error(`loop guard (ADR-0050): ${item} is in progress, and production access is an owner step. Blocked: ${what.slice(0, 160)}`)
    process.exit(2)
  }
}
