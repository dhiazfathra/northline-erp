// PreToolUse hook (ADR-0050), `loop guard`. While a loop item is in progress (a worktree on the item's branch, until the
// done stage has published it), it keeps production, secrets and the loop's own controls out of the agent's reach:
// - Neon and Cloudflare MCP tools; the neon, neonctl and wrangler CLIs however they are wrapped;
// - NEON_* variables, neon.tech hosts, .env files (Bash, Read, Grep), deploy:prod and switch:prod;
// - writes to the loop state, the project settings and this guard by any tool (only `bun loop` writes state);
// - the owner's levers `bun loop budget|phase0|init`, which the owner runs in a terminal.
// A tripwire, not a sandbox: loop sessions should also run without production credentials. Exit 2 blocks the call
// and shows the reason to the agent; any error also blocks (fails closed).
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

// The hook runs before main and before anything else in the CLI, so the rest of the package cannot change its answer.
func init() {
	if len(os.Args) > 1 && os.Args[1] == "guard" {
		os.Exit(guardMain(os.Stdin))
	}
}

func guardMain(stdin io.Reader) (code int) {
	defer func() {
		if e := recover(); e != nil {
			fmt.Fprintf(os.Stderr, "loop guard (ADR-0050) failed closed: %v\n", e)
			code = 2
		}
	}()
	fail := func(err error) int {
		fmt.Fprintf(os.Stderr, "loop guard (ADR-0050) failed closed: %s\n", err)
		return 2
	}
	b, err := io.ReadAll(stdin)
	if err != nil {
		return fail(err)
	}
	var in struct {
		ToolName  *string        `json:"tool_name"`
		ToolInput map[string]any `json:"tool_input"`
		Cwd       *string        `json:"cwd"`
	}
	if err := json.Unmarshal(b, &in); err != nil {
		return fail(err)
	}
	what := blocked(strOr(in.ToolName, ""), in.ToolInput)
	if what == "" {
		return 0
	}
	dir := os.Getenv("CLAUDE_PROJECT_DIR")
	if dir == "" {
		dir = strOr(in.Cwd, "")
	}
	if dir == "" {
		dir, _ = os.Getwd()
	}
	active, err := activeWorktree(dir)
	if err != nil {
		return fail(err)
	}
	if active != nil {
		fmt.Fprintf(os.Stderr, "loop guard (ADR-0050): %s is in progress; production, secrets and loop controls are owner-only. Blocked: %s\n", active.Item, slice16(what, 160))
		return 2
	}
	return 0
}

var (
	secretRe = regexp.MustCompile(`deploy[:-]prod|switch[:-]prod|NEON_[A-Z_]+|neon\.tech`)
	envRe    = regexp.MustCompile(`(?:^|[\s'"=/<])\.env`)
	cliNames = map[string]bool{"neon": true, "neonctl": true, "wrangler": true}
	wrappers = map[string]bool{"env": true, "exec": true, "time": true, "nohup": true, "sudo": true, "bunx": true, "npx": true, "command": true, "do": true, "then": true, "else": true, "if": true, "while": true, "until": true, "!": true, "nice": true, "timeout": true}
	// Wrapper options that take the next word as their value (`env -u NAME`, `sudo -u user`), so it is not the program.
	operand = map[string][]string{
		"env":     {"-u", "-C", "-S", "--unset", "--chdir", "--split-string"},
		"exec":    {"-a"},
		"nice":    {"-n", "--adjustment"},
		"timeout": {"-s", "-k", "--signal", "--kill-after"},
		"sudo":    {"-u", "-g", "-C", "-D", "-h", "-p", "-R", "-r", "-t", "-T", "-U", "--user", "--group", "--chdir", "--host", "--prompt"},
		"bunx":    {"-p", "--package"},
		"npx":     {"-p", "--package"},
	}
	durationRe = regexp.MustCompile(`^\d+(\.\d+)?[smhd]?$`)
	// The ledger exit checks trust (runs.jsonl) and the rendered files count as state too. guard.ts: the TS guard's old name.
	lockedRe    = regexp.MustCompile(`docs/strategy/loop/(state\.json|STATE\.md|CHANGELOG\.md)|runs\.jsonl|\.claude/settings(\.local)?\.json|tools/loop/(guard\.(ts|go)|loop\.sh)`)
	lockedDirRe = regexp.MustCompile(`(^|/)docs/strategy/loop/|(^|/)\.claude/settings(\.local)?\.json$|(^|/)tools/loop/(guard\.(ts|go)|loop\.sh)$`)
	// Any spelling of the CLI: `bun loop budget`, `bun run loop -- phase0`, `tools/loop/loop.sh init`, `.bin/loop init`.
	ownerRe   = regexp.MustCompile(`\bloop(\.ts|\.sh)?\s+(--\s+)?(budget|phase0|init)\b`)
	envFileRe = regexp.MustCompile(`(^|/)\.env(\.[\w-]+)*$`)
	grepEnvRe = regexp.MustCompile(`\.env(\.[a-z]+)?\b`)
	shellCRe  = regexp.MustCompile(`\b(?:bash|sh|zsh)\s+-c\s+(?:"([\s\S]*?)"|'([\s\S]*?)')`)
	substRe   = regexp.MustCompile("\\$\\(([^()]*)\\)|`([^`]*)`")
	quotedRe  = regexp.MustCompile(`"(?:[^"\\]|\\.)*"|'[^']*'`)
	segmentRe = regexp.MustCompile(`\n|;|&&|\|\||\||&|\(|\)|\{|\}`)
	assignRe  = regexp.MustCompile(`^[A-Z_][A-Z0-9_]*=`)
	viaCliRe  = regexp.MustCompile(`^\s*bun\s+(run\s+)?loop\b`)
	chainRe   = regexp.MustCompile("[;&|<>\\n`]|\\$\\(")
)

// secret: a production name, or a .env file that is not .env.example.
func secret(cmd string) bool {
	if secretRe.MatchString(cmd) {
		return true
	}
	for _, loc := range envRe.FindAllStringIndex(cmd, -1) {
		rest := cmd[loc[1]:]
		if strings.HasPrefix(rest, ".example") {
			continue
		}
		if rest == "" || !isWord(rest[0]) {
			return true
		}
	}
	return false
}

func isWord(c byte) bool {
	return c == '_' || c >= '0' && c <= '9' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z'
}

// programs: the program each shell segment runs, through wrappers (`env A=1`, `bunx`, `pnpm dlx`, `bun x`, `bash -c "…"`).
func programs(command string) []string {
	out := []string{}
	// Code inside `bash -c "…"`, `$( … )` and backticks runs even within quotes; other quoted text is data
	// (a commit message saying "fix(neon): …" runs nothing).
	for _, m := range shellCRe.FindAllStringSubmatch(command, -1) {
		out = append(out, programs(m[1]+m[2])...)
	}
	for _, m := range substRe.FindAllStringSubmatch(command, -1) {
		out = append(out, programs(m[1]+m[2])...)
	}
	bare := quotedRe.ReplaceAllString(command, `""`)
	for _, segment := range segmentRe.Split(bare, -1) {
		words := strings.Fields(segment)
		wrapper := ""
		for i := 0; i < len(words); {
			w := words[i]
			base := path.Base(w)
			next := ""
			if i+1 < len(words) {
				next = words[i+1]
			}
			if wrappers[base] {
				wrapper = base
				i++
			} else if slices.Contains(operand[wrapper], w) {
				i += 2
			} else if assignRe.MatchString(w) || strings.HasPrefix(w, "-") || (wrapper == "timeout" && durationRe.MatchString(w)) {
				// timeout's first operand is the duration (`timeout 5m wrangler …`).
				i++
			} else if (base == "pnpm" && (next == "dlx" || next == "exec")) || (base == "bun" && next == "x") {
				i += 2
			} else {
				out = append(out, base)
				break
			}
		}
	}
	return out
}

func inStr(in map[string]any, k string) (string, bool) {
	v, ok := in[k]
	if !ok || v == nil {
		return "", false
	}
	if s, ok := v.(string); ok {
		return s, true
	}
	return fmt.Sprint(v), true
}

// blocked names the call when it is one the guard stops, else "".
func blocked(tool string, input map[string]any) string {
	if input == nil {
		input = map[string]any{}
	}
	if strings.HasPrefix(tool, "mcp__") {
		j, _ := marshal(input)
		if regexp.MustCompile(`(?i)neon|cloudflare`).MatchString(tool) || lockedRe.Match(j) {
			return tool
		}
		return ""
	}
	file, ok := inStr(input, "file_path")
	if !ok {
		file, _ = inStr(input, "notebook_path")
	}
	switch tool {
	case "Edit", "Write", "MultiEdit", "NotebookEdit":
		if lockedDirRe.MatchString(file) {
			return fmt.Sprintf("%s %s (written only by bun loop)", tool, file)
		}
		return ""
	case "Read":
		if envFileRe.MatchString(file) && !strings.HasSuffix(file, ".example") {
			return "Read " + file
		}
		return ""
	case "Grep":
		for _, k := range []string{"path", "glob"} {
			if p, _ := inStr(input, k); p != "" && grepEnvRe.MatchString(p) && !strings.Contains(p, ".env.example") {
				return "Grep over .env files"
			}
		}
		return ""
	case "Bash":
	default:
		return ""
	}
	cmd, _ := inStr(input, "command")
	// Only the CLI may touch the locked files; reading state goes through `bun loop status`. A plain invocation only: no
	// chaining, redirection or substitution that could write a locked file around it.
	viaCli := viaCliRe.MatchString(cmd) && !chainRe.MatchString(cmd)
	if ownerRe.MatchString(cmd) {
		return cmd + " (an owner lever: the owner runs it in a terminal)"
	}
	if lockedRe.MatchString(cmd) && !viaCli {
		return cmd + " (names a file only bun loop writes)"
	}
	if secret(cmd) {
		return cmd
	}
	for _, p := range programs(cmd) {
		if cliNames[p] {
			return cmd
		}
	}
	return ""
}

type Active struct{ Item, Stage, Path string }

var (
	wtTree   = regexp.MustCompile(`(?m)^worktree (.+)$`)
	wtBranch = regexp.MustCompile(`(?m)^branch refs/heads/(.+)$`)
)

// activeWorktree: the worktree on an item's branch whose item is not yet done and published, if any.
func activeWorktree(dir string) (*Active, error) {
	c := exec.Command("git", "worktree", "list", "--porcelain")
	c.Dir = dir
	list, _ := c.Output()
	for _, block := range strings.Split(string(list), "\n\n") {
		t := wtTree.FindStringSubmatch(block)
		if t == nil {
			continue
		}
		br := ""
		if b := wtBranch.FindStringSubmatch(block); b != nil {
			br = b[1]
		}
		f := filepath.Join(t[1], "docs/strategy/loop/state.json")
		raw, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		var s struct {
			Item, Stage, Branch *string
			Published           *bool
		}
		if err := json.Unmarshal(raw, &s); err != nil {
			return nil, err
		}
		done := str(s.Stage) == "done" && s.Published != nil && *s.Published
		if truthy(s.Item) && s.Branch != nil && *s.Branch == br && br != "" && !done {
			return &Active{*s.Item, str(s.Stage), t[1]}, nil
		}
	}
	return nil, nil
}
