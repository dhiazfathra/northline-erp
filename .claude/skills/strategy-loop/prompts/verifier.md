Task prompt for the `e2e-verifier` agent (.claude/agents/e2e-verifier.md). `bun loop prompt verifier` fills the
{{placeholders}} from state.json.
---
Backlog item {{item}}: {{row}}
The plan's slices: {{slices}}
Flows the plan promised: {{evalCases}}

For each promised flow, write one flow named exactly as promised, verbatim: G12 matches names character for
character. Then add `[{{item}}]` flows for every other behaviour in the slices, a `[G3]` flow for every form the item
adds or changes, and a `[G6]` flow for every picker it adds or changes. Run `bun loop e2e` and reply in the agent's
format.
