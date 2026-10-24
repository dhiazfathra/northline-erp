// GitHub side of the gate (ADR-0050): the PR body's loop section and CodeRabbit threads, through `gh`. Output is one
// line per thread on purpose; `cr show` prints CodeRabbit's own agent prompt for a thread only when it is needed.
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const (
	sectionBegin = "<!-- loop:begin -->"
	sectionEnd   = "<!-- loop:end -->"
)

var (
	sectionRe = regexp.MustCompile(regexp.QuoteMeta(sectionBegin) + `[\s\S]*?` + regexp.QuoteMeta(sectionEnd) + `\n*`)
	remoteRe  = regexp.MustCompile(`github\.com[:/]([^/]+)/(.+?)(?:\.git)?$`)
	ruleRe    = regexp.MustCompile(`^\s*---\s*`)
)

func repo() (owner, name string, err error) {
	url := sh([]string{"git", "remote", "get-url", "origin"}).Out
	m := remoteRe.FindStringSubmatch(url)
	if m == nil {
		return "", "", fmt.Errorf("origin is not a GitHub remote: %s", url)
	}
	return m[1], m[2], nil
}

func gh(args ...string) (string, error) {
	r := sh(append([]string{"gh"}, args...))
	if !r.Ok {
		n := min(2, len(args))
		return "", fmt.Errorf("gh %s: %s", strings.Join(args[:n], " "), strings.Split(r.Err, "\n")[0])
	}
	return r.Out, nil
}

func graphql(query string, vars map[string]any) (map[string]any, error) {
	args := []string{"api", "graphql", "-f", "query=" + query}
	for k, v := range vars {
		if n, ok := v.(int); ok {
			args = append(args, "-F", fmt.Sprintf("%s=%d", k, n))
		} else {
			args = append(args, "-f", fmt.Sprintf("%s=%v", k, v))
		}
	}
	out, err := gh(args...)
	if err != nil {
		return nil, err
	}
	var r map[string]any
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		return nil, err
	}
	d, _ := r["data"].(map[string]any)
	return d, nil
}

// get walks parsed JSON: get(x, "a", "b", 0) is x.a.b[0], nil when absent.
func get(x any, keys ...any) any {
	for _, k := range keys {
		switch k := k.(type) {
		case string:
			m, _ := x.(map[string]any)
			x = m[k]
		case int:
			a, _ := x.([]any)
			if k < 0 {
				k += len(a)
			}
			if k < 0 || k >= len(a) {
				return nil
			}
			x = a[k]
		}
	}
	return x
}
func gets(x any, keys ...any) string { s, _ := get(x, keys...).(string); return s }
func list(x any, keys ...any) []any  { a, _ := get(x, keys...).([]any); return a }

// section is the loop's part of the PR body, rendered from state, the changelog and the latest evals run, so it can always be rebuilt.
func section(s *State) (string, error) {
	if !truthy(s.Item) || s.Plan == nil || !truthy(s.Branch) {
		return "", errors.New("no item with a plan in progress")
	}
	owner, name, err := repo()
	if err != nil {
		return "", err
	}
	item, br := *s.Item, *s.Branch
	// Pinned to the pushed head (fetched now), not the branch name, so the links outlive the branch's deletion on merge
	// and local-only state commits after the push leave the section, and so the body check, unchanged.
	sh([]string{"git", "fetch", "-q", "origin", br})
	pushed := sh([]string{"git", "rev-parse", "--verify", "-q", "origin/" + br})
	if !pushed.Ok {
		return "", fmt.Errorf("origin/%s does not exist yet: `bun loop nm` pushes it", br)
	}
	sha := pushed.Out
	blob := fmt.Sprintf("https://github.com/%s/%s/blob/%s/docs/strategy/loop", owner, name, sha)
	raw := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/docs/strategy/loop/evidence/%s", owner, name, sha, item)
	ev := findLast(runs(item), func(r *Run) bool { return r.Kind == "evals" })
	passed, total := 0, 0
	var flows []Flow
	if ev != nil {
		total = ev.Cases.Len()
		if ev.Cases != nil {
			for _, k := range ev.Cases.Keys {
				v := ev.Cases.M[k]
				noFalse, some := true, false
				for _, x := range v {
					if x != nil {
						some = true
						if !*x {
							noFalse = false
						}
					}
				}
				if noFalse && some {
					passed++
				}
			}
		}
		lastRound := ""
		if n := len(ev.Flows); n > 0 {
			lastRound = runRound.FindString(ev.Flows[n-1].File)
		}
		for _, f := range ev.Flows {
			if strings.HasPrefix(f.File, lastRound) {
				flows = append(flows, f)
			}
		}
	}
	shots := []string{}
	for _, f := range flows {
		if len(shots) < 4 && f.Shot != "" && exists(filepath.Join(evidenceDir(item), "runs", ev.ID, f.File, f.Shot)) {
			shots = append(shots, fmt.Sprintf(`<img src="%s/runs/%s/%s/%s" width="240" alt="%s">`, raw, ev.ID, f.File, f.Shot, f.Name))
		}
	}
	goalposts := []string{}
	if b, err := os.ReadFile(filepath.Join(LOOP, "CHANGELOG.md")); err == nil {
		for _, e := range strings.Split(string(b), "\n## ") {
			if strings.Contains(e, " · "+item+" plan ") {
				for _, l := range strings.Split(e, "\n") {
					if strings.HasPrefix(l, "- ⚠") {
						goalposts = append(goalposts, l)
					}
				}
			}
		}
	}
	L := []string{sectionBegin, fmt.Sprintf("## %s: %s", item, s.Plan.Title), "", fmt.Sprintf("Done when: `%s`", s.Plan.DoneWhen), ""}
	for _, x := range s.Plan.Slices {
		m := " "
		if x.Status == "done" {
			m = "x"
		}
		L = append(L, fmt.Sprintf("- [%s] %s %s", m, x.ID, x.Title))
	}
	L = append(L, "")
	if ev != nil {
		ok := 0
		for _, f := range flows {
			if f.Ok {
				ok++
			}
		}
		L = append(L, fmt.Sprintf("Golden evals (pass^2): %d/%d on `%s` · e2e %d/%d flows · [evidence](%s/evidence/%s/README.md)", passed, total, ev.Sha, ok, len(flows), blob, item))
	} else {
		L = append(L, "Golden evals: not run yet.")
	}
	if len(shots) > 0 {
		L = append(L, "", strings.Join(shots, " "))
	}
	// Plain bullets: a task-list box the owner ticks would change the body and fail the section check.
	if len(s.Plan.OwnerSteps) > 0 {
		L = append(L, "", "**Owner steps (not run by the loop):**")
		for _, x := range s.Plan.OwnerSteps {
			L = append(L, "- "+x)
		}
	}
	if len(goalposts) > 0 {
		L = append(L, "", "**Moved goalposts (check these):**")
		L = append(L, goalposts...)
	}
	L = append(L, "", fmt.Sprintf("Plan v%d; every change and its reason is in the [loop changelog](%s/CHANGELOG.md).", s.Plan.Version, blob), sectionEnd)
	return strings.Join(L, "\n"), nil
}

// withSection puts the loop section first and keeps whatever else the body holds (the no-mistakes text) below a rule.
func withSection(body, sec string) string {
	rest := sectionRe.ReplaceAllString(body, "")
	if loc := ruleRe.FindStringIndex(rest); loc != nil {
		rest = rest[loc[1]:]
	}
	rest = jsTrim(rest)
	if rest != "" {
		return sec + "\n\n---\n\n" + rest + "\n"
	}
	return sec + "\n"
}

func bodyOk(body, sec string) bool {
	return len(sectionRe.FindAllStringIndex(body, -1)) == 1 && strings.Contains(body, sec)
}

func prBody(n int) (string, error) {
	return gh("pr", "view", strconv.Itoa(n), "--json", "body", "--jq", ".body")
}

func restoreBody(s *State) (bool, error) {
	sec, err := section(s)
	if err != nil {
		return false, err
	}
	body, err := prBody(*s.PR)
	if err != nil {
		return false, err
	}
	if !bodyOk(body, sec) {
		f := filepath.Join(os.TempDir(), fmt.Sprintf("loop-pr-body-%d.md", os.Getpid()))
		if err := os.WriteFile(f, []byte(withSection(body, sec)), 0o644); err != nil {
			return false, err
		}
		_, err := gh("pr", "edit", strconv.Itoa(*s.PR), "--body-file", f)
		os.Remove(f)
		if err != nil {
			return false, err
		}
	}
	body, err = prBody(*s.PR)
	if err != nil {
		return false, err
	}
	return bodyOk(body, sec), nil
}

// verifyBody: nil before the PR exists.
func verifyBody(s *State) (*bool, error) {
	if s.PR == nil || *s.PR == 0 {
		return nil, nil
	}
	body, err := prBody(*s.PR)
	if err != nil {
		return nil, err
	}
	sec, err := section(s)
	if err != nil {
		return nil, err
	}
	return ptr(bodyOk(body, sec)), nil
}

// adoptPr adopts the PR no-mistakes opened for this branch: records its number, sets the plan's title and the loop section.
func adoptPr(s *State) (int, error) {
	n := sh([]string{"gh", "pr", "view", str(s.Branch), "--json", "number", "--jq", ".number"}).Out
	if n == "" {
		return 0, fmt.Errorf("no PR for %s yet: `bun loop nm` pushes and opens it", str(s.Branch))
	}
	s.PR = ptr(int(jsNumber(n)))
	if _, err := gh("pr", "edit", n, "--title", s.Plan.Title); err != nil {
		return 0, err
	}
	ok, err := restoreBody(s)
	if err != nil {
		return 0, err
	}
	if !ok {
		return 0, fmt.Errorf("PR #%s body still lacks the loop section", n)
	}
	return *s.PR, nil
}

// ── CodeRabbit ──

var crLogin = regexp.MustCompile(`(?i)coderabbit`)

func isCr(login string) bool { return crLogin.MatchString(login) }

const crQuery = `query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){pullRequest(number:$n){
  headRefOid reviewDecision commits(last:1){nodes{commit{committedDate}}}
  reviews(last:50){nodes{author{login} state body commit{oid}}}
  comments(last:30){nodes{author{login} body updatedAt}}
  reviewThreads(first:100){pageInfo{hasNextPage endCursor} nodes{id isResolved path line comments(first:1){nodes{author{login} body}}}}}}}`
const moreThreads = `query($owner:String!,$name:String!,$n:Int!,$after:String!){repository(owner:$owner,name:$name){pullRequest(number:$n){
  reviewThreads(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{id isResolved path line comments(first:1){nodes{author{login} body}}}}}}}`

func repoVars(extra map[string]any) (map[string]any, error) {
	owner, name, err := repo()
	if err != nil {
		return nil, err
	}
	v := map[string]any{"owner": owner, "name": name}
	for k, x := range extra {
		v[k] = x
	}
	return v, nil
}

// allThreads: every review thread, past the first page too: the gate must not pass with unresolved threads on page two.
func allThreads(n int, first any) ([]any, error) {
	nodes := append([]any{}, list(first, "nodes")...)
	page := get(first, "pageInfo")
	for get(page, "hasNextPage") == true {
		v, err := repoVars(map[string]any{"n": n, "after": gets(page, "endCursor")})
		if err != nil {
			return nil, err
		}
		d, err := graphql(moreThreads, v)
		if err != nil {
			return nil, err
		}
		next := get(d, "repository", "pullRequest", "reviewThreads")
		nodes = append(nodes, list(next, "nodes")...)
		page = get(next, "pageInfo")
	}
	return nodes, nil
}

var TERMINAL = []string{"approved", "rate-limited", "reviewed", "rounds-exhausted"}

// CodeRabbit edits its walkthrough comment in place, so only a limit notice updated after the head commit counts.
// Seen so far: "rate limited by coderabbit.ai", "Review limit reached", "Review rate limited" (a manual request).
var limitedRe = regexp.MustCompile(`(?i)rate[ -]limit|review limit reached`)

type CR struct {
	State   string
	Rounds  int
	Head    string
	Threads []any
	Outside []string
}

// crStatus: since is when no-mistakes last pushed (state.pushedAt); a limit notice from before that push is about an older head.
func crStatus(n int, since *string) (CR, error) {
	v, err := repoVars(map[string]any{"n": n})
	if err != nil {
		return CR{}, err
	}
	d, err := graphql(crQuery, v)
	if err != nil {
		return CR{}, err
	}
	pr := get(d, "repository", "pullRequest")
	threads, err := allThreads(n, get(pr, "reviewThreads"))
	if err != nil {
		return CR{}, err
	}
	return crSummary(pr, threads, since), nil
}

// crSummary is the gate's view of CodeRabbit, from the PR data alone (pure, so it is tested on recorded shapes).
func crSummary(pr any, threadNodes []any, since *string) CR {
	// CodeRabbit's replies in threads also arrive as COMMENTED reviews, with an empty body; only a review with a body
	// ("Actionable comments posted: n") is a review round.
	reviews := []any{}
	for _, r := range list(pr, "reviews", "nodes") {
		if isCr(gets(r, "author", "login")) && jsTrim(gets(r, "body")) != "" {
			reviews = append(reviews, r)
		}
	}
	oids := map[any]bool{}
	for _, r := range reviews {
		oids[get(r, "commit", "oid")] = true
	}
	threads := []any{}
	for _, t := range threadNodes {
		if get(t, "isResolved") != true && isCr(gets(t, "comments", "nodes", 0, "author", "login")) {
			threads = append(threads, t)
		}
	}
	headAt := ""
	if since != nil {
		headAt = *since
	} else if c, ok := get(pr, "commits", "nodes", 0, "commit", "committedDate").(string); ok {
		headAt = c
	}
	limited := false
	for _, c := range list(pr, "comments", "nodes") {
		if isCr(gets(c, "author", "login")) && limitedRe.MatchString(gets(c, "body")) && gets(c, "updatedAt") > headAt {
			limited = true
		}
	}
	head := gets(pr, "headRefOid")
	var last any
	if len(reviews) > 0 {
		last = reviews[len(reviews)-1]
	}
	reviewedHead := false
	for _, r := range reviews {
		if gets(r, "commit", "oid") == head {
			reviewedHead = true
		}
	}
	state := "pending"
	switch {
	case len(threads) > 0:
		state = "open-threads"
	case gets(pr, "reviewDecision") == "APPROVED" || (gets(last, "state") == "APPROVED" && gets(last, "commit", "oid") == head):
		state = "approved"
	case limited:
		state = "rate-limited"
	case reviewedHead:
		state = "reviewed"
	case len(oids) >= 2:
		state = "rounds-exhausted"
	}
	return CR{state, len(oids), slice16(head, 7), threads, bodyFindings(gets(last, "body"))}
}

// CodeRabbit comment shape (2026-10): a bold severity line ("**🎯 Functional Correctness** | **Minor** | **⚡ Quick win**"),
// <details> blocks (analysis, suggested fix, committable suggestion), a bold title paragraph, then the explanation.
var (
	commentRe   = regexp.MustCompile(`<!--[\s\S]*?-->`)
	detailsRe   = regexp.MustCompile(`<details>\s*<summary>[\s\S]*?</summary>[\s\S]*?</details>`)
	tagRe       = regexp.MustCompile(`<[^>]+>`)
	blanksRe    = regexp.MustCompile(`\n{3,}`)
	boldRe      = regexp.MustCompile(`\*\*`)
	italicRe    = regexp.MustCompile(`_([^_|]+)_`)
	spacesRe    = regexp.MustCompile(`\s+`)
	titleRe     = regexp.MustCompile(`^\*\*[^*].*\*\*$`)
	promptRe    = regexp.MustCompile(`<summary>🤖 Prompt for AI Agents</summary>\s*([\s\S]*?)</details>`)
	fenceRe     = regexp.MustCompile("```\\w*\\n?")
	fixRe       = regexp.MustCompile(`<summary>[^<]*(?:Suggested fix|Committable suggestion)[^<]*</summary>\s*([\s\S]*?)</details>`)
	quoteRe     = regexp.MustCompile(`^(> ?)+`)
	bodyHeadRe  = regexp.MustCompile(`(?i)^\*\*[^*]*?(Outside diff range|Nitpick|Duplicate)[^*]*\*\*`)
	bodyEntryRe = regexp.MustCompile(`<summary><strong>([\s\S]*?)</strong> · ([\s\S]*?) · <code>([^<]*)</code></summary>`)
	fullPathRe  = regexp.MustCompile("^`([^`]+:\\d+(?:-\\d+)?)`$")
)

func plain(s string) string {
	s = commentRe.ReplaceAllString(s, "")
	s = detailsRe.ReplaceAllString(s, "")
	s = tagRe.ReplaceAllString(s, "")
	s = blanksRe.ReplaceAllString(s, "\n\n")
	return jsTrim(s)
}
func severity(line string) string {
	line = boldRe.ReplaceAllString(line, "")
	line = italicRe.ReplaceAllString(line, "${1}")
	return jsTrim(spacesRe.ReplaceAllString(line, " "))
}

// headline: "🎯 Functional Correctness | Minor | ⚡ Quick win · Upgrade the existing sandbox login when reseeding."
func headline(body string) string {
	lines := []string{}
	for _, l := range strings.Split(plain(body), "\n") {
		if l = jsTrim(l); l != "" {
			lines = append(lines, l)
		}
	}
	title := ""
	for i, l := range lines {
		if i > 0 && titleRe.MatchString(l) {
			title = strings.ReplaceAll(l, "**", "")
			break
		}
	}
	if title != "" {
		first := ""
		if len(lines) > 0 {
			first = lines[0]
		}
		return slice16(severity(first)+" · "+title, 200)
	}
	return slice16(strings.Join(lines, " "), 200)
}

// detail is what `cr show` prints: CodeRabbit's agent prompt when it wrote one, else the explanation plus its suggested fix.
func detail(body string) string {
	if m := promptRe.FindStringSubmatch(body); m != nil && m[1] != "" {
		return jsTrim(fenceRe.ReplaceAllString(m[1], ""))
	}
	fix := ""
	if m := fixRe.FindStringSubmatch(body); m != nil {
		fix = jsTrim(tagRe.ReplaceAllString(m[1], ""))
	}
	p := strings.Split(plain(body), "\n")
	text := jsTrim(strings.Join(p[1:], "\n"))
	if fix != "" {
		return text + "\n\nSuggested fix:\n" + fix
	}
	return text
}

// bodyFindings: findings in the review body (outside the diff, nitpicks, duplicates); they have no thread, so they are fixed or noted.
func bodyFindings(body string) []string {
	lines := strings.Split(body, "\n")
	for i, l := range lines {
		lines[i] = quoteRe.ReplaceAllString(l, "")
	}
	out := []string{}
	section := ""
	for i, l := range lines {
		if h := bodyHeadRe.FindStringSubmatch(l); h != nil {
			section = strings.Split(strings.ToLower(h[1]), " ")[0]
		}
		m := bodyEntryRe.FindStringSubmatch(l)
		if m == nil || section == "" {
			continue
		}
		full := ""
		for _, x := range lines[i+1 : min(i+8, len(lines))] {
			if f := fullPathRe.FindStringSubmatch(x); f != nil {
				full = f[1]
				break
			}
		}
		if full == "" {
			full = m[3]
		}
		out = append(out, fmt.Sprintf("%s %s [%s] %s", section, full, jsTrim(tagRe.ReplaceAllString(m[1], "")), m[2]))
	}
	return out
}

func threadBody(n int, id string) (string, error) {
	v, err := repoVars(map[string]any{"n": n})
	if err != nil {
		return "", err
	}
	d, err := graphql(crQuery, v)
	if err != nil {
		return "", err
	}
	all, err := allThreads(n, get(d, "repository", "pullRequest", "reviewThreads"))
	if err != nil {
		return "", err
	}
	for _, t := range all {
		if gets(t, "id") == id {
			body := gets(t, "comments", "nodes", 0, "body")
			return fmt.Sprintf("%s:%s\n%s\n\n%s", gets(t, "path"), jsVal(get(t, "line")), headline(body), detail(body)), nil
		}
	}
	return "", fmt.Errorf("no thread %s on #%d", id, n)
}

// jsVal is `${x}` for a parsed JSON scalar.
func jsVal(x any) string {
	switch v := x.(type) {
	case nil:
		return "null"
	case float64:
		return num(v)
	case string:
		return v
	}
	return fmt.Sprint(x)
}

func replyResolve(id, text string) error {
	if _, err := graphql(`mutation($id:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$b}){comment{id}}}`, map[string]any{"id": id, "b": text}); err != nil {
		return err
	}
	_, err := graphql(`mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}`, map[string]any{"id": id})
	return err
}
