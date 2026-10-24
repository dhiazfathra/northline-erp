Intent for `no-mistakes axi run --intent`, used by `bun loop nm`. `bun loop prompt intent` fills the {{placeholders}}.
---
Backlog item {{item}} of docs/strategy/README.md: {{row}} Plan: {{title}}; done when `{{doneWhen}}`. Slices: {{slices}}.
The strategy loop (ADR-0050) built it in one agent context, ran an architecture pass whose suggestions are each one
commit, and passed golden evals G1–G10 twice on a fresh database (evidence in docs/strategy/loop/evidence/{{item}}/).
Every plan change and its reason is in docs/strategy/loop/CHANGELOG.md. Owner steps the loop deliberately did not run:
{{ownerSteps}}. Files under docs/strategy/loop/ are written by `bun loop` and are expected in the diff. Keep the PR body
section between the loop markers; put your own text below it.
