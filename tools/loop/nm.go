// Drives `no-mistakes axi` for the gate (ADR-0050) without --yes: the pipeline fixes mechanical findings, anything that
// is the owner's call stops the loop. Reads only the TOON fields it needs: gate, findings table, outcome, next_action.
package main

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

type Finding map[string]string // id, severity, file, action, description

type Decision struct {
	Kind    string // respond | stop | done | failed | reattach
	Args    []string
	Why     string
	Outcome string
	Sync    bool
}

// cells splits one TOON table row; quoted cells may hold commas and "" escapes.
func cells(line string) []string {
	out := []string{}
	cur := strings.Builder{}
	quoted := false
	for i := 0; i < len(line); i++ {
		ch := line[i]
		switch {
		case quoted && ch == '"' && i+1 < len(line) && line[i+1] == '"':
			cur.WriteByte('"')
			i++
		case ch == '"':
			quoted = !quoted
		case ch == ',' && !quoted:
			out = append(out, cur.String())
			cur.Reset()
		default:
			cur.WriteByte(ch)
		}
	}
	return append(out, cur.String())
}

var findingsRe = regexp.MustCompile(`(?m)^findings\[(\d+)\]\{([^}]*)\}:\n((?: {2}.*(?:\n|$))*)`)

func findings(out string) []Finding {
	m := findingsRe.FindStringSubmatch(out)
	if m == nil {
		return []Finding{}
	}
	cols := strings.Split(m[2], ",")
	n, _ := strconv.Atoi(m[1])
	res := []Finding{}
	for _, l := range strings.Split(m[3], "\n") {
		if !strings.HasPrefix(l, "  ") || len(res) >= n {
			continue
		}
		c := cells(l[2:])
		f := Finding{}
		for i, k := range cols {
			if i < len(c) {
				f[k] = c[i]
			} else {
				f[k] = ""
			}
		}
		res = append(res, f)
	}
	return res
}

func field(out, key string) (string, bool) {
	m := regexp.MustCompile(`(?m)^` + regexp.QuoteMeta(key) + `: (.+)$`).FindStringSubmatch(out)
	if m == nil {
		return "", false
	}
	return jsTrim(m[1]), true
}

var (
	nmPass        = []string{"checks-passed", "passed"}
	ownerOutcomes = []string{"passed-with-override", "passed-with-skips"} // the owner sees those, the loop never accepts them
	naHead        = regexp.MustCompile(`(?m)^([ \t]*)next_action:\n`)
	naCode        = regexp.MustCompile(`(?m)^[ \t]+code: (\S+)`)
	naCommand     = regexp.MustCompile(`(?m)^[ \t]+command: (.+)$`)
	declaredRe    = regexp.MustCompile(`(?m)^findings\[(\d+)\]`)
	ownerMarkerRe = regexp.MustCompile(`protected-path-refusal|test-agent-unvalidated-work`)
)

type NextAction struct{ Code, Command string }

// nextAction reads branch_sync.next_action, keys in any order: the lines indented under `next_action:`.
func nextAction(out string) *NextAction {
	block := ""
	if loc := naHead.FindStringSubmatchIndex(out); loc != nil {
		indent := out[loc[2]:loc[3]]
		rest := out[loc[1]:]
		for rest != "" {
			line, tail, nl := strings.Cut(rest, "\n")
			after := strings.TrimPrefix(line, indent)
			if !strings.HasPrefix(line, indent) || after == "" || (after[0] != ' ' && after[0] != '\t') {
				break
			}
			block += line
			if nl {
				block += "\n"
			}
			rest = tail
		}
	}
	m := naCode.FindStringSubmatch(block)
	if m == nil {
		return nil
	}
	a := &NextAction{Code: m[1]}
	if c := naCommand.FindStringSubmatch(block); c != nil {
		a.Command = jsTrim(c[1])
	}
	return a
}

// decide is the whole decision table. Pure, so it is tested on recorded output without a pipeline.
func decide(out string) Decision {
	outcome, hasOutcome := field(out, "outcome")
	action := nextAction(out)
	if hasOutcome {
		if contains(ownerOutcomes, outcome) {
			return Decision{Kind: "stop", Why: fmt.Sprintf("no-mistakes ended %s: the owner decides whether that is acceptable", outcome)}
		}
		// recover_custody and adopt_published can drop or replace commits: the owner runs those, whatever the outcome.
		if action != nil && action.Code != "none" && action.Code != "sync" {
			cmd := ""
			if action.Command != "" {
				cmd = " (" + action.Command + ")"
			}
			return Decision{Kind: "stop", Why: fmt.Sprintf("no-mistakes %s, but the branch needs %s%s", outcome, action.Code, cmd)}
		}
		sync := action != nil && action.Code == "sync"
		if contains(nmPass, outcome) {
			return Decision{Kind: "done", Outcome: outcome, Sync: sync}
		}
		return Decision{Kind: "failed", Outcome: outcome, Sync: sync}
	}
	if action != nil && action.Code == "continue_active_run" {
		return Decision{Kind: "reattach"}
	}
	gate, ok := field(out, "gate")
	if !ok {
		return Decision{Kind: "reattach"}
	}
	f := findings(out)
	// A gate the parser cannot read, or a finding with an action it does not know, is never approved blindly.
	declared := -1
	if m := declaredRe.FindStringSubmatch(out); m != nil {
		declared, _ = strconv.Atoi(m[1])
	}
	unknown := false
	for _, x := range f {
		if a := x["action"]; a != "auto-fix" && a != "no-op" && a != "ask-user" {
			unknown = true
		}
	}
	if declared != len(f) || unknown {
		what := "no findings table"
		if declared >= 0 {
			what = fmt.Sprintf("%d of %d findings read", len(f), declared)
		}
		return Decision{Kind: "stop", Why: fmt.Sprintf("no-mistakes %s: gate output not understood (%s); the owner decides", gate, what)}
	}
	owner, fix := []string{}, []string{}
	for _, x := range f {
		switch x["action"] {
		case "ask-user":
			owner = append(owner, fmt.Sprintf("%s %s: %s", x["id"], x["file"], x["description"]))
		case "auto-fix":
			fix = append(fix, x["id"])
		}
	}
	if len(owner) > 0 || ownerMarkerRe.MatchString(out) {
		why := strings.Join(owner, "; ")
		if why == "" {
			why = "protected path or unvalidated work"
		}
		return Decision{Kind: "stop", Why: fmt.Sprintf("no-mistakes %s needs the owner: %s", gate, why)}
	}
	if len(fix) > 0 {
		return Decision{Kind: "respond", Args: []string{"--action", "fix", "--findings", strings.Join(fix, ",")}}
	}
	return Decision{Kind: "respond", Args: []string{"--action", "approve"}}
}

func axi(args ...string) (string, bool) {
	r := sh(append([]string{"no-mistakes", "axi"}, args...))
	return r.Out + "\n" + r.Err, r.Ok
}

// drive runs or reattaches the pipeline for HEAD until an outcome or a stop. Each call blocks up to no-mistakes' 8-minute hold.
func drive(intent string, log func(string)) Decision {
	out, _ := axi("run", "--intent", intent)
	for turn := 0; turn < 60; turn++ {
		d := decide(out)
		switch d.Kind {
		case "respond":
			g, _ := field(out, "gate")
			log(fmt.Sprintf("gate %s: respond %s", g, strings.Join(d.Args, " ")))
			out, _ = axi(append([]string{"respond"}, d.Args...)...)
		case "reattach":
			log("hold elapsed: reattach")
			out, _ = axi("run", "--intent", intent)
		default:
			// The branch must be synced before any local commit, on success and failure alike.
			if (d.Kind == "done" || d.Kind == "failed") && d.Sync {
				if s, ok := axi("sync"); !ok {
					lines := strings.Split(jsTrim(s), "\n")
					return Decision{Kind: "stop", Why: "no-mistakes axi sync failed: " + lines[len(lines)-1]}
				}
			}
			return d
		}
	}
	return Decision{Kind: "stop", Why: "no-mistakes did not finish in 60 turns"}
}
