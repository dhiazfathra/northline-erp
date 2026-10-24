// Steps behind `bun loop check` and `bun loop evals` (ADR-0050). Each step writes its full output to the run's
// evidence dir and returns one line; the golden cases G1–G12 are judged from step results, never by the agent.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode"
)

func api() string        { return filepath.Join(ROOT, "apps/api") }
func web() string        { return filepath.Join(ROOT, "apps/web") }
func migrations() string { return filepath.Join(api(), "migrations") }
func dbTs() string       { return filepath.Join(api(), "src/db.ts") }

// The local docker Postgres (root `bun run dev:db`, CI service); E2E_PG moves every connection, as in e2e-db.ts.
func pg() string {
	if v, ok := os.LookupEnv("E2E_PG"); ok {
		return v
	}
	return "postgres://postgres:northline@localhost:55432"
}

var (
	testDB = map[string]string{"E2E_DB": "northline_loop_test"}                                    // the loop's own test database: other worktrees' tests cannot deadlock it
	login  = map[string]string{"NL_EMAIL": "e2e@northline.test", "NL_PASSWORD": "e2e-secret-pass"} // tools/e2e defaults
)

type Ctx struct {
	Dir     string
	State   *State
	Media   string
	mu      sync.Mutex
	Flows   []Flow
	Metrics *OMap[float64]
}

func (c *Ctx) metric(k string, v float64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Metrics.Set(k, v)
}

type StepOut struct {
	Ok   bool
	Note string
}
type Step struct {
	Name string
	Run  func(c *Ctx) (StepOut, error)
}

// Every child the loop starts, so an interrupted run (SIGINT, SIGTERM, a harness timeout) leaves no server behind.
var (
	childMu  sync.Mutex
	children = map[*exec.Cmd]bool{}
)

func addChild(c *exec.Cmd)  { childMu.Lock(); children[c] = true; childMu.Unlock() }
func dropChild(c *exec.Cmd) { childMu.Lock(); delete(children, c); childMu.Unlock() }
func killChildren() {
	childMu.Lock()
	defer childMu.Unlock()
	for c := range children {
		if c.Process != nil {
			c.Process.Signal(syscall.SIGTERM)
		}
	}
}

type ExecOut struct {
	Code     int
	Out, Err string
}

func exitCode(err error, ps *os.ProcessState) int {
	if ps == nil {
		if err != nil {
			return 1
		}
		return 0
	}
	if ws, ok := ps.Sys().(syscall.WaitStatus); ok && ws.Signaled() {
		return 128 + int(ws.Signal())
	}
	return ps.ExitCode()
}

func execStep(c *Ctx, name string, argv []string, cwd string, env map[string]string, minutes float64) (ExecOut, error) {
	cmd := exec.Command(argv[0], argv[1:]...)
	cmd.Dir = cwd
	cmd.Env = withEnv(env)
	var out, errb bytes.Buffer
	cmd.Stdout, cmd.Stderr = &out, &errb
	if err := cmd.Start(); err != nil {
		return ExecOut{}, err
	}
	addChild(cmd)
	timer := time.AfterFunc(time.Duration(minutes*float64(time.Minute)), func() { cmd.Process.Signal(syscall.SIGTERM) })
	err := cmd.Wait()
	timer.Stop()
	dropChild(cmd)
	code := exitCode(err, cmd.ProcessState)
	timedOut := ""
	if ws, ok := cmd.ProcessState.Sys().(syscall.WaitStatus); ok && ws.Signaled() && ws.Signal() == syscall.SIGTERM {
		timedOut = fmt.Sprintf("\nkilled after %s min\n", num(minutes))
	}
	rel, _ := filepath.Rel(ROOT, cwd)
	if rel == "" {
		rel = "."
	}
	log := fmt.Sprintf("$ %s  (in %s)\n%s%s%s\nexit %d\n", strings.Join(argv, " "), rel, out.String(), errb.String(), timedOut, code)
	if len(log) > 200_000 {
		log = "…trimmed\n" + log[len(log)-200_000:]
	}
	if err := os.WriteFile(filepath.Join(c.Dir, name+".log"), []byte(log), 0o644); err != nil {
		return ExecOut{}, err
	}
	return ExecOut{code, out.String(), errb.String()}, nil
}

func cmdStep(name string, argv []string, cwd func() string) Step {
	return Step{name, func(c *Ctx) (StepOut, error) {
		r, err := execStep(c, name, argv, cwd(), nil, 10)
		if err != nil {
			return StepOut{}, err
		}
		note := ""
		if r.Code != 0 {
			note = fmt.Sprintf("exit %d", r.Code)
		}
		return StepOut{r.Code == 0, note}, nil
	}}
}

func tsc() string { return filepath.Join(api(), "node_modules/.bin/tsc") }

func files(dir, at string) []string {
	es, _ := os.ReadDir(filepath.Join(dir, at))
	out := []string{}
	for _, e := range es {
		if e.IsDir() {
			out = append(out, files(dir, filepath.Join(at, e.Name()))...)
		} else {
			out = append(out, filepath.Join(at, e.Name()))
		}
	}
	return out
}

var unionRun = regexp.MustCompile(`(?:[^\s|;,(){}<>\[\]]+ \| )+[^\s|;,(){}<>\[\]]+`)

// sameDeclarations: tsc may print a union's members in a different order run to run, on one line (`401 | 429`) or as
// multi-line object members. So each top-level chunk (a column-0 line and the lines indented under it) compares as a
// multiset of lines with one-line union runs sorted, and the files as a multiset of chunks: a member moved between
// declarations shows.
func sameDeclarations(a, b string) bool {
	norm := func(s string) string {
		chunks := [][]string{}
		for i, l := range strings.Split(s, "\n") {
			r := []rune(l)
			if i == 0 || (len(r) > 0 && !unicode.IsSpace(r[0])) {
				chunks = append(chunks, nil)
			}
			chunks[len(chunks)-1] = append(chunks[len(chunks)-1], l)
		}
		out := make([]string, len(chunks))
		for i, ch := range chunks {
			for j, l := range ch {
				l = strings.TrimRightFunc(l, unicode.IsSpace)
				ch[j] = unionRun.ReplaceAllStringFunc(l, func(m string) string {
					p := strings.Split(m, " | ")
					sort.Strings(p)
					return strings.Join(p, " | ")
				})
			}
			sort.Strings(ch)
			out[i] = strings.Join(ch, "\n")
		}
		sort.Strings(out)
		return strings.Join(out, "\n\x00")
	}
	return norm(a) == norm(b)
}

// apps/api's `typecheck` script also regenerates the tracked apps/api/types/*.d.ts that web compiles against. The loop
// builds them into a scratch dir instead and fails when the tracked ones are stale, so web is never checked against
// old API types and no check rewrites tracked files.
var typecheckApi = Step{"typecheck-api", func(c *Ctx) (StepOut, error) {
	a, err := execStep(c, "typecheck-api", []string{tsc(), "--noEmit"}, api(), nil, 10)
	if err != nil {
		return StepOut{}, err
	}
	if a.Code != 0 {
		return StepOut{false, fmt.Sprintf("exit %d", a.Code)}, nil
	}
	out := filepath.Join(c.Dir, "types")
	b, err := execStep(c, "typecheck-api-types", []string{tsc(), "-p", "tsconfig.types.json", "--outDir", out}, api(), nil, 10)
	if err != nil {
		return StepOut{}, err
	}
	if b.Code != 0 {
		return StepOut{false, fmt.Sprintf("declaration build: exit %d (typecheck-api-types.log)", b.Code)}, nil
	}
	tracked := filepath.Join(api(), "types")
	names := []string{}
	for _, f := range append(files(out, ""), files(tracked, "")...) {
		if !contains(names, f) {
			names = append(names, f)
		}
	}
	stale := []string{}
	for _, f := range names {
		x, e1 := os.ReadFile(filepath.Join(out, f))
		y, e2 := os.ReadFile(filepath.Join(tracked, f))
		if e1 != nil || e2 != nil || !sameDeclarations(string(x), string(y)) {
			stale = append(stale, f)
		}
	}
	if len(stale) > 0 {
		return StepOut{false, fmt.Sprintf("apps/api/types is stale (%s): run `bun run --cwd apps/api typecheck` and commit", strings.Join(stale[:min(2, len(stale))], ", "))}, nil
	}
	return StepOut{true, ""}, nil
}}

var (
	redactURL  = regexp.MustCompile(`(?i)\b([a-z][a-z0-9+.-]*://)[^\s:/@]+:[^\s@/]+@`)
	redactKey  = regexp.MustCompile(`(?i)\b(bearer|token|secret|password|apikey|api_key)(\s*[:=]\s*|\s+)["']?[^\s"']{8,}`)
	redactLong = regexp.MustCompile(`\b[A-Za-z0-9_-]{32,}\b`)
	gitSha     = regexp.MustCompile(`^[a-f0-9]{40}$`)
)

// redact keeps connection strings and token-shaped values out of anything that is committed (tails, notes): the repo is public.
func redact(s string) string {
	s = redactURL.ReplaceAllString(s, "${1}***@")
	s = redactKey.ReplaceAllString(s, "${1}${2}***")
	return redactLong.ReplaceAllStringFunc(s, func(m string) string {
		if gitSha.MatchString(m) {
			return m
		}
		return "***"
	})
}

func bunTest(out string, code int) StepOut {
	n := func(k string) int {
		m := regexp.MustCompile(`(?m)^\s*(\d+) ` + k + `$`).FindStringSubmatch(out)
		if m == nil {
			return 0
		}
		v, _ := strconv.Atoi(m[1])
		return v
	}
	return StepOut{code == 0 && n("fail") == 0, fmt.Sprintf("%d pass, %d fail", n("pass"), n("fail"))}
}

// goTest counts `go test -v` results, subtests included, in bun's "n pass, n fail" shape.
func goTest(out string, code int) StepOut {
	pass := len(regexp.MustCompile(`(?m)^\s*--- PASS`).FindAllString(out, -1))
	fail := len(regexp.MustCompile(`(?m)^\s*--- FAIL`).FindAllString(out, -1))
	return StepOut{code == 0 && fail == 0, fmt.Sprintf("%d pass, %d fail", pass, fail)}
}

func testApi(name, file string) Step {
	return Step{name, func(c *Ctx) (StepOut, error) {
		if file == "" {
			db, err := execStep(c, name+"-db", []string{"bun", "apps/api/scripts/e2e-db.ts", "reset"}, ROOT, testDB, 10)
			if err != nil {
				return StepOut{}, err
			}
			if db.Code != 0 {
				return StepOut{false, "test database: " + lastLine(db.Out+db.Err)}, nil
			}
		}
		// 20 s per test and hook: the first file migrates a brand-new database, which takes over bun's 5 s default under load.
		argv := []string{"bun", "test", "--timeout", "20000"}
		if file != "" {
			argv = append(argv, file)
		}
		r, err := execStep(c, name, argv, api(), map[string]string{"TEST_DATABASE_URL": pg() + "/" + testDB["E2E_DB"]}, 20)
		if err != nil {
			return StepOut{}, err
		}
		return bunTest(r.Out+r.Err, r.Code), nil
	}}
}

// ── static checks ──

var (
	registeredRe = regexp.MustCompile(`'(\d{4}_[\w-]+\.sql)':`)
	migNameRe    = regexp.MustCompile(`^\d{4}_[a-z0-9_]+\.sql$`)
	lastImportRe = regexp.MustCompile(`(?m)^import m\d{4} from '\.\./migrations/.+$`)
	registryRe   = regexp.MustCompile(`(const MIGRATIONS: Record<string, string> = \{[^}]*?)\s*\}`)
	newNameRe    = regexp.MustCompile(`^[a-z0-9_]+$`)
)

func sqlFiles() ([]string, error) {
	es, err := os.ReadDir(migrations())
	if err != nil {
		return nil, err
	}
	out := []string{}
	for _, e := range es {
		if strings.HasSuffix(e.Name(), ".sql") {
			out = append(out, e.Name())
		}
	}
	sort.Strings(out)
	return out, nil
}

func migrationProblems() ([]string, error) {
	fs, err := sqlFiles()
	if err != nil {
		return nil, err
	}
	db, err := os.ReadFile(dbTs())
	if err != nil {
		return nil, err
	}
	registered := []string{}
	for _, m := range registeredRe.FindAllStringSubmatch(string(db), -1) {
		registered = append(registered, m[1])
	}
	out := []string{}
	seen := map[string]string{}
	for _, f := range fs {
		if !migNameRe.MatchString(f) {
			out = append(out, "bad name "+f)
		}
		n := f[:min(4, len(f))]
		if prev, ok := seen[n]; ok {
			out = append(out, fmt.Sprintf("duplicate %s: %s, %s", n, prev, f))
		}
		seen[n] = f
		if !contains(registered, f) {
			out = append(out, "not registered in db.ts: "+f)
		}
	}
	for _, r := range registered {
		if !contains(fs, r) {
			out = append(out, "db.ts registers missing "+r)
		}
	}
	return out, nil
}

// claimMigration creates the next migration file and registers it in db.ts; the only way the loop gets a migration number.
func claimMigration(name string) (string, error) {
	if !newNameRe.MatchString(name) {
		return "", errors.New("migration name: lowercase letters, digits and _ only")
	}
	problems, err := migrationProblems()
	if err != nil {
		return "", err
	}
	if len(problems) > 0 {
		return "", errors.New(strings.Join(problems, "; "))
	}
	fs, _ := sqlFiles()
	top := 0.0
	for _, f := range fs {
		top = math.Max(top, jsNumber(f[:min(4, len(f))]))
	}
	n := fmt.Sprintf("%04s", num(top+1))
	file := fmt.Sprintf("%s_%s.sql", n, name)
	b, err := os.ReadFile(dbTs())
	if err != nil {
		return "", err
	}
	db := string(b)
	all := lastImportRe.FindAllStringIndex(db, -1)
	reg := registryRe.FindStringSubmatchIndex(db)
	if len(all) == 0 || reg == nil {
		return "", errors.New("db.ts layout changed: cannot register the migration")
	}
	at := all[len(all)-1][1]
	db = db[:at] + fmt.Sprintf("\nimport m%s from '../migrations/%s' with { type: 'text' }", n, file) + db[at:]
	reg = registryRe.FindStringSubmatchIndex(db)
	db = db[:reg[0]] + db[reg[2]:reg[3]] + fmt.Sprintf(", '%s': m%s }", file, n) + db[reg[1]:]
	h, err := os.OpenFile(filepath.Join(migrations(), file), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return "", err
	}
	_, err = h.WriteString(fmt.Sprintf("-- %s: what changes and why.\n", file))
	h.Close()
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(dbTs(), []byte(db), 0o644); err != nil {
		return "", err
	}
	return "apps/api/migrations/" + file, nil
}

var mockRe = regexp.MustCompile(`\bmock\(`)

func mockCalls() (int, error) {
	dir := filepath.Join(web(), "src/api")
	es, err := os.ReadDir(dir)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, e := range es {
		f := e.Name()
		if !(strings.HasSuffix(f, ".ts") || strings.HasSuffix(f, ".tsx")) || f == "mock.ts" || strings.Contains(f, ".test.") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, f))
		if err != nil {
			return 0, err
		}
		n += len(mockRe.FindAllIndex(b, -1))
	}
	return n, nil
}

// coverageDone counts docs/reports/_coverage.md rows whose Spec status is `done` (apps/api/scripts/coverage.ts).
func coverageDone(md string) int {
	n := 0
	for _, l := range strings.Split(md, "\n") {
		if c := strings.Split(l, " | "); strings.HasPrefix(l, "| [") && len(c) > 9 && c[9] == "done" {
			n++
		}
	}
	return n
}

func changedSinceMain(paths ...string) []string {
	base := sh([]string{"git", "merge-base", "HEAD", "origin/main"}).Out
	diff := sh(append([]string{"git", "diff", "--name-only", base, "--"}, paths...)).Out
	untracked := sh(append([]string{"git", "ls-files", "--others", "--exclude-standard", "--"}, paths...)).Out
	out := []string{}
	for _, l := range strings.Split(diff+"\n"+untracked, "\n") {
		if l != "" && !contains(out, l) {
			out = append(out, l)
		}
	}
	return out
}

// LOOP_FILES are the loop's own controls: changing one needs `bun loop learn`, which records the file's content hash.
var LOOP_FILES = []string{"tools/loop", ".claude/skills/strategy-loop", ".claude/agents", ".claude/settings.json", "apps/api/scripts/e2e-db.ts", "apps/api/scripts/coverage.ts", ".github/workflows/check.yml"}

func blob(f string) string { return sh([]string{"git", "hash-object", "--", f}).Out }

// baseline reads a baseline measure; a missing one is NaN, so every comparison with it fails, as with undefined in JS.
func baselineOf(s *State, k string) float64 {
	if v, ok := s.Baseline.Get(k); ok {
		return v
	}
	return math.NaN()
}
func baselineStr(s *State, k string) string {
	if v, ok := s.Baseline.Get(k); ok {
		return num(v)
	}
	return "undefined"
}

var foreignRe = regexp.MustCompile(`^\w+ chore\(loop\):`)

func loopDir() string { return filepath.Join(ROOT, "tools/loop") }

var STATIC = []Step{
	{"migrations", func(c *Ctx) (StepOut, error) {
		p, err := migrationProblems()
		if err != nil {
			return StepOut{}, err
		}
		return StepOut{len(p) == 0, strings.Join(p, "; ")}, nil
	}},
	{"mocks", func(c *Ctx) (StepOut, error) {
		n, err := mockCalls()
		if err != nil {
			return StepOut{}, err
		}
		c.metric("mockCalls", float64(n))
		return StepOut{float64(n) <= baselineOf(c.State, "mockCalls"), fmt.Sprintf("%d calls (baseline %s)", n, baselineStr(c.State, "mockCalls"))}, nil
	}},
	{"coverage", func(c *Ctx) (StepOut, error) {
		b, err := os.ReadFile(filepath.Join(ROOT, "docs/reports/_coverage.md"))
		if err != nil {
			return StepOut{}, err
		}
		n := coverageDone(string(b))
		c.metric("accurateZeroDiff", float64(n))
		return StepOut{float64(n) >= baselineOf(c.State, "accurateZeroDiff"), fmt.Sprintf("%d zero-diff (baseline %s)", n, baselineStr(c.State, "accurateZeroDiff"))}, nil
	}},
	// A stop condition (ADR-0050): any change to Accurate captures, reports or _coverage.md goes to the owner.
	{"parity", func(c *Ctx) (StepOut, error) {
		f := changedSinceMain("docs/reports", ":(exclude)docs/reports/architecture")
		if len(f) > 0 {
			return StepOut{false, "changed: " + strings.Join(f[:min(3, len(f))], ", ")}, nil
		}
		return StepOut{true, "reports unchanged"}, nil
	}},
	// State changes only through `bun loop`: STATE.md matches state.json, state.json has no uncommitted edits, every
	// commit that touched it is a `chore(loop):` commit, and each changed loop file is the exact content a
	// `bun loop learn` recorded.
	{"state", func(c *Ctx) (StepOut, error) {
		problems := []string{}
		b, err := os.ReadFile(filepath.Join(LOOP, "STATE.md"))
		if err != nil {
			return StepOut{}, err
		}
		if string(b) != renderState(c.State) {
			problems = append(problems, "STATE.md differs from state.json")
		}
		s := c.State
		if truthy(s.Item) {
			if sh([]string{"git", "status", "--porcelain", "--", "docs/strategy/loop/state.json"}).Out != "" {
				problems = append(problems, "state.json has uncommitted edits")
			}
			base := sh([]string{"git", "merge-base", "HEAD", "origin/main"}).Out
			for _, l := range strings.Split(sh([]string{"git", "log", "--format=%h %s", base + "..HEAD", "--", "docs/strategy/loop/state.json"}).Out, "\n") {
				if l != "" && !foreignRe.MatchString(l) {
					problems = append(problems, "state.json changed outside bun loop: "+l)
					break
				}
			}
			learned := map[string]bool{}
			for _, l := range s.Learnings {
				if l.Item == *s.Item && l.Files != nil {
					for _, f := range l.Files.Keys {
						learned[f+"@"+l.Files.M[f]] = true
					}
				}
			}
			unlearned := []string{}
			for _, f := range changedSinceMain(LOOP_FILES...) {
				h := "deleted"
				if exists(filepath.Join(ROOT, f)) {
					h = blob(f)
				}
				if !learned[f+"@"+h] {
					unlearned = append(unlearned, f)
				}
			}
			if len(unlearned) > 0 {
				problems = append(problems, "loop files changed without bun loop learn: "+strings.Join(unlearned[:min(2, len(unlearned))], ", "))
			}
		}
		return StepOut{len(problems) == 0, strings.Join(problems, "; ")}, nil
	}},
	typecheckApi,
	cmdStep("typecheck-web", []string{"bun", "run", "typecheck"}, web),
	cmdStep("typecheck-loop", []string{"go", "vet", "./..."}, loopDir),
	{"lint-web", func(c *Ctx) (StepOut, error) {
		r, err := execStep(c, "lint-web", []string{"./node_modules/.bin/oxlint", "src", "--format", "json"}, web(), nil, 10)
		if err != nil {
			return StepOut{}, err
		}
		i, j := strings.Index(r.Out, "{"), strings.LastIndex(r.Out, "}")
		if i < 0 || j < i {
			return StepOut{}, errors.New("oxlint printed no JSON")
		}
		var d struct{ Diagnostics []struct{ Severity string } }
		if err := json.Unmarshal([]byte(r.Out[i:j+1]), &d); err != nil {
			return StepOut{}, err
		}
		w := 0
		for _, x := range d.Diagnostics {
			if x.Severity == "warning" {
				w++
			}
		}
		c.metric("oxlintWarnings", float64(w))
		return StepOut{len(d.Diagnostics) == w && float64(w) <= baselineOf(c.State, "oxlintWarnings"),
			fmt.Sprintf("%d warnings (baseline %s), %d errors", w, baselineStr(c.State, "oxlintWarnings"), len(d.Diagnostics)-w)}, nil
	}},
}

var TESTS = []Step{
	testApi("test-api", ""),
	{"test-web", func(c *Ctx) (StepOut, error) {
		r, err := execStep(c, "test-web", []string{"bun", "test"}, web(), nil, 10)
		if err != nil {
			return StepOut{}, err
		}
		return bunTest(r.Out+r.Err, r.Code), nil
	}},
	{"test-loop", func(c *Ctx) (StepOut, error) {
		r, err := execStep(c, "test-loop", []string{"go", "test", "-v", "-count=1", "./..."}, loopDir(), nil, 10)
		if err != nil {
			return StepOut{}, err
		}
		return goTest(r.Out+r.Err, r.Code), nil
	}},
}

// ── e2e stack: fresh local database, seeded login, API + web dev server on free ports, every tools/e2e/*-flows.mjs ──

func busy(port int) bool {
	for _, host := range []string{"127.0.0.1", "::1"} {
		if c, err := net.DialTimeout("tcp", net.JoinHostPort(host, strconv.Itoa(port)), 2*time.Second); err == nil {
			c.Close()
			return true
		}
	}
	return false
}
func freePort(from int) (int, error) {
	for p := from; p < from+50; p++ {
		if !busy(p) {
			return p, nil
		}
	}
	return 0, fmt.Errorf("no free port in %d–%d", from, from+49)
}

func ready(url string, seconds int) bool {
	cl := http.Client{Timeout: 2 * time.Second}
	for i := 0; i < seconds*2; i++ {
		if r, err := cl.Get(url); err == nil {
			r.Body.Close()
			return true
		}
		time.Sleep(500 * time.Millisecond)
	}
	return false
}

func serve(argv []string, cwd, log string, env map[string]string) (*exec.Cmd, error) {
	e := map[string]string{"LOG": log}
	for k, v := range env {
		e[k] = v
	}
	cmd := exec.Command("bash", append([]string{"-c", `exec "$@" >"$LOG" 2>&1`, "serve"}, argv...)...)
	cmd.Dir = cwd
	cmd.Env = withEnv(e)
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	addChild(cmd)
	return cmd, nil
}

func e2e(c *Ctx) (StepOut, error) {
	apiPort, err := freePort(3100)
	if err != nil {
		return StepOut{}, err
	}
	webPort, err := freePort(5180)
	if err != nil {
		return StepOut{}, err
	}
	var procs []*exec.Cmd
	defer func() {
		for _, p := range procs {
			p.Process.Signal(syscall.SIGTERM)
			p.Wait()
			dropChild(p)
		}
	}()
	a, err := serve([]string{"bun", "apps/api/src/main.ts", "--role=all"}, ROOT, filepath.Join(c.Dir, "api.log"), map[string]string{"DATABASE_URL": pg() + "/northline_e2e", "PORT": strconv.Itoa(apiPort)})
	if err != nil {
		return StepOut{}, err
	}
	procs = append(procs, a)
	w, err := serve([]string{"./node_modules/.bin/vite", "--port", strconv.Itoa(webPort), "--strictPort"}, web(), filepath.Join(c.Dir, "web.log"), map[string]string{"API_URL": fmt.Sprintf("http://localhost:%d", apiPort)})
	if err != nil {
		return StepOut{}, err
	}
	procs = append(procs, w)
	if !ready(fmt.Sprintf("http://localhost:%d/api/me", apiPort), 60) {
		return StepOut{false, "API did not start (api.log)"}, nil
	}
	if !ready(fmt.Sprintf("http://localhost:%d/", webPort), 60) {
		return StepOut{false, "web did not start (web.log)"}, nil
	}
	es, err := os.ReadDir(filepath.Join(ROOT, "tools/e2e"))
	if err != nil {
		return StepOut{}, err
	}
	names := []string{}
	for _, e := range es {
		if strings.HasSuffix(e.Name(), "-flows.mjs") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	for _, f := range names {
		file := strings.TrimSuffix(f, ".mjs")
		out := filepath.Join(c.Dir, file)
		if err := os.MkdirAll(out, 0o755); err != nil {
			return StepOut{}, err
		}
		if _, err := execStep(c, file, []string{"node", "tools/e2e/" + f}, ROOT, map[string]string{"E2E_BASE_URL": fmt.Sprintf("http://localhost:%d", webPort), "E2E_EVIDENCE_DIR": out, "E2E_MEDIA": c.Media}, 30); err != nil {
			return StepOut{}, err
		}
		b, err := os.ReadFile(filepath.Join(out, "results.json"))
		if err != nil {
			c.Flows = append(c.Flows, Flow{File: file, Name: f + " crashed", Fail: ptr("no results.json, see " + file + ".log")})
			continue
		}
		var res struct{ Flows []Flow }
		if err := json.Unmarshal(b, &res); err != nil {
			return StepOut{}, err
		}
		for _, r := range res.Flows {
			r.File = file
			c.Flows = append(c.Flows, r)
		}
	}
	g3, g6, pass := 0, 0, 0
	for _, f := range c.Flows {
		if strings.Contains(f.Name, "[G3]") {
			g3++
		}
		if strings.Contains(f.Name, "[G6]") {
			g6++
		}
		if f.Ok {
			pass++
		}
	}
	c.metric("g3Flows", float64(g3))
	c.metric("g6Flows", float64(g6))
	return StepOut{len(c.Flows) > 0 && pass == len(c.Flows), fmt.Sprintf("%d/%d flows", pass, len(c.Flows))}, nil
}

var errLineRe = regexp.MustCompile(`(?i)^(error|\w*Error)\b`)

// lastLine is one line per step: the first error line when it failed, else the tail ("seeded manufaktur { events: … }").
func lastLine(s string) string {
	lines := []string{}
	for _, l := range strings.Split(jsTrim(s), "\n") {
		if l = jsTrim(l); l != "" {
			lines = append(lines, l)
		}
	}
	pick := ""
	found := false
	for _, l := range lines {
		if errLineRe.MatchString(l) {
			pick, found = l, true
			break
		}
	}
	if !found {
		pick = strings.Join(lines[max(0, len(lines)-6):], " ")
	}
	return slice16(spacesRe.ReplaceAllString(pick, " "), 200)
}

func script(name string, argv []string, env func() map[string]string) Step {
	return Step{name, func(c *Ctx) (StepOut, error) {
		r, err := execStep(c, name, argv, ROOT, env(), 10)
		if err != nil {
			return StepOut{}, err
		}
		return StepOut{r.Code == 0, lastLine(r.Out + r.Err)}, nil
	}}
}

var STACK = []Step{
	script("db", []string{"bun", "apps/api/scripts/e2e-db.ts", "reset"}, func() map[string]string { return nil }),
	script("seed", []string{"bun", "apps/api/scripts/seed.ts"}, func() map[string]string {
		return map[string]string{"DATABASE_URL": pg() + "/northline_e2e", "NL_EMAIL": login["NL_EMAIL"], "NL_PASSWORD": login["NL_PASSWORD"]}
	}),
	{"e2e", e2e},
	script("balance", []string{"bun", "apps/api/scripts/e2e-db.ts", "balance"}, func() map[string]string { return nil }),
	testApi("access", "test/access-enforcement.test.ts"),
	// The item's own acceptance command, run after the stack stops; the guard hook cannot see inside `bun loop`.
	{"done-when", func(c *Ctx) (StepOut, error) {
		if c.State.Plan == nil || c.State.Plan.DoneWhen == "" {
			return StepOut{true, "n/a: no plan"}, nil
		}
		cmd := c.State.Plan.DoneWhen
		if blocked("Bash", map[string]any{"command": cmd}) != "" {
			return StepOut{false, "done-when reaches production or secrets: an owner step"}, nil
		}
		r, err := execStep(c, "done-when", []string{"bash", "-c", cmd}, ROOT, nil, 10)
		if err != nil {
			return StepOut{}, err
		}
		if r.Code != 0 {
			return StepOut{false, fmt.Sprintf("exit %d: %s", r.Code, lastLine(r.Out+r.Err))}, nil
		}
		return StepOut{true, cmd}, nil
	}},
}

// runSteps runs steps in parallel (independent checks) or in order, skipping the rest after a failed `db` or `seed`.
func runSteps(steps []Step, c *Ctx, parallel bool) []StepResult {
	one := func(s Step) StepResult {
		t := time.Now()
		r, err := s.Run(c)
		if err != nil {
			r = StepOut{false, strings.Split(err.Error(), "\n")[0]}
		}
		res := StepResult{Name: s.Name, Ok: r.Ok, Note: redact(r.Note), Ms: int(math.Round(float64(time.Since(t).Microseconds()) / 1000))}
		// Logs stay local (gitignored); a failing step keeps its last lines, redacted, in runs.jsonl, which is committed.
		if b, err := os.ReadFile(filepath.Join(c.Dir, s.Name+".log")); !r.Ok && err == nil {
			lines := []string{}
			for _, l := range strings.Split(string(b), "\n") {
				if jsTrim(l) != "" {
					lines = append(lines, l)
				}
			}
			tail := []string{}
			for _, l := range lines[max(0, len(lines)-15):] {
				tail = append(tail, slice16(redact(l), 200))
			}
			res.Tail = tail
		}
		return res
	}
	out := make([]StepResult, len(steps))
	if parallel {
		var wg sync.WaitGroup
		for i, s := range steps {
			wg.Add(1)
			go func() { defer wg.Done(); out[i] = one(s) }()
		}
		wg.Wait()
		return out
	}
	for i, s := range steps {
		if j := slices.IndexFunc(out[:i], func(r StepResult) bool { return !r.Ok && (r.Name == "db" || r.Name == "seed") }); j >= 0 {
			out[i] = StepResult{Name: s.Name, Ok: false, Ms: 0, Note: "skipped: " + out[j].Name + " failed"}
			continue
		}
		out[i] = one(s)
	}
	return out
}

func ctx(dir string, s *State, media string) (*Ctx, error) {
	if media == "" {
		media = "(?!)"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Ctx{Dir: dir, State: s, Media: media, Flows: []Flow{}, Metrics: NewOMap[float64]()}, nil
}

// ── golden cases (evals/golden.md is rendered from this list) ──

type Round struct {
	Steps  map[string]StepResult
	Flows  []Flow
	PrBody *bool
}

func (r Round) ok(names ...string) bool {
	for _, n := range names {
		if s, ok := r.Steps[n]; !ok || !s.Ok {
			return false
		}
	}
	return true
}
func (r Round) tagged(tag string, min float64) bool {
	n := 0
	for _, f := range r.Flows {
		if strings.Contains(f.Name, "["+tag+"]") {
			n++
			if !f.Ok {
				return false
			}
		}
	}
	return float64(n) >= min
}

type Case struct {
	ID, Name, PassWhen, Steps, Source string
	Judge                             func(r Round, s *State) *bool
}

func b(v bool) *bool { return &v }

var CASES = []Case{
	{"G1", "Migrations apply from empty", "Every migration file is registered once in `db.ts` under a unique number; a fresh database migrates and seeds", "`migrations`, `db`, `seed`", "N1: two agents took 0064",
		func(r Round, s *State) *bool { return b(r.ok("migrations", "db", "seed")) }},
	{"G2", "Typecheck and lint", "`tsc` clean in api (with `tsconfig.types.json`) and web, `go vet` clean in `tools/loop`; oxlint 0 errors, warnings ≤ `oxlintWarnings`", "`typecheck-api`, `typecheck-web`, `typecheck-loop`, `lint-web`", "N1: TS2589 in `app.ts`",
		func(r Round, s *State) *bool {
			return b(r.ok("typecheck-api", "typecheck-web", "typecheck-loop", "lint-web"))
		}},
	{"G3", "Round trip, no silent loss", "Every e2e flow tagged `[G3]` passes (save, reload, every field equal; or the field is disabled and the API answers 409) and there are ≥ `g3Flows` of them", "`e2e`", "N1: 3 of 4 slices dropped fields",
		func(r Round, s *State) *bool { return b(r.tagged("G3", baselineOf(s, "g3Flows"))) }},
	{"G4", "Accurate parity", "`_coverage.md` zero-diff count ≥ `accurateZeroDiff`, and nothing under `docs/reports/` except `architecture/` changed since `origin/main`", "`coverage`, `parity`", "Strategy scorecard; stop condition",
		func(r Round, s *State) *bool { return b(r.ok("coverage", "parity")) }},
	{"G5", "Privilege matrix", "`access-enforcement.test.ts` passes (each route reaches its handler with its privilege and answers 403 without it) and the seeded login opens every route (`route …` flows)", "`access`, `e2e`", "N1: seed login had no privileges",
		func(r Round, s *State) *bool {
			any, all := false, true
			for _, f := range r.Flows {
				route := strings.HasPrefix(f.Name, "route ")
				any = any || route
				if (route || f.Name == "sign in") && !f.Ok {
					all = false
				}
			}
			return b(r.ok("access") && any && all)
		}},
	{"G6", "Real data in pickers", "Every flow tagged `[G6]` passes (it saves a document with picker options the seeded API returned) and there are ≥ `g6Flows` of them", "`e2e`", "N1: pickers listed fixture names",
		func(r Round, s *State) *bool { return b(r.tagged("G6", baselineOf(s, "g6Flows"))) }},
	{"G7", "Mocks only go down", "`mock(` calls in `apps/web/src/api` ≤ `mockCalls`", "`mocks`", "Strategy scorecard",
		func(r Round, s *State) *bool { return b(r.ok("mocks")) }},
	{"G8", "Books balance", "After the e2e run, debits = credits in every month of `journal_lines`", "`balance`", "ERP invariant",
		func(r Round, s *State) *bool { return b(r.ok("balance")) }},
	{"G9", "Full test suites", "`bun test` in api (on the loop's own database) and web, `go test` in `tools/loop`: 0 failures", "`test-api`, `test-web`, `test-loop`", "Baseline",
		func(r Round, s *State) *bool { return b(r.ok("test-api", "test-web", "test-loop")) }},
	{"G10", "PR body survives the gate", "The PR body holds the current loop section between the markers; n/a before the PR exists", "`pr-body`", "N1: no-mistakes overwrote the body",
		func(r Round, s *State) *bool { return r.PrBody }},
	{"G11", "The item's done-when", "The plan's done-when command exits 0 (and does not reach production); n/a without a plan", "`done-when`", "Review round 2: done-when was never run",
		func(r Round, s *State) *bool {
			if s.Plan == nil || s.Plan.DoneWhen == "" {
				return nil
			}
			return b(r.ok("done-when"))
		}},
	{"G12", "Promised flows exist", "Every flow name in the plan's `evalCases` is an e2e flow that ran and passed; n/a when the plan promises none", "`e2e`", "Review round 3: promised flows were never checked",
		func(r Round, s *State) *bool {
			if s.Plan == nil || len(s.Plan.EvalCases) == 0 {
				return nil
			}
			for _, name := range s.Plan.EvalCases {
				if !slices.ContainsFunc(r.Flows, func(f Flow) bool { return f.Name == name && f.Ok }) {
					return b(false)
				}
			}
			return b(true)
		}},
}

func judge(r Round, s *State) *OMap[*bool] {
	out := NewOMap[*bool]()
	for _, k := range CASES {
		out.Set(k.ID, k.Judge(r, s))
	}
	return out
}

func renderGolden() string {
	L := []string{
		"# Golden evals",
		"",
		"Rendered from `CASES` in `tools/loop/checks.go` by `bun loop render`; edit the code, not this file. `bun loop evals`",
		"runs the static steps once and the tests and e2e stack twice, each on a fresh local database; a case passes only",
		"when both runs pass (pass^2). Baselines live in `docs/strategy/loop/state.json` and move only through",
		"`bun loop baseline`, which ratchets them in the improving direction. Logs, screenshots and videos land in",
		"`docs/strategy/loop/evidence/<item>/`.",
		"",
		"| # | Case | Pass when | Steps | Source |",
		"|---|---|---|---|---|",
	}
	for _, k := range CASES {
		L = append(L, fmt.Sprintf("| %s | %s | %s | %s | %s |", k.ID, k.Name, strings.ReplaceAll(k.PassWhen, "|", `\|`), k.Steps, k.Source))
	}
	L = append(L,
		"",
		"## Adding a case",
		"",
		"New G-cases come only from a failure that got past this set or the gate; `bun loop learn --check <case>` records",
		"the change and refuses one without an existing case or step. Flows for an item's forms and pickers are not new",
		"cases: tag them `[G3]` / `[G6]` and run `bun loop baseline` to raise the counts. Past 15 cases, merge the ones that",
		"check the same thing.",
		"",
	)
	return strings.Join(L, "\n")
}
