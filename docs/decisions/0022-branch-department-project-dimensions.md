# ADR-0022: Branch on the journal, department and project on the journal line

## Status
Accepted

## Date
2026-10-19

## Context
ADR-0021 put the dimensions first in the Retail build order: seven Retail Demo reports (Laba/Rugi Cabang, the five
department/project P&L variants, Daftar Departemen) split the ledger by branch, department or project, and the ledger
had none of them. Accurate stores the branch on the Jurnal Umum header (`branchId`, copied to every line) and
department and project per detail line (`departmentId`, `projectId`), both optional. A line without a department is
reported as `[Tanpa Departement]`.

## Decision
- `JournalPosted` / `JournalEdited` (and the PostJournal/EditJournal commands) gain an optional `branch`; each
  `JournalLine` gains optional `department` and `project`. Old events read as "default branch, no department, no
  project", so no upcaster and no event migration.
- Master rows are plain tables keyed by name (`branches` with one `is_default`, `departments`, `projects`), like the other
  master lists (ADR-0005, migration 0021). Migration 0041 seeds `Kantor Pusat` as the default branch, so the existing
  single-branch reports keep their label. The handler rejects unknown names before appending; the projection carries
  them into `journals.branch`, `journal_lines.department` / `project` (FKs as a second line of defence).
- Reports (`apps/api/src/reports/dimensions.ts`) filter journal lines by dimension and reuse the standard Laba/Rugi,
  `mergeColumns` and `compareColumns`; a journal without a branch counts for the default branch.
- Routes: `POST /master/{branches|departments|projects}`, `GET /reports/master/departments`,
  `GET /reports/dimensions/{by-branch|by-department|department-multi-period|compare-department|compare-project|analysis-department}`.

## Alternatives Considered

### Branch per line instead of per header
- Pros: one more degree of freedom
- Cons: Accurate's Jurnal Umum copies the header branch to every line; per-line branch would allow journals Accurate cannot produce
- Rejected

### Dimension ids instead of names
- Pros: renames do not touch history
- Cons: every other master list is keyed by its display key; renames are not modelled for any of them yet
- Not chosen; revisit together with master-data renames

## Consequences
- Documents (sales, purchases, ...) do not yet set a branch or department; they post to the default branch with no
  department. The existing "per Cabang" reports still print the default branch only until documents carry `branch`.
- Retail Demo prints `LABA BERSIH (Sebelum Pajak)` / `(Setelah Pajak)` and en-US numbers; the dimension reports format
  that way (`formatEn`), the Manufaktur-verified reports keep id-ID.
- Accurate's report API needs list-typed selections for these reports (`selectedDepartment: [{id,name}]`,
  `selectedProject: []`); the accepted shapes are recorded in each spec.
