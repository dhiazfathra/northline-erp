// GitHub side of the gate (ADR-0050): the PR body's loop section and CodeRabbit threads, through `gh`. Output is one
// line per thread on purpose; `cr show` prints CodeRabbit's own agent prompt for a thread only when it is needed.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { evidenceDir, LOOP, runs, sh, type State } from './lib'

const BEGIN = '<!-- loop:begin -->'
const END = '<!-- loop:end -->'
const SECTION = new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n*`, 'g')

export function repo() {
  const url = sh(['git', 'remote', 'get-url', 'origin']).out
  const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/)
  if (!m) throw new Error(`origin is not a GitHub remote: ${url}`)
  return { owner: m[1]!, name: m[2]! }
}

const gh = (args: string[]) => {
  const r = sh(['gh', ...args])
  if (!r.ok) throw new Error(`gh ${args.slice(0, 2).join(' ')}: ${r.err.split('\n')[0]}`)
  return r.out
}
const graphql = (query: string, vars: Record<string, string | number>) =>
  JSON.parse(gh(['api', 'graphql', '-f', `query=${query}`, ...Object.entries(vars).flatMap(([k, v]) => [typeof v === 'number' ? '-F' : '-f', `${k}=${v}`])])).data

/** The loop's part of the PR body, rendered from state, the changelog and the latest evals run, so it can always be rebuilt. */
export function section(s: State) {
  if (!s.item || !s.plan || !s.branch) throw new Error('no item with a plan in progress')
  const { owner, name } = repo()
  const blob = `https://github.com/${owner}/${name}/blob/${s.branch}/docs/strategy/loop`
  const raw = `https://raw.githubusercontent.com/${owner}/${name}/${s.branch}/docs/strategy/loop/evidence/${s.item}`
  const ev = runs(s.item).findLast((r) => r.kind === 'evals')
  const cases = ev?.cases ? Object.entries(ev.cases) : []
  const passed = cases.filter(([, v]) => v.every((x) => x !== false) && v.some((x) => x !== null)).length
  const flows = ev?.flows ?? []
  const shots = flows.filter((f) => f.shot && existsSync(path.join(evidenceDir(s.item!), 'runs', ev!.id, f.file, f.shot))).slice(0, 4)
  const log = path.join(LOOP, 'CHANGELOG.md')
  const goalposts = existsSync(log) ? readFileSync(log, 'utf8').split('\n## ').filter((e) => e.includes(` · ${s.item} plan `)).flatMap((e) => e.split('\n').filter((l) => l.startsWith('- ⚠'))) : []
  return [
    BEGIN,
    `## ${s.item}: ${s.plan.title}`,
    '',
    `Done when: \`${s.plan.doneWhen}\``,
    '',
    ...s.plan.slices.map((x) => `- [${x.status === 'done' ? 'x' : ' '}] ${x.id} ${x.title}`),
    '',
    ev
      ? `Golden evals (pass^2): ${passed}/${cases.length} on \`${ev.sha}\` · e2e ${flows.filter((f) => f.ok).length}/${flows.length} flows · [evidence](${blob}/evidence/${s.item}/README.md)`
      : 'Golden evals: not run yet.',
    ...(shots.length ? ['', shots.map((f) => `<img src="${raw}/runs/${ev!.id}/${f.file}/${f.shot}" width="240" alt="${f.name}">`).join(' ')] : []),
    ...(s.plan.ownerSteps.length ? ['', '**Owner steps (not run by the loop):**', ...s.plan.ownerSteps.map((x) => `- [ ] ${x}`)] : []),
    ...(goalposts.length ? ['', '**Moved goalposts (check these):**', ...goalposts] : []),
    '',
    `Plan v${s.plan.version}; every change and its reason is in the [loop changelog](${blob}/CHANGELOG.md).`,
    END,
  ].join('\n')
}

/** Puts the loop section first and keeps whatever else the body holds (the no-mistakes text) below a rule. */
export function withSection(body: string, sec: string) {
  const rest = body.replace(SECTION, '').replace(/^\s*---\s*/, '').trim()
  return rest ? `${sec}\n\n---\n\n${rest}\n` : `${sec}\n`
}

export const bodyOk = (body: string, sec: string) => (body.match(SECTION)?.length ?? 0) === 1 && body.includes(sec)

const prBody = (n: number) => gh(['pr', 'view', String(n), '--json', 'body', '--jq', '.body'])
const withFile = <T>(body: string, fn: (f: string) => T) => {
  const f = path.join(tmpdir(), `loop-pr-body-${process.pid}.md`)
  writeFileSync(f, body)
  try {
    return fn(f)
  } finally {
    rmSync(f, { force: true })
  }
}

export function restoreBody(s: State) {
  const sec = section(s)
  const body = prBody(s.pr!)
  if (!bodyOk(body, sec)) withFile(withSection(body, sec), (f) => gh(['pr', 'edit', String(s.pr), '--body-file', f]))
  return bodyOk(prBody(s.pr!), sec)
}
export const verifyBody = (s: State) => (s.pr ? bodyOk(prBody(s.pr), section(s)) : null)

/** Adopts the PR no-mistakes opened for this branch: records its number, sets the plan's title and the loop section. */
export function adoptPr(s: State) {
  const n = sh(['gh', 'pr', 'view', s.branch!, '--json', 'number', '--jq', '.number']).out
  if (!n) throw new Error(`no PR for ${s.branch} yet: \`bun loop nm\` pushes and opens it`)
  s.pr = Number(n)
  gh(['pr', 'edit', n, '--title', s.plan!.title])
  if (!restoreBody(s)) throw new Error(`PR #${n} body still lacks the loop section`)
  return s.pr
}

// ── CodeRabbit ──
const isCr = (login?: string) => /coderabbit/i.test(login ?? '')
const Q = `query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){pullRequest(number:$n){
  headRefOid reviewDecision commits(last:1){nodes{commit{committedDate}}}
  reviews(last:50){nodes{author{login} state body commit{oid}}}
  comments(last:30){nodes{author{login} body updatedAt}}
  reviewThreads(first:100){nodes{id isResolved path line comments(first:1){nodes{author{login} body}}}}}}}`

export type CrState = 'open-threads' | 'approved' | 'rate-limited' | 'reviewed' | 'rounds-exhausted' | 'pending'
export const TERMINAL: CrState[] = ['approved', 'rate-limited', 'reviewed', 'rounds-exhausted']
// CodeRabbit edits its walkthrough comment in place, so only a limit notice updated after the head commit counts.
const LIMITED = /rate limited by coderabbit\.ai|review limit reached|rate limit exceeded/i

export function crStatus(n: number) {
  const pr = graphql(Q, { ...repo(), n }).repository.pullRequest
  const reviews = pr.reviews.nodes.filter((r: any) => isCr(r.author?.login))
  const rounds = new Set(reviews.map((r: any) => r.commit?.oid)).size
  const threads = pr.reviewThreads.nodes.filter((t: any) => !t.isResolved && isCr(t.comments.nodes[0]?.author?.login))
  const headAt = pr.commits.nodes[0]?.commit.committedDate ?? ''
  const limited = pr.comments.nodes.some((c: any) => isCr(c.author?.login) && LIMITED.test(c.body) && c.updatedAt > headAt)
  const last = reviews.at(-1)
  const state: CrState = threads.length
    ? 'open-threads'
    : pr.reviewDecision === 'APPROVED' || (last?.state === 'APPROVED' && last.commit?.oid === pr.headRefOid)
      ? 'approved'
      : limited
        ? 'rate-limited'
        : reviews.some((r: any) => r.commit?.oid === pr.headRefOid)
          ? 'reviewed'
          : rounds >= 2
            ? 'rounds-exhausted'
            : 'pending'
  return { state, rounds, head: pr.headRefOid.slice(0, 7) as string, threads, outside: outsideDiff(last?.body ?? '') }
}

const plain = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<details>\s*<summary>[^<]*<\/summary>[\s\S]*?<\/details>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** "⚠️ Potential issue | 🟠 Major · Title." from a CodeRabbit comment. */
export function headline(body: string) {
  const t = plain(body)
  const sev = t.split('\n')[0]!.replace(/_/g, '').trim()
  const title = t.match(/\*\*(.+?)\*\*/)?.[1]
  return (title ? `${sev} · ${title}` : t.replace(/\s+/g, ' ')).slice(0, 180)
}

/** CodeRabbit's "Prompt for AI Agents" block: the shortest exact statement of the fix. Falls back to the plain body. */
export function agentPrompt(body: string) {
  const p = body.match(/<summary>🤖 Prompt for AI Agents<\/summary>\s*([\s\S]*?)<\/details>/)?.[1]
  return p ? p.replace(/```\w*\n?/g, '').trim() : plain(body)
}

/** Findings CodeRabbit puts in the review body because they sit outside the diff; they have no thread to reply to. */
export function outsideDiff(body: string) {
  const block = body.match(/Outside diff range comments[\s\S]*?(?=<\/details>\s*<\/blockquote>\s*<\/details>|$)/)?.[0] ?? ''
  const out: string[] = []
  let file = ''
  for (const line of block.split('\n')) {
    const f = line.match(/<summary>(.+?) \(\d+\)<\/summary>/)
    if (f) file = f[1]!
    const c = line.match(/^`(\d+(?:-\d+)?)`: \*\*(.+?)\*\*/)
    if (c) out.push(`${file}:${c[1]} ${c[2]}`)
  }
  return out
}

export const threadBody = (n: number, id: string) => {
  const t = graphql(Q, { ...repo(), n }).repository.pullRequest.reviewThreads.nodes.find((x: any) => x.id === id)
  if (!t) throw new Error(`no thread ${id} on #${n}`)
  return `${t.path}:${t.line}\n${headline(t.comments.nodes[0].body)}\n\n${agentPrompt(t.comments.nodes[0].body)}`
}

export function replyResolve(id: string, text: string) {
  graphql('mutation($id:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$b}){comment{id}}}', { id, b: text })
  graphql('mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}', { id })
}
