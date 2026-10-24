package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"
)

func testPlan(over func(p *Plan)) Plan {
	p := Plan{
		Version:  1,
		Title:    "feat(ops): N2 backups",
		DoneWhen: "bun run drill",
		Slices: []Slice{
			{ID: "S1", Title: "dump workflow", Files: []string{".github/workflows/backup.yml"}, Status: "done"},
			{ID: "S2", Title: "restore drill", Files: []string{"tools/drill.ts"}, Status: "todo"},
		},
		EvalCases:  []string{"[G3] backup settings round trip"},
		OwnerSteps: []string{},
	}
	if over != nil {
		over(&p)
	}
	return p
}

func eq(t *testing.T, got, want any) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got  %#v\nwant %#v", got, want)
	}
}

func TestPlanDiff(t *testing.T) {
	t.Run("a first plan is one line", func(t *testing.T) {
		eq(t, planDiff(nil, testPlan(nil)), []string{"new plan: 2 slices, done when `bun run drill`"})
	})
	t.Run("structural changes are listed; moved goalposts are marked", func(t *testing.T) {
		old := testPlan(nil)
		next := testPlan(func(p *Plan) {
			p.DoneWhen = "bun run drill --quick"
			p.Slices = []Slice{old.Slices[1], {ID: "S3", Title: "alerts", Files: []string{"tools/alert.ts"}, Status: "todo"}}
			p.EvalCases = []string{}
			p.OwnerSteps = []string{"add R2 secrets"}
		})
		eq(t, planDiff(&old, next), []string{
			"⚠ done when: `bun run drill` → `bun run drill --quick`",
			`added S3 "alerts" (tools/alert.ts)`,
			`removed S1 "dump workflow" (was done)`,
			"⚠ eval flows: [G3] backup settings round trip → none",
			"owner steps: none → add R2 secrets",
		})
	})
	t.Run("slice progress is not a plan change", func(t *testing.T) {
		old := testPlan(nil)
		eq(t, planDiff(&old, testPlan(func(p *Plan) {
			for i := range p.Slices {
				p.Slices[i].Status = "done"
			}
		})), []string{})
	})
}

func TestPRBodySection(t *testing.T) {
	sec := "<!-- loop:begin -->\n## N2\n<!-- loop:end -->"
	t.Run("goes above the no-mistakes text and replaces an old section", func(t *testing.T) {
		body := withSection("<!-- loop:begin -->\nold\n<!-- loop:end -->\n\n---\n\n## Intent\nno-mistakes text", sec)
		eq(t, body, sec+"\n\n---\n\n## Intent\nno-mistakes text\n")
		eq(t, withSection(body, sec), body)
		eq(t, bodyOk(body, sec), true)
	})
	t.Run("an overwritten or stale body fails verification", func(t *testing.T) {
		eq(t, bodyOk("## Intent\nonly no-mistakes", sec), false)
		eq(t, bodyOk(withSection("", "<!-- loop:begin -->\n## N2 old\n<!-- loop:end -->"), sec), false)
	})
}

// A real thread comment and review body from PR #3 (images stripped), so the parsers track CodeRabbit's actual format.
func TestCodeRabbitComments(t *testing.T) {
	var f struct{ Thread, Review string }
	b, err := os.ReadFile("coderabbit.fixture.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, &f); err != nil {
		t.Fatal(err)
	}
	t.Run("a thread reads as severity and title", func(t *testing.T) {
		eq(t, headline(f.Thread), "🎯 Functional Correctness | Minor | ⚡ Quick win · Upgrade the existing sandbox login when reseeding.")
		eq(t, headline("_⚠️ Potential issue_ | _🟠 Major_\n\n**Missing await.**\n\nThe call…"), "⚠️ Potential issue | 🟠 Major · Missing await.")
	})
	t.Run("show prints the explanation and the suggested fix, not the analysis transcript", func(t *testing.T) {
		d := detail(f.Thread)
		if !strings.HasPrefix(d, "**Upgrade the existing sandbox login when reseeding.**") || !strings.Contains(d, "Suggested fix:") || strings.Contains(d, "Script executed") {
			t.Fatalf("detail: %s", d)
		}
	})
	t.Run("findings outside the diff are listed with their full path", func(t *testing.T) {
		eq(t, bodyFindings(f.Review), []string{
			"outside apps/web/src/features/accounts/form.tsx:76 [Minor] Do not report a failed journal-line request as an empty account.",
			"outside docs/guide/northline-user-guide.html:245-246 [Minor] Split returns from job costing in the Live status table.",
		})
	})
}

func TestCodeRabbitGateState(t *testing.T) {
	// The shapes PR #4 produced: one real review, then CodeRabbit's thread replies as empty COMMENTED reviews.
	pr := func(head string, extra, comments string) any {
		var v any
		s := `{"headRefOid":"` + head + `","reviewDecision":"CHANGES_REQUESTED","commits":{"nodes":[{"commit":{"committedDate":"2026-10-24T10:50:00Z"}}]},
			"reviews":{"nodes":[{"author":{"login":"coderabbitai"},"state":"CHANGES_REQUESTED","body":"**Actionable comments posted: 11**","commit":{"oid":"a"}}` + extra + `]},
			"comments":{"nodes":[` + comments + `]}}`
		if err := json.Unmarshal([]byte(s), &v); err != nil {
			t.Fatal(err)
		}
		return v
	}
	reply := func(oid string) string {
		return `,{"author":{"login":"coderabbitai"},"state":"COMMENTED","body":"","commit":{"oid":"` + oid + `"}}`
	}
	t.Run("thread replies are not review rounds and do not mark the head reviewed", func(t *testing.T) {
		cr := crSummary(pr("c", reply("b")+reply("c"), ""), nil, nil)
		eq(t, []any{cr.State, cr.Rounds}, []any{"pending", 1})
	})
	t.Run("a human's approval is not CodeRabbit's; CodeRabbit's approval counts only on the current head", func(t *testing.T) {
		human := `,{"author":{"login":"dhiazfathra"},"state":"APPROVED","body":"lgtm","commit":{"oid":"c"}}`
		p := pr("c", human, "").(map[string]any)
		p["reviewDecision"] = "APPROVED"
		eq(t, crSummary(p, nil, nil).State, "pending")
		approve := func(oid string) string {
			return `,{"author":{"login":"coderabbitai"},"state":"APPROVED","body":"","commit":{"oid":"` + oid + `"}}`
		}
		if crSummary(pr("c", approve("b"), ""), nil, nil).State == "approved" {
			t.Fatal("approval of an older head counted")
		}
		eq(t, crSummary(pr("c", approve("c"), ""), nil, nil).State, "approved")
	})
	t.Run(`a manual request answered "Review rate limited" after the push is terminal`, func(t *testing.T) {
		limited := `{"author":{"login":"coderabbitai"},"updatedAt":"2026-10-24T11:02:30Z","body":"⚠️ Action not completed\n\nReview rate limited."}`
		eq(t, crSummary(pr("c", "", limited), nil, ptr("2026-10-24T11:00:00Z")).State, "rate-limited")
		eq(t, crSummary(pr("c", "", limited), nil, ptr("2026-10-24T11:05:00Z")).State, "pending")
	})
}

func TestNoMistakesDecisions(t *testing.T) {
	gate := func(rows ...string) string {
		for i, r := range rows {
			rows[i] = "  " + r
		}
		return "gate: review\nfindings[" + strconv.Itoa(len(rows)) + "]{id,severity,file,line,action,description}:\n" + strings.Join(rows, "\n") + "\nhelp[1]:\n  Run x"
	}
	t.Run("quoted cells keep their commas", func(t *testing.T) {
		eq(t, cells(`r1,warning,"a, b.ts",,auto-fix,"say ""hi"", then go"`), []string{"r1", "warning", "a, b.ts", "", "auto-fix", `say "hi", then go`})
		f := findings(gate(`r1,warning,x.ts,,auto-fix,"one, two"`))[0]
		eq(t, []string{f["id"], f["action"], f["description"]}, []string{"r1", "auto-fix", "one, two"})
	})
	t.Run("auto-fix findings go back to the pipeline, no-op ones are approved", func(t *testing.T) {
		eq(t, decide(gate("r1,warning,x.ts,,auto-fix,a", "r2,info,y.ts,,no-op,b", "r3,warning,z.ts,,auto-fix,c")), Decision{Kind: "respond", Args: []string{"--action", "fix", "--findings", "r1,r3"}})
		eq(t, decide(gate("r2,info,y.ts,,no-op,b")), Decision{Kind: "respond", Args: []string{"--action", "approve"}})
	})
	t.Run("the owner's calls stop the loop", func(t *testing.T) {
		eq(t, decide(gate("r1,warning,x.ts,,auto-fix,a", "r2,error,tax.ts,,ask-user,changes PPN rounding")).Kind, "stop")
		eq(t, decide("gate: push\nnote: protected-path-refusal on .github/workflows/check.yml").Kind, "stop")
	})
	t.Run("outcomes end the drive; a held wait reattaches", func(t *testing.T) {
		eq(t, decide("outcome: checks-passed\nbranch_sync:\n  next_action:\n    code: sync"), Decision{Kind: "done", Outcome: "checks-passed", Sync: true})
		eq(t, decide("outcome: passed"), Decision{Kind: "done", Outcome: "passed"})
		eq(t, decide("outcome: failed"), Decision{Kind: "failed", Outcome: "failed"})
		eq(t, decide("outcome: failed\nbranch_sync:\n  next_action:\n    code: sync"), Decision{Kind: "failed", Outcome: "failed", Sync: true})
		eq(t, decide("run: 01ABC\nstatus: running"), Decision{Kind: "reattach"})
	})
	t.Run("a gate it cannot read is never approved", func(t *testing.T) {
		eq(t, decide("gate: review\nnote: something new").Kind, "stop")
		eq(t, decide(gate("r1,warning,x.ts,,escalate,a")).Kind, "stop")
		eq(t, decide("gate: review\nfindings[2]{id,severity,file,line,action,description}:\n  r1,warning,x.ts,,no-op,a\nhelp[1]:\n  x").Kind, "stop")
	})
	t.Run("an override or a skip is never the loop's to accept", func(t *testing.T) {
		eq(t, decide("outcome: passed-with-override").Kind, "stop")
		eq(t, decide("outcome: passed-with-skips").Kind, "stop")
	})
	t.Run("branch custody: sync is run, a live run is reattached, recovery goes to the owner", func(t *testing.T) {
		sync := "branch_sync:\n  state: behind\n  next_action:\n    command: no-mistakes axi sync\n    code: sync\noutcome: checks-passed"
		eq(t, nextAction(sync), &NextAction{Code: "sync", Command: "no-mistakes axi sync"})
		d := decide(sync)
		eq(t, []any{d.Kind, d.Sync}, []any{"done", true})
		eq(t, decide("branch_sync:\n  next_action:\n    code: continue_active_run"), Decision{Kind: "reattach"})
		eq(t, decide("outcome: passed\nbranch_sync:\n  next_action:\n    code: recover_custody\n    command: no-mistakes axi sync --recover").Kind, "stop")
	})
}

func TestProductionGuard(t *testing.T) {
	bash := func(c string) string { return blocked("Bash", map[string]any{"command": c}) }
	for _, c := range []string{
		"bun run deploy:prod",
		"cd x && neon connection-string main",
		"echo $NEON_DATABASE_URL",
		"psql postgres://u@ep-x.neon.tech/db",
		"npx wrangler deploy",
		"echo ok\nwrangler deploy",
		"pnpm dlx wrangler deploy",
		"bun x neonctl branches list",
		"env A=1 wrangler deploy",
		"./node_modules/.bin/wrangler deploy",
		`bash -c "wrangler deploy"`,
		"cat ../northline-erp/.env",
		"sleep 1 & wrangler deploy",
		"(wrangler deploy)",
		"if true; then wrangler deploy; fi",
		"sed -i '' 's/build/done/' docs/strategy/loop/state.json",
		"echo {} > tools/loop/guard.ts",
		"bun loop budget 40 --reason more",
		"bun run loop phase0 P7 done --reason x",
		`echo '{"ok":true}' >> docs/strategy/loop/evidence/N2/runs.jsonl`,
		"echo x >> docs/strategy/loop/CHANGELOG.md",
		`echo "$(wrangler whoami)"`,
		"bun tools/loop/loop.ts budget 40 --reason more",
		"bun run loop -- init N9 feat/n9 x",
		"bun loop status > docs/strategy/loop/state.json",
		"cat ../northline-erp/.env.production.local",
		"env -u UNUSED neonctl branches list",
		"env -C /tmp -u X wrangler deploy",
		"sudo -u deploy wrangler deploy",
		"nice -n 5 wrangler deploy",
		"timeout 5m wrangler deploy",
		"timeout -s KILL 30 neon branches list",
		"exec -a x wrangler deploy",
		"npx -p wrangler wrangler deploy",
	} {
		t.Run("blocks "+c, func(t *testing.T) {
			if bash(c) == "" {
				t.Fatal("allowed")
			}
		})
	}
	for _, c := range []string{
		`git commit -m "docs: neon backup notes"`,
		`git commit -m "fix(neon): retry the dump"`,
		"grep -n neon docs/strategy/README.md",
		"bun test",
		"cat .env.example",
		"bun loop status",
		"bun loop render",
	} {
		t.Run("allows "+c, func(t *testing.T) {
			if got := bash(c); got != "" {
				t.Fatalf("blocked: %s", got)
			}
		})
	}
	t.Run("MCP, edits and reads", func(t *testing.T) {
		yes := func(tool string, in map[string]any) {
			t.Helper()
			if blocked(tool, in) == "" {
				t.Errorf("%s %v allowed", tool, in)
			}
		}
		no := func(tool string, in map[string]any) {
			t.Helper()
			if blocked(tool, in) != "" {
				t.Errorf("%s %v blocked", tool, in)
			}
		}
		yes("mcp__plugin_neon_neon__run_sql", nil)
		yes("mcp__plugin_cloudflare_cloudflare__execute", nil)
		no("mcp__serena__find_symbol", nil)
		yes("mcp__serena__replace_content", map[string]any{"relative_path": "docs/strategy/loop/state.json"})
		yes("Grep", map[string]any{"pattern": "URL", "path": "/r/.env"})
		yes("Edit", map[string]any{"file_path": "/r/docs/strategy/loop/state.json"})
		yes("Write", map[string]any{"file_path": "/r/tools/loop/guard.ts"})
		yes("Write", map[string]any{"file_path": "/r/tools/loop/guard.go"})
		no("Edit", map[string]any{"file_path": "/r/tools/loop/checks.ts"})
		yes("Read", map[string]any{"file_path": "/r/.env"})
		no("Read", map[string]any{"file_path": "/r/.env.example"})
		yes("Read", map[string]any{"file_path": "/r/.env.production.local"})
		no("Read", map[string]any{"file_path": "/r/apps/api/src/db.ts"})
	})
}

func TestChecks(t *testing.T) {
	t.Run("committed tails carry no credentials or tokens", func(t *testing.T) {
		eq(t, redact("connect postgres://app:s3cret@db.example.com/x failed"), "connect postgres://***@db.example.com/x failed")
		eq(t, redact("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456"), "Authorization: Bearer ***")
		if !strings.Contains(redact("webhook https://hooks.example.com/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"), "/***") {
			t.Fatal("webhook token kept")
		}
		if !strings.Contains(redact("commit 0123456789abcdef0123456789abcdef01234567"), "0123456789abcdef0123456789abcdef01234567") {
			t.Fatal("commit sha redacted")
		}
	})
	t.Run("declaration files differing only in union order are the same", func(t *testing.T) {
		eq(t, sameDeclarations("type A = 401 | 429;", "type A = 429 | 401;"), true)
		eq(t, sameDeclarations("type A = 401 | 429;", "type A = 401 | 500;"), false)
		// The shape tsc actually reordered in apps/api/types/auth.d.ts: whole object members of a union.
		one := "} | {\n    status: 429;\n} | {\n    status: 401;\n}"
		eq(t, sameDeclarations(one, "} | {\n    status: 401;\n} | {\n    status: 429;\n}"), true)
		eq(t, sameDeclarations(one, "} | {\n    status: 401;\n} | {\n    status: 403;\n}"), false)
		// A member moved from one declaration to another is a real change.
		eq(t, sameDeclarations("interface A {\n    id: string;\n}\ninterface B {\n}", "interface A {\n}\ninterface B {\n    id: string;\n}"), false)
		// ...and so is a field moved between nested objects inside one declaration.
		nested := func(a, b string) string {
			return "type T = {\n    x: {\n" + a + "    };\n    y: {\n" + b + "    };\n};"
		}
		eq(t, sameDeclarations(nested("        id: string;\n", ""), nested("", "        id: string;\n")), false)
		// Object members reordered inside a nested union still compare equal.
		inner := func(a, b string) string {
			return "type T = {\n    r: {\n        s: " + a + ";\n    } | {\n        s: " + b + ";\n    };\n};"
		}
		eq(t, sameDeclarations(inner("1", "2"), inner("2", "1")), true)
	})
	t.Run("G12: every promised flow ran and passed", func(t *testing.T) {
		s := &State{Plan: &Plan{EvalCases: []string{"[N2] restore drill"}}, Baseline: NewOMap[float64]()}
		s.Baseline.Set("g3Flows", 0)
		s.Baseline.Set("g6Flows", 0)
		round := func(flows ...Flow) *bool {
			for i := range flows {
				flows[i].File = "x"
			}
			return judge(Round{Steps: map[string]StepResult{}, Flows: flows}, s).M["G12"]
		}
		eq(t, *round(Flow{Name: "[N2] restore drill", Ok: true}), true)
		eq(t, *round(Flow{Name: "[N2] restore drill", Ok: false}), false)
		eq(t, *round(), false)
	})
}

func TestRenderState(t *testing.T) {
	t.Run("is a pure function of the state", func(t *testing.T) {
		p := testPlan(nil)
		s := &State{Item: ptr("N2"), Stage: ptr("build"), Branch: ptr("feat/n2-backups"), StartedAt: ptr("2026-10-25T00:00:00Z"), BudgetHours: 12,
			Baseline: NewOMap[float64](), Phase0: []Phase0{}, Items: []Item{}, Plan: &p, Arch: []Arch{}, Learnings: []Learning{}}
		s.Baseline.Set("mockCalls", 9)
		var clone State
		j, _ := json.Marshal(s)
		json.Unmarshal(j, &clone)
		eq(t, renderState(s), renderState(&clone))
		if !strings.Contains(renderState(s), "- [x] S1 dump workflow (.github/workflows/backup.yml)") {
			t.Fatal(renderState(s))
		}
	})
}

// ── the CLI against a throwaway repo ──

var cli string

func TestMain(m *testing.M) {
	dir, err := os.MkdirTemp("", "loop-bin-")
	if err != nil {
		panic(err)
	}
	cli = filepath.Join(dir, "loop")
	if out, err := exec.Command("go", "build", "-o", cli, ".").CombinedOutput(); err != nil {
		panic(string(out))
	}
	code := m.Run()
	os.RemoveAll(dir)
	os.Exit(code)
}

type testRepo struct {
	t            *testing.T
	parent, root string
	env          []string
}

func (r testRepo) git(args ...string) {
	c := exec.Command("git", args...)
	c.Dir, c.Env = r.root, r.env
	c.Run()
}
func (r testRepo) run(args ...string) (int, string) {
	c := exec.Command(cli, args...)
	c.Dir, c.Env = r.root, r.env
	out, _ := c.CombinedOutput()
	return c.ProcessState.ExitCode(), string(out)
}
func (r testRepo) read(f string) string {
	b, err := os.ReadFile(filepath.Join(r.root, f))
	if err != nil {
		r.t.Fatal(err)
	}
	return string(b)
}
func (r testRepo) write(f, body string) {
	p := filepath.Join(r.root, f)
	os.MkdirAll(filepath.Dir(p), 0o755)
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		r.t.Fatal(err)
	}
}

// newRepo is a throwaway repo in its own parent dir (start puts the item worktree next to it). main: no item yet, with an origin.
func newRepo(t *testing.T, main bool) testRepo {
	parent := t.TempDir()
	root := filepath.Join(parent, "repo")
	// No global git config: the developer's global hooks must not run (or slow down) inside the throwaway repo.
	env := append(os.Environ(), "LOOP_ROOT="+root, "GIT_CONFIG_GLOBAL=/dev/null", "GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@t", "GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@t")
	r := testRepo{t, parent, root, env}
	item, stage, br := `"N2"`, `"plan"`, `"feat/n2-backups"`
	if main {
		item, stage, br = "null", "null", "null"
	}
	r.write("docs/strategy/loop/state.json", `{"item":`+item+`,"stage":`+stage+`,"branch":`+br+`,"pr":null,"startedAt":"`+isoNow()+`","budgetHours":12,"nm":null,"nmSha":null,"pushedAt":null,"baseline":{"mockCalls":0},"phase0":[],"items":[],"plan":null,"arch":[],"learnings":[]}`)
	r.write("docs/strategy/README.md", "## H0 · Now\n\n| # | Item | I | E | A | Score | Steps | Done when |\n|---|---|---|---|---|---|---|---|\n| N2 | Backups | 4 | 1 | 1 | **6** | Dump nightly | A drill log |\n")
	r.write("apps/api/migrations/0001_ledger.sql", "")
	r.write("apps/api/migrations/0002_auth.sql", "")
	r.write("apps/api/src/db.ts", "import m0001 from '../migrations/0001_ledger.sql' with { type: 'text' }\nimport m0002 from '../migrations/0002_auth.sql' with { type: 'text' }\n\nconst MIGRATIONS: Record<string, string> = { '0001_ledger.sql': m0001, '0002_auth.sql': m0002 }\n")
	r.write(".claude/skills/strategy-loop/evals/golden.md", "")
	r.write("docs/retro/.keep", "")
	b := "feat/n2-backups"
	if main {
		b = "main"
	}
	r.git("init", "-q", "-b", b)
	r.git("add", "-A")
	r.git("commit", "-q", "-m", "init")
	if main {
		c := exec.Command("git", "init", "-q", "--bare", filepath.Join(parent, "origin.git"))
		c.Env = env
		c.Run()
		r.git("remote", "add", "origin", filepath.Join(parent, "origin.git"))
		r.git("push", "-q", "origin", "main")
	}
	return r
}

func has(t *testing.T, s, sub string) {
	t.Helper()
	if !strings.Contains(s, sub) {
		t.Fatalf("%q does not contain %q", s, sub)
	}
}

func TestCLI(t *testing.T) {
	t.Run("advance refuses a stage whose exit checks fail", func(t *testing.T) {
		r := newRepo(t, false)
		code, out := r.run("advance")
		eq(t, code, 1)
		has(t, out, "not yet: plan set with a done-when command")
	})

	t.Run("plan changes are versioned and logged; an unchanged plan is not", func(t *testing.T) {
		r := newRepo(t, false)
		p := `{"title":"feat(ops): N2 backups","doneWhen":"%s","slices":[{"id":"S1","title":"dump","files":["a.ts"]}],"evalCases":[]}`
		r.write("p.json", strings.Replace(p, "%s", "bun run drill", 1))
		_, out := r.run("plan", "p.json", "--reason", "initial plan")
		has(t, out, "plan v1")
		_, out = r.run("plan", "p.json", "--reason", "again")
		has(t, out, "plan unchanged")
		r.write("p.json", strings.Replace(p, "%s", "bun run drill --quick", 1))
		_, out = r.run("plan", "p.json", "--reason", "drill too slow")
		has(t, out, "plan v2")
		log := r.read("docs/strategy/loop/CHANGELOG.md")
		has(t, log, "N2 plan v2")
		has(t, log, "- Reason: drill too slow")
		has(t, log, "- ⚠ done when: `bun run drill` → `bun run drill --quick`")
		has(t, r.read("docs/strategy/loop/STATE.md"), "v2 · feat(ops): N2 backups")
		_, out = r.run("advance")
		has(t, out, "N2: plan → build")
	})

	t.Run("a migration gets the next number and is registered", func(t *testing.T) {
		r := newRepo(t, false)
		_, out := r.run("migration", "backup_runs")
		eq(t, strings.TrimSpace(out), "apps/api/migrations/0003_backup_runs.sql")
		db := r.read("apps/api/src/db.ts")
		has(t, db, "import m0003 from '../migrations/0003_backup_runs.sql' with { type: 'text' }")
		has(t, db, "'0002_auth.sql': m0002, '0003_backup_runs.sql': m0003 }")
		code, _ := r.run("migration", "Bad Name")
		eq(t, code, 1)
	})

	t.Run("the guard hook blocks production commands and state edits only while an item is in progress", func(t *testing.T) {
		r := newRepo(t, false)
		hook := func(stage string, published bool, input string) (int, string) {
			f := filepath.Join(r.root, "docs/strategy/loop/state.json")
			var s map[string]any
			b, _ := os.ReadFile(f)
			json.Unmarshal(b, &s)
			s["stage"], s["published"] = stage, published
			b, _ = json.Marshal(s)
			os.WriteFile(f, b, 0o644)
			c := exec.Command(cli, "guard")
			c.Dir = r.root
			c.Env = append(os.Environ(), "CLAUDE_PROJECT_DIR="+r.root)
			c.Stdin = strings.NewReader(input)
			var errb strings.Builder
			c.Stderr = &errb
			c.Run()
			return c.ProcessState.ExitCode(), errb.String()
		}
		deploy := `{"tool_name":"Bash","tool_input":{"command":"bun run deploy:prod"}}`
		code, err := hook("build", false, deploy)
		eq(t, code, 2)
		has(t, err, "N2 is in progress")
		code, _ = hook("build", false, `{"tool_name":"Edit","tool_input":{"file_path":"`+r.root+`/docs/strategy/loop/state.json"}}`)
		eq(t, code, 2)
		code, _ = hook("build", false, `{"tool_name":"Edit","tool_input":{"file_path":"`+r.root+`/tools/loop/main.go"}}`)
		eq(t, code, 0)
		code, _ = hook("build", false, "not json")
		eq(t, code, 2) // fails closed
		code, _ = hook("done", false, deploy)
		eq(t, code, 2) // the done stage still pushes through the gate
		code, _ = hook("done", true, deploy)
		eq(t, code, 0)
		// Main after the merge holds N2's state but is not on N2's branch: nothing is in progress there.
		r.git("checkout", "-q", "-b", "main")
		code, _ = hook("retro", false, deploy)
		eq(t, code, 0)
	})

	t.Run("start picks the next row and makes a worktree with no upstream", func(t *testing.T) {
		r := newRepo(t, true)
		_, out := r.run("start")
		has(t, out, "N2 started in")
		wt := filepath.Join(r.parent, "northline-n2")
		var s map[string]any
		b, err := os.ReadFile(filepath.Join(wt, "docs/strategy/loop/state.json"))
		if err != nil {
			t.Fatal(err)
		}
		json.Unmarshal(b, &s)
		eq(t, []any{s["item"], s["stage"], s["branch"]}, []any{"N2", "plan", "feat/n2-backups"})
		c := exec.Command("git", "rev-parse", "--abbrev-ref", "@{u}")
		c.Dir = wt
		if c.Run() == nil {
			t.Fatal("the worktree has an upstream")
		}
		_, out = r.run("start")
		has(t, out, "STOP: N2 is at stage plan in")
	})

	t.Run("a loop change needs an existing check", func(t *testing.T) {
		r := newRepo(t, false)
		_, out := r.run("learn", "--check", "G99", "something")
		has(t, out, "--check must name a case or step that exists")
		code, _ := r.run("learn", "--check", "G1", "claim migrations through the CLI")
		eq(t, code, 0)
		has(t, r.read("docs/strategy/loop/CHANGELOG.md"), "- Check: G1")
	})
}

func TestLocksAndPublication(t *testing.T) {
	dir := t.TempDir()
	dead := func() int { c := exec.Command("true"); c.Run(); return c.Process.Pid }
	t.Run("a live lock refuses and is left alone; a stale one is taken over and released", func(t *testing.T) {
		f := filepath.Join(dir, "run.lock")
		me := strconv.Itoa(os.Getpid())
		os.WriteFile(f, []byte(me), 0o644)
		if locked(f, "x", func() error { return nil }) == nil {
			t.Fatal("live lock taken")
		}
		b, _ := os.ReadFile(f)
		eq(t, string(b), me)
		os.WriteFile(f, []byte(strconv.Itoa(dead())), 0o644)
		var inside string
		if err := locked(f, "x", func() error { b, _ := os.ReadFile(f); inside = string(b); return nil }); err != nil {
			t.Fatal(err)
		}
		eq(t, inside, me)
		eq(t, held(f), false)
	})
	t.Run("a lock file still being created (empty) counts as live", func(t *testing.T) {
		f := filepath.Join(dir, "empty.lock")
		os.WriteFile(f, nil, 0o644)
		if locked(f, "x", func() error { return nil }) == nil {
			t.Fatal("empty lock taken")
		}
	})
	t.Run("the publication commit is pushed and confirmed on the remote", func(t *testing.T) {
		remote, work := filepath.Join(dir, "remote.git"), filepath.Join(dir, "work")
		sh([]string{"git", "init", "-q", "--bare", remote}, dir)
		sh([]string{"git", "clone", "-q", remote, work}, dir)
		git := func(a ...string) ShResult {
			return sh(append([]string{"git", "-c", "user.email=t@t", "-c", "user.name=t"}, a...), work)
		}
		git("checkout", "-q", "-b", "feat/x")
		git("commit", "-q", "--allow-empty", "-m", "code")
		eq(t, pushHead("feat/x", work), true)
		git("commit", "-q", "--allow-empty", "-m", "chore(loop): published")
		head := git("rev-parse", "HEAD").Out
		eq(t, pushHead("feat/x", work), true)
		eq(t, sh([]string{"git", "rev-parse", "feat/x"}, remote).Out, head)
		// A remote that moved on (someone else pushed) rejects the non-forced push: not published.
		git("reset", "-q", "--hard", "HEAD~1")
		git("commit", "-q", "--allow-empty", "-m", "diverged")
		eq(t, pushHead("feat/x", work), false)
	})
}
