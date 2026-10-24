// Loop state, plan changelog and evidence records (ADR-0050). state.json is the only source of truth: STATE.md,
// CHANGELOG.md entries and evidence/<item>/README.md are rendered from it and from runs.jsonl, never edited by hand.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf16"
)

var (
	ROOT string
	LOOP string
)

// setupPaths: LOOP_ROOT, else the checkout the command runs in.
func setupPaths() {
	ROOT = os.Getenv("LOOP_ROOT")
	if ROOT == "" {
		if out, err := exec.Command("git", "rev-parse", "--show-toplevel").Output(); err == nil {
			ROOT = strings.TrimSpace(string(out))
		} else {
			ROOT, _ = os.Getwd()
		}
	}
	ROOT, _ = filepath.Abs(ROOT)
	LOOP = filepath.Join(ROOT, "docs/strategy/loop")
}

// The architecture pass runs before the gate, so no-mistakes and CodeRabbit review the final diff once.
var STAGES = []string{"plan", "build", "verify", "arch", "gate", "retro", "done"}

type Slice struct {
	ID     string   `json:"id"`
	Title  string   `json:"title"`
	Files  []string `json:"files"`
	Status string   `json:"status"`
}
type Plan struct {
	Version    int      `json:"version"`
	Title      string   `json:"title"`
	DoneWhen   string   `json:"doneWhen"`
	Slices     []Slice  `json:"slices"`
	EvalCases  []string `json:"evalCases"`
	OwnerSteps []string `json:"ownerSteps"`
}
type Item struct {
	ID         string `json:"id"`
	Status     string `json:"status"`
	PR         *int   `json:"pr"`
	Evals      string `json:"evals"`
	Coderabbit string `json:"coderabbit"`
	Notes      string `json:"notes"`
}
type Phase0 struct {
	ID   string `json:"id"`
	Text string `json:"text"`
	Done bool   `json:"done"`
}
type Arch struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
	Ref    string `json:"ref"`
}

// Files: blob hash of each loop file the change covers, so a later edit to the same file needs its own `learn`.
type Learning struct {
	Item  string        `json:"item"`
	Check string        `json:"check"`
	Text  string        `json:"text"`
	Files *OMap[string] `json:"files,omitzero"`
}
type State struct {
	Item        *string        `json:"item"`
	Stage       *string        `json:"stage"`
	Branch      *string        `json:"branch"`
	PR          *int           `json:"pr"`
	StartedAt   *string        `json:"startedAt"`
	BudgetHours float64        `json:"budgetHours"`
	NM          *string        `json:"nm"`
	NMSha       *string        `json:"nmSha"`    // the code commit no-mistakes last passed; the gate exit wants it to be the current one
	PushedAt    *string        `json:"pushedAt"` // when no-mistakes last pushed; a CodeRabbit limit notice older than this is stale
	Baseline    *OMap[float64] `json:"baseline"`
	Phase0      []Phase0       `json:"phase0"`
	Items       []Item         `json:"items"`
	Plan        *Plan          `json:"plan"`
	Arch        []Arch         `json:"arch"`
	Learnings   []Learning     `json:"learnings"`
	// The done stage pushed the retro and final state; the guard stands down. Last: init adds it to an existing state.
	Published *bool `json:"published,omitzero"`
}
type StepResult struct {
	Name string   `json:"name"`
	Ok   bool     `json:"ok"`
	Note string   `json:"note"`
	Ms   int      `json:"ms"`
	Tail []string `json:"tail,omitzero"`
}
type Flow struct {
	File  string  `json:"file"`
	Name  string  `json:"name"`
	Ok    bool    `json:"ok"`
	Fail  *string `json:"fail"`
	Shot  string  `json:"shot,omitzero"`
	Video string  `json:"video,omitzero"`
}
type Run struct {
	ID      string         `json:"id"`
	Item    string         `json:"item"`
	Stage   string         `json:"stage"`
	Kind    string         `json:"kind"`
	Plan    *int           `json:"plan,omitzero"` // plan version the run was judged under
	Sha     string         `json:"sha"`
	Ok      bool           `json:"ok"`
	Ms      int            `json:"ms"`
	Steps   []StepResult   `json:"steps"`
	Cases   *OMap[[]*bool] `json:"cases,omitzero"`
	Metrics *OMap[float64] `json:"metrics,omitzero"`
	Flows   []Flow         `json:"flows,omitzero"`
}

// Stop: exit 3, a stop condition from the skill; the agent asks the owner.
type Stop struct{ msg string }

func (e Stop) Error() string         { return e.msg }
func stopf(f string, a ...any) error { return Stop{fmt.Sprintf(f, a...)} }

// ── JSON with JavaScript's object key order and no HTML escaping ──

type OMap[V any] struct {
	Keys []string
	M    map[string]V
}

func NewOMap[V any]() *OMap[V] { return &OMap[V]{M: map[string]V{}} }
func (o *OMap[V]) Get(k string) (V, bool) {
	if o == nil {
		var z V
		return z, false
	}
	v, ok := o.M[k]
	return v, ok
}
func (o *OMap[V]) Set(k string, v V) {
	if _, ok := o.M[k]; !ok {
		o.Keys = append(o.Keys, k)
	}
	o.M[k] = v
}
func (o *OMap[V]) Len() int {
	if o == nil {
		return 0
	}
	return len(o.Keys)
}
func (o OMap[V]) MarshalJSON() ([]byte, error) {
	var b bytes.Buffer
	b.WriteByte('{')
	for i, k := range o.Keys {
		if i > 0 {
			b.WriteByte(',')
		}
		kb, _ := marshal(k)
		vb, err := marshal(o.M[k])
		if err != nil {
			return nil, err
		}
		b.Write(kb)
		b.WriteByte(':')
		b.Write(vb)
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}
func (o *OMap[V]) UnmarshalJSON(data []byte) error {
	o.Keys, o.M = nil, map[string]V{}
	d := json.NewDecoder(bytes.NewReader(data))
	t, err := d.Token()
	if err != nil {
		return err
	}
	if t != json.Delim('{') {
		return fmt.Errorf("expected an object")
	}
	for d.More() {
		t, err := d.Token()
		if err != nil {
			return err
		}
		var v V
		if err := d.Decode(&v); err != nil {
			return err
		}
		o.Set(t.(string), v)
	}
	return nil
}

// marshal is JSON.stringify(v): compact, no HTML escaping, no trailing newline.
func marshal(v any) ([]byte, error) {
	var b bytes.Buffer
	e := json.NewEncoder(&b)
	e.SetEscapeHTML(false)
	if err := e.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(b.Bytes(), []byte("\n")), nil
}

// ── processes ──

type ShResult struct {
	Ok       bool
	Out, Err string
}

func sh(cmd []string, opts ...any) ShResult {
	cwd := ROOT
	var env map[string]string
	for _, o := range opts {
		switch v := o.(type) {
		case string:
			cwd = v
		case map[string]string:
			env = v
		}
	}
	c := exec.Command(cmd[0], cmd[1:]...)
	c.Dir = cwd
	c.Env = withEnv(env)
	var out, errb bytes.Buffer
	c.Stdout, c.Stderr = &out, &errb
	err := c.Run()
	e := jsTrim(errb.String())
	if err != nil && e == "" {
		if _, ok := err.(*exec.ExitError); !ok {
			e = err.Error()
		}
	}
	return ShResult{err == nil, jsTrim(out.String()), e}
}

func withEnv(env map[string]string) []string {
	out := os.Environ()
	for k, v := range env {
		out = append(out, k+"="+v)
	}
	return out
}

func branch() string { return sh([]string{"git", "rev-parse", "--abbrev-ref", "HEAD"}).Out }

var outsideLoop = []string{"--", ".", ":(exclude)docs/strategy/loop"}

// codeSha: the commit runs are judged against, the last commit outside docs/strategy/loop, "+dirty" with uncommitted code.
func codeSha() string {
	sha := sh(append([]string{"git", "log", "-1", "--format=%h"}, outsideLoop...)).Out
	if sh(append([]string{"git", "status", "--porcelain"}, outsideLoop...)).Out != "" {
		return sha + "+dirty"
	}
	return sha
}

func statePath() string { return filepath.Join(LOOP, "state.json") }
func load() (*State, error) {
	b, err := os.ReadFile(statePath())
	if err != nil {
		return nil, err
	}
	var s State
	if err := json.Unmarshal(b, &s); err != nil {
		return nil, err
	}
	s.normalize()
	return &s, nil
}
func (s *State) normalize() {
	if s.Baseline == nil {
		s.Baseline = NewOMap[float64]()
	}
	for _, p := range []*[]Phase0{&s.Phase0} {
		if *p == nil {
			*p = []Phase0{}
		}
	}
	if s.Items == nil {
		s.Items = []Item{}
	}
	if s.Arch == nil {
		s.Arch = []Arch{}
	}
	if s.Learnings == nil {
		s.Learnings = []Learning{}
	}
}

// writeAtomic writes a whole file or nothing: a temp file in the same dir, then a rename.
func writeAtomic(f, body string) error {
	tmp := fmt.Sprintf("%s.%d.tmp", f, os.Getpid())
	if err := os.WriteFile(tmp, []byte(body), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, f)
}
func save(s *State) error {
	var b bytes.Buffer
	e := json.NewEncoder(&b)
	e.SetEscapeHTML(false)
	e.SetIndent("", "  ")
	if err := e.Encode(s); err != nil {
		return err
	}
	if err := writeAtomic(statePath(), b.String()); err != nil {
		return err
	}
	return writeAtomic(filepath.Join(LOOP, "STATE.md"), renderState(s))
}

// ── JavaScript-compatible formatting ──

func row(c ...string) string { return "| " + strings.Join(c, " | ") + " |" }
func rule(n int) string {
	c := make([]string, n)
	for i := range c {
		c[i] = "---"
	}
	return row(c...)
}

// num is String(n) for a JavaScript number.
func num(f float64) string {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	}
	if f == 0 {
		return "0"
	}
	return strconv.FormatFloat(f, 'f', -1, 64)
}

// jsNumber is Number(s) for the strings the loop parses.
func jsNumber(s string) float64 {
	s = jsTrim(s)
	if s == "" {
		return 0
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return math.NaN()
	}
	return f
}

// toFixed is Number.prototype.toFixed: the exact binary value, ties rounded up.
func toFixed(x float64, d int) string {
	neg := x < 0
	if neg {
		x = -x
	}
	s := strconv.FormatFloat(x, 'f', d+40, 64)
	dot := strings.IndexByte(s, '.')
	keep := []byte(s[:dot] + s[dot+1:dot+1+d])
	if s[dot+1+d] >= '5' {
		i := len(keep) - 1
		for ; i >= 0; i-- {
			if keep[i] == '9' {
				keep[i] = '0'
				continue
			}
			keep[i]++
			break
		}
		if i < 0 {
			keep = append([]byte{'1'}, keep...)
		}
	}
	ip := string(keep[:len(keep)-d])
	out := ip
	if d > 0 {
		out += "." + string(keep[len(keep)-d:])
	}
	if neg && strings.Trim(out, "0.") != "" {
		out = "-" + out
	}
	return out
}

func jsTrim(s string) string { return strings.TrimFunc(s, unicode.IsSpace) }

// slice16 is s.slice(0, n) on JavaScript's UTF-16 units.
func slice16(s string, n int) string {
	u := utf16.Encode([]rune(s))
	if len(u) <= n {
		return s
	}
	return string(utf16.Decode(u[:n]))
}
func len16(s string) int { return len(utf16.Encode([]rune(s))) }

func padEnd(s string, n int) string {
	if l := len16(s); l < n {
		return s + strings.Repeat(" ", n-l)
	}
	return s
}
func padStart(s string, n int) string {
	if l := len16(s); l < n {
		return strings.Repeat(" ", n-l) + s
	}
	return s
}

func str(p *string) string { // `${x}` for a nullable string
	if p == nil {
		return "null"
	}
	return *p
}
func strOr(p *string, d string) string { // x ?? d
	if p == nil {
		return d
	}
	return *p
}
func truthy(p *string) bool { return p != nil && *p != "" }
func ptr[T any](v T) *T     { return &v }
func isoNow() string        { return time.Now().UTC().Format("2006-01-02T15:04:05.000Z") }
func jsDate(s string) (time.Time, bool) {
	t, err := time.Parse(time.RFC3339Nano, s)
	return t, err == nil
}

func renderState(s *State) string {
	p := s.Plan
	now := "No item in progress. Next: `bun loop start`."
	if truthy(s.Item) {
		pr := "–"
		if s.PR != nil && *s.PR != 0 {
			pr = fmt.Sprintf("#%d", *s.PR)
		}
		nm := "–"
		if truthy(s.NM) {
			nm = fmt.Sprintf("%s on `%s`", *s.NM, str(s.NMSha))
		}
		now = fmt.Sprintf("%s · stage **%s** · branch `%s` · PR %s · no-mistakes %s · started %s, budget %s h",
			*s.Item, str(s.Stage), str(s.Branch), pr, nm, strOr(s.StartedAt, "–"), num(s.BudgetHours))
	}
	L := []string{
		"# Strategy loop state",
		"",
		"Rendered from [state.json](state.json) by `bun loop` ([ADR-0050](../../decisions/0050-strategy-loop.md)); do not edit",
		"by hand. Plan and loop changes: [CHANGELOG.md](CHANGELOG.md). Verification runs: `evidence/<item>/README.md`.",
		"",
		"## Now",
		"",
		now,
		"",
		"## Phase 0",
		"",
	}
	for _, x := range s.Phase0 {
		mark := " "
		if x.Done {
			mark = "x"
		}
		L = append(L, fmt.Sprintf("- [%s] %s: %s", mark, x.ID, x.Text))
	}
	L = append(L, "", "## Baseline", "", row("Measure", "Value"), rule(2))
	for _, k := range s.Baseline.Keys {
		L = append(L, row("`"+k+"`", num(s.Baseline.M[k])))
	}
	L = append(L, "", "## Items", "", row("Item", "Status", "PR", "Evals", "CodeRabbit", "Notes"), rule(6))
	for _, i := range s.Items {
		pr := ""
		if i.PR != nil && *i.PR != 0 {
			pr = fmt.Sprintf("#%d", *i.PR)
		}
		L = append(L, row(i.ID, i.Status, pr, i.Evals, i.Coderabbit, i.Notes))
	}
	L = append(L, "", "## Plan", "")
	if p != nil {
		L = append(L, fmt.Sprintf("v%d · %s", p.Version, p.Title), "", fmt.Sprintf("Done when: `%s`", p.DoneWhen), "")
		for _, x := range p.Slices {
			mark := " "
			if x.Status == "done" {
				mark = "x"
			}
			L = append(L, fmt.Sprintf("- [%s] %s %s (%s)", mark, x.ID, x.Title, strings.Join(x.Files, ", ")))
		}
		L = append(L, "", "Eval flows promised: "+orNone(strings.Join(p.EvalCases, ", ")), "",
			"Owner steps (the loop never runs these): "+orNone(strings.Join(p.OwnerSteps, "; ")))
	} else {
		L = append(L, "(none)")
	}
	L = append(L, "", "## Architecture suggestions", "")
	if len(s.Arch) > 0 {
		for _, a := range s.Arch {
			L = append(L, fmt.Sprintf("- %s [%s] %s%s", a.ID, a.Status, a.Title, paren(a.Ref)))
		}
	} else {
		L = append(L, "(none)")
	}
	L = append(L, "", "## Learnings", "")
	if len(s.Learnings) > 0 {
		for _, l := range s.Learnings {
			L = append(L, fmt.Sprintf("- %s (%s): %s", l.Item, l.Check, l.Text))
		}
	} else {
		L = append(L, "(none)")
	}
	L = append(L, "")
	return strings.Join(L, "\n")
}

func orNone(s string) string {
	if s == "" {
		return "none"
	}
	return s
}
func paren(s string) string {
	if s == "" {
		return ""
	}
	return " (" + s + ")"
}

// planDiff lists structural plan changes, one line each. Slice status is progress, not a plan change, so it is left out.
func planDiff(a *Plan, b Plan) []string {
	if a == nil {
		return []string{fmt.Sprintf("new plan: %d slices, done when `%s`", len(b.Slices), b.DoneWhen)}
	}
	out := []string{}
	if a.Title != b.Title {
		out = append(out, fmt.Sprintf("title: %s → %s", a.Title, b.Title))
	}
	// ⚠ marks a moved goalpost; the PR body repeats those lines for the owner.
	if a.DoneWhen != b.DoneWhen {
		out = append(out, fmt.Sprintf("⚠ done when: `%s` → `%s`", a.DoneWhen, b.DoneWhen))
	}
	old := map[string]Slice{}
	for _, x := range a.Slices {
		old[x.ID] = x
	}
	ids := map[string]bool{}
	for _, x := range b.Slices {
		ids[x.ID] = true
	}
	for _, x := range b.Slices {
		o, ok := old[x.ID]
		if !ok {
			out = append(out, fmt.Sprintf("added %s \"%s\" (%s)", x.ID, x.Title, strings.Join(x.Files, ", ")))
			continue
		}
		if o.Title != x.Title {
			out = append(out, fmt.Sprintf("%s title: \"%s\" → \"%s\"", x.ID, o.Title, x.Title))
		}
		if strings.Join(o.Files, ",") != strings.Join(x.Files, ",") {
			out = append(out, fmt.Sprintf("%s files: %s → %s", x.ID, strings.Join(o.Files, ", "), strings.Join(x.Files, ", ")))
		}
	}
	for _, o := range a.Slices {
		if !ids[o.ID] {
			was := ""
			if o.Status == "done" {
				was = " (was done)"
			}
			out = append(out, fmt.Sprintf("removed %s \"%s\"%s", o.ID, o.Title, was))
		}
	}
	kept := func(sl []Slice) string {
		k := []string{}
		for _, x := range sl {
			if _, ok := old[x.ID]; ok && ids[x.ID] {
				k = append(k, x.ID)
			}
		}
		return strings.Join(k, ", ")
	}
	if kept(a.Slices) != kept(b.Slices) {
		out = append(out, fmt.Sprintf("order: %s → %s", kept(a.Slices), kept(b.Slices)))
	}
	dropped := false
	for _, e := range a.EvalCases {
		if !contains(b.EvalCases, e) {
			dropped = true
		}
	}
	if strings.Join(a.EvalCases, ",") != strings.Join(b.EvalCases, ",") {
		w := ""
		if dropped {
			w = "⚠ "
		}
		out = append(out, fmt.Sprintf("%seval flows: %s → %s", w, orNone(strings.Join(a.EvalCases, ", ")), orNone(strings.Join(b.EvalCases, ", "))))
	}
	if strings.Join(a.OwnerSteps, ",") != strings.Join(b.OwnerSteps, ",") {
		out = append(out, fmt.Sprintf("owner steps: %s → %s", orNone(strings.Join(a.OwnerSteps, "; ")), orNone(strings.Join(b.OwnerSteps, "; "))))
	}
	return out
}

func contains(xs []string, x string) bool {
	for _, y := range xs {
		if y == x {
			return true
		}
	}
	return false
}

func now() string { return time.Now().UTC().Format("2006-01-02 15:04") + "Z" }

func changelog(title string, lines []string) error {
	f := filepath.Join(LOOP, "CHANGELOG.md")
	if _, err := os.Stat(f); err != nil {
		if err := os.WriteFile(f, []byte("# Loop changelog\n\nAppended by `bun loop` on every plan change and every change to the loop itself. Oldest first.\n"), 0o644); err != nil {
			return err
		}
	}
	b := make([]string, len(lines))
	for i, l := range lines {
		b[i] = "- " + l
	}
	return appendFile(f, fmt.Sprintf("\n## %s\n\n%s\n", title, strings.Join(b, "\n")))
}

func appendFile(f, s string) error {
	h, err := os.OpenFile(f, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer h.Close()
	_, err = h.WriteString(s)
	return err
}

func exists(f string) bool { _, err := os.Stat(f); return err == nil }

// ── evidence ──

func evidenceDir(item string) string { return filepath.Join(LOOP, "evidence", item) }
func runDir(item, id string) string  { return filepath.Join(evidenceDir(item), "runs", id) }
func newRunID(kind string) string    { return time.Now().UTC().Format("20060102T150405") + "-" + kind }

func runs(item string) []*Run {
	b, err := os.ReadFile(filepath.Join(evidenceDir(item), "runs.jsonl"))
	if err != nil {
		return nil
	}
	out := []*Run{}
	// A line torn by an interrupted append is skipped, not fatal: the runs around it still count.
	for _, l := range strings.Split(string(b), "\n") {
		if l == "" {
			continue
		}
		var r Run
		if json.Unmarshal([]byte(l), &r) == nil {
			out = append(out, &r)
		}
	}
	return out
}

func findLast(all []*Run, f func(*Run) bool) *Run {
	for i := len(all) - 1; i >= 0; i-- {
		if f(all[i]) {
			return all[i]
		}
	}
	return nil
}

func record(run *Run) error {
	dir := evidenceDir(run.Item)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	// A torn last line (an interrupted append) gets its newline first, so this record stays whole on a line of its own.
	ledger := filepath.Join(dir, "runs.jsonl")
	b, _ := os.ReadFile(ledger)
	torn := len(b) > 0 && b[len(b)-1] != '\n'
	j, err := marshal(run)
	if err != nil {
		return err
	}
	pre := ""
	if torn {
		pre = "\n"
	}
	if err := appendFile(ledger, pre+string(j)+"\n"); err != nil {
		return err
	}
	// Bounded evidence: the latest run of each kind and the latest passing one (the last known good) keep logs and
	// media, older failing runs keep their logs, older passing runs keep only their runs.jsonl line.
	all := runs(run.Item)
	for _, r := range all {
		if r == findLast(all, func(x *Run) bool { return x.Kind == r.Kind }) || r == findLast(all, func(x *Run) bool { return x.Kind == r.Kind && x.Ok }) {
			continue
		}
		if r.Ok {
			os.RemoveAll(runDir(run.Item, r.ID))
		} else {
			dropMedia(runDir(run.Item, r.ID))
		}
	}
	return os.WriteFile(filepath.Join(dir, "README.md"), []byte(renderEvidence(run.Item, all)), 0o644)
}

func dropMedia(dir string) {
	es, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range es {
		if !e.IsDir() {
			continue
		}
		if e.Name() == "shots" || e.Name() == "videos" {
			os.RemoveAll(filepath.Join(dir, e.Name()))
		} else {
			dropMedia(filepath.Join(dir, e.Name()))
		}
	}
}

func secs(ms int) string {
	if ms >= 60_000 {
		return fmt.Sprintf("%dm%ss", ms/60_000, num(math.Floor(float64(ms%60_000)/1000+0.5)))
	}
	return toFixed(float64(ms)/1000, 1) + "s"
}
func mark(v *bool) string {
	if v == nil {
		return "n/a"
	}
	if *v {
		return "pass"
	}
	return "FAIL"
}

var runRound = regexp.MustCompile(`^run-\d+`)

func renderEvidence(item string, all []*Run) string {
	L := []string{
		"# " + item + " verification evidence",
		"",
		"Rendered by `bun loop` from [runs.jsonl](runs.jsonl), oldest first. In git: this page, runs.jsonl, results.json and",
		"screenshots. Local only (gitignored): full logs and videos. The latest run of each kind keeps its files; older",
		"failing runs keep their logs; failing steps keep their last lines below.",
		"",
		row("Run", "Stage", "Kind", "Code", "Result", "Time", "Steps"),
		rule(7),
	}
	for _, r := range all {
		name := r.ID
		if exists(runDir(item, r.ID)) {
			name = fmt.Sprintf("[%s](runs/%s/)", r.ID, r.ID)
		}
		res := "**FAIL**"
		if r.Ok {
			res = "pass"
		}
		var steps string
		if r.Cases != nil {
			n := 0
			for _, s := range r.Steps {
				if s.Ok {
					n++
				}
			}
			steps = fmt.Sprintf("%d/%d ok", n, len(r.Steps))
		} else {
			p := make([]string, len(r.Steps))
			for i, s := range r.Steps {
				m := "✗"
				if s.Ok {
					m = "✓"
				}
				p[i] = s.Name + " " + m
			}
			steps = strings.Join(p, " · ")
		}
		L = append(L, row(name, r.Stage, r.Kind, "`"+r.Sha+"`", res, secs(r.Ms), steps))
	}
	if ev := findLast(all, func(r *Run) bool { return r.Cases != nil }); ev != nil {
		g1 := ev.Cases.M["G1"]
		head := []string{"Case"}
		for i := range g1 {
			head = append(head, fmt.Sprintf("Run %d", i+1))
		}
		L = append(L, "", fmt.Sprintf("## Golden evals: %s on `%s`", ev.ID, ev.Sha), "", row(append(head, "pass^k")...), rule(len(g1)+2))
		for _, id := range ev.Cases.Keys {
			v := ev.Cases.M[id]
			c := []string{id}
			allNull, noFalse := true, true
			for _, x := range v {
				c = append(c, mark(x))
				if x != nil {
					allNull = false
					if !*x {
						noFalse = false
					}
				}
			}
			k := "✗"
			if allNull {
				k = "n/a"
			} else if noFalse {
				k = "✓"
			}
			L = append(L, row(append(c, k)...))
		}
	}
	tails := []string{}
	for _, r := range all {
		for _, s := range r.Steps {
			if len(s.Tail) > 0 {
				tails = append(tails, "", fmt.Sprintf("%s · %s · %s", r.ID, s.Name, s.Note), "", "```")
				tails = append(tails, s.Tail...)
				tails = append(tails, "```")
			}
		}
	}
	if len(tails) > 0 {
		L = append(L, "", "## Failing steps (last lines of each log)")
		L = append(L, tails...)
	}
	if fl := findLast(all, func(r *Run) bool { return len(r.Flows) > 0 }); fl != nil {
		var failed, media []Flow
		keys := []string{}
		groups := map[string][]Flow{}
		for _, f := range fl.Flows {
			if !f.Ok {
				failed = append(failed, f)
			}
			if f.Shot != "" || f.Video != "" {
				media = append(media, f)
			}
			k := runRound.FindString(f.File)
			if k == "" {
				k = "run"
			}
			if _, ok := groups[k]; !ok {
				keys = append(keys, k)
			}
			groups[k] = append(groups[k], f)
		}
		at := func(f Flow, p string) string { return fmt.Sprintf("runs/%s/%s/%s", fl.ID, f.File, p) }
		rs := []string{}
		for _, k := range keys {
			n := 0
			for _, f := range groups[k] {
				if f.Ok {
					n++
				}
			}
			rs = append(rs, fmt.Sprintf("%s %d/%d", k, n, len(groups[k])))
		}
		fails := "No failures."
		if len(failed) > 0 {
			p := make([]string, len(failed))
			for i, f := range failed {
				p[i] = fmt.Sprintf("- FAIL %s %s: %s", strings.Split(f.File, "/")[0], f.Name, str(f.Fail))
			}
			fails = strings.Join(p, "\n")
		}
		L = append(L, "", fmt.Sprintf("## Latest e2e: %s on `%s` (%s flows pass)", fl.ID, fl.Sha, strings.Join(rs, ", ")), "", fails)
		if len(media) > 0 {
			L = append(L, "", row("Flow", "Result", "Screenshot", "Video"), rule(4))
			for _, f := range media {
				res := "FAIL"
				if f.Ok {
					res = "pass"
				}
				shot, video := "", ""
				if f.Shot != "" {
					shot = fmt.Sprintf(`<img src="%s" width="320">`, at(f, f.Shot))
				}
				// Videos are gitignored, so they are named, not linked: a link would 404 on GitHub.
				if f.Video != "" {
					video = fmt.Sprintf("local: `%s`", at(f, f.Video))
				}
				L = append(L, row(strings.ReplaceAll(f.Name, "|", `\|`), res, shot, video))
			}
		}
	}
	return strings.Join(L, "\n") + "\n"
}
