# ADR-0026: Job costing (Pekerjaan Pesanan) with material issue, expenses and roll-over

## Status
Accepted

## Date
2026-10-19

## Context
ADR-0021 (accepted) brought the four Job Costing reports back into scope, superseding ADR-0010 for them:
`JobCostingByMonthReport`, `JobCostingHistoryDetailReport`, `FinishedJobCostByMonth`, `JobCostingJournalDetailReport`.
Accurate's job costing is two documents: a job order (`accurate__inventory__job-order`, JC.yyyy.mm.nnnnn) that issues
materials from stock and books expenses, and a Penyelesaian Pesanan (`accurate__inventory__roll-over`, RO.yyyy.mm.nnnnn)
that moves the job into finished items. Retail Demo was seeded with NL-RG data dated 2047
(`docs/reports/fixtures/retail/jobcosting-rg.json`): one job finished, one left open.

## Decision
- Migration 0044: `job_orders` (with WIP account and total), `job_order_lines` (a material line names an item, an expense
  line an account; exactly one), `roll_overs` (one per job) and `roll_over_lines` (item, quantity, portion, amount).
- `createJobOrder` costs each material at FIFO and writes a stock move out (`JC`); journal `JC`: debit WIP with the job
  total, credit inventory accounts merged per account, then the expense accounts. Expenses count as quantity 1.
- `createRollOver` allocates the job total by portion (the last line takes the rounding remainder), writes stock moves in
  (`RO`) at that value and posts `RO`: debit the finished items' inventory accounts, credit WIP. A job finishes once; its
  status is `Selesai` from then on, `Sedang diproses` before.
- `JC` and `RO` join the journal source enum.
- Reports in `apps/api/src/reports/job-costing.ts` return the report body; title lines and page footers are furniture.

## Alternatives Considered
- **Finished value from the demo data**: the 2016/2017 demo jobs finish at values that differ from their material cost
  (942,126,946.31 vs 635,720,816.89) for reasons not visible in the documents; the NL-RG seed finishes at exactly the job
  total, so that is what is modelled and verified.
- **Material adjustment (Penambahan Bahan Baku) and the difference account (711.000-97)**: not seeded, not built.

## Consequences
- Histori Pekerjaan Pesanan: Accurate's order among a job's material lines is not stable (seq 2,1 in one job, 1,2 in
  the other with ascending ids in both). The ERP prints seq order; the test compares those lines sorted by code. Every
  other cell and row is compared exactly.
- Rincian Jurnal Pekerjaan Pesanan has no parameter and also prints the demo job orders; it is compared on the NL-RG
  blocks only (ADR-0013).
- Not covered: months without data in the crosstabs, portions below 100%, partial roll-overs, job edits/deletes,
  `JobOrderListReport` and the roll-over/material adjustment list reports (still at spec).
