The architecture pass. `/improve-codebase-architecture` sets `disable-model-invocation` and asks the user to pick a
candidate, so the loop follows its method through this prompt instead. `bun loop prompt architecture` fills it.
---
Run the method in ~/.claude/skills/improve-codebase-architecture/SKILL.md (read it, and its HTML-REPORT.md, once) on
item {{item}}, with these overrides:

1. Scope: only these files and the modules they touch: {{changed}}.
2. Decisions: ADRs live in docs/decisions/ (not docs/adr/); there is no GLOSSARY.md, so use the domain words in
   docs/strategy/README.md and the ADRs.
3. Output: write the report to docs/reports/architecture/{{item}}.html. Do not open a browser and do not ask anything.
4. Skip the grilling loop. For each candidate, in the report's order, run `bun loop arch add "<strength>: <title>"`.
5. Then implement every candidate, one commit each: implement, commit, `bun loop check`, `bun loop arch done <id> <sha>`.
   If a check stays red after one fix round: `git revert`, `bun loop arch revert <id> "<reason>"`.
