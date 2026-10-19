# ADR-0034: Module dependencies surfaced by Kontraktor Demo, and proposed build order

## Status
Proposed. Flagged for the principal's review; the order below is a proposal, not a decision.

## Date
2026-10-19

## Context
Kontraktor Demo (PT Solar Energy Indonesia) lists 289 reports in Daftar Laporan; 16 are new (`docs/reports/_coverage.md`).
Six of them need only Journal/Period/Account plus the project dimension and budgets the ERP already has (ADR-0022,
ADR-0025); they are built and verified (ADR-0035). The other ten form the **Proyek Kontraktor** group and need a module
the ERP does not have. Their specs and fixtures come from the demo's one contractor project, PRC.2026.06.00001
(`docs/reports/captures/contractor/`).

A contractor project is a different record from the plain Proyek dimension: the demo's project journal, RAB and
bank mutations all sit on PRC.2026.06.00001, while Analisa Laba/Rugi Proyek prints its revenue under `[Tanpa Proyek]`.

## Surfaced module: Contractor Projects
Entities and flows the ten specs need, in dependency order:
1. **Contractor project** (no, name, customer, manager, target start/finish, warehouse, project-in-progress account
   `110506 Proyek Dalam Proses`). Unblocks Daftar Proyek Kontraktor.
2. **Budget plan (RAB)** with a task hierarchy (section > task > item/cost line, unit, planned quantity and cost).
   Unblocks Daftar Anggaran; half of Anggaran & Realisasi Proyek.
3. **Survey** (progress % per RAB task, surveyor). Unblocks Daftar / Rincian Survei Proyek, Progres Proyek (plan side).
4. **Material/equipment usage** (MEQ: stock out of the project warehouse into project-in-progress, at cost).
   Needs Inventory (exists). Unblocks Daftar / Rincian Bahan Baku Terpakai.
5. **Project links on existing documents**: purchase invoice, payment, receipt and sales invoice lines carry the
   contractor project; sales invoices mark RAB tasks `Tertagih`. Unblocks Jurnal Proyek Dalam Proses, Mutasi Bank
   per Proyek, Progres Proyek (billing side), Anggaran & Realisasi (actual side).
6. **Project completion (FPC)**: closes project-in-progress to COGS/revenue, returns leftover stock. Needed for the
   journal report's closing entries and for Laba/Rugi Proyek Kontraktor (whose layout Accurate would not render).

Open questions from the specs: receipts total 196.066.600 against sales invoices 170.778.000, and Daftar Anggaran's
Total RAB 196.093.260 against a plan total of 170.778.000. Neither reconciles from the captured reports; tracing the
source documents is part of step 2/5.

## Proposed order (for review)
1. Contractor project master + project link on existing documents (steps 1 and 5): unblocks 3 reports and is the
   cheapest, it reuses posting.
2. RAB budget plan (step 2).
3. Material/equipment usage (step 4) and completion (step 6).
4. Survey / progress (step 3): reporting only, no ledger impact.

## Alternatives Considered
- **Reusing the plain Proyek dimension as the contractor project**: smaller, but Accurate keeps them apart and its
  reports split them (`[Tanpa Proyek]`), so zero diff would fail.
- **Deciding the order here**: rejected; the goal reserves the build order for the principal.

## Consequences
- Until reviewed, nothing here is scheduled. `_coverage.md` marks the ten reports "blocked: requires Contractor Projects".
