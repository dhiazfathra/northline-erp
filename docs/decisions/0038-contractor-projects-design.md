# ADR-0038: Contractor Projects module design

## Status
Accepted 2026-10-19 (design). Implementation is phase P2 of `docs/goals/full-parity-v2.md`; this ADR answers the open
questions of ADR-0034.

## Date
2026-10-19

## Context
ADR-0034 fixed the build order for the Proyek Kontraktor reports and left two numbers unreconciled. Both were traced
read-only in Kontraktor Demo from the source documents (`/accurate/contractor/detail-{project-contractor,budget-plan,
material-equipment,preliminary-survey,finished-project}.do`, `/accurate/customer/search-sales-{invoice,receipt}.do`).

## Answered open questions
**RAB 196.093.260 vs plan 170.778.000.** The RAB (BGP.2026.06.00001) prices cost up twice:

| Step | Accurate field | Amount |
|---|---|---|
| Task cost, Σ `budget` × `volume` | `workTotal` | 170.778.000 |
| Buffer, Σ cost × `volumeBuffer`% per task | `bufferTotal` | 7.488.600 |
| Selling price, Σ `totalPrice` (cost + buffer) | per group I/II/III | 178.266.600 |
| Contract fee, 10% (`feeContractPortion`) | `feeContractAmount` | 17.826.660 |
| Total RAB | `grandTotal` | 196.093.260 |

Anggaran & Realisasi Proyek prints cost only (`workTotal`); Daftar Anggaran prints `grandTotal`. No tax on the RAB.

**Receipts 196.066.600 vs invoices 170.778.000.** 170.778.000 is not invoice revenue: it is the sum of the cost
entries (Dr 5101.02 Beban Pokok Proyek / Cr 110506 Proyek Dalam Proses) the three billing invoices post, each
`workTotal` × its billed share (33% / 17% / 50%). Invoice revenue is 77.232.600 + 27.360.000 + 91.474.000 =
196.066.600 (group prices, the last one plus 17.800.000 of fee), untaxed, paid by 190.000.000 of down payments plus a
6.066.600 balance, which is the receipts total. The 26.660 gap to the RAB is fee planned (17.826.660) minus billed
(17.800.000). Not traced: the field that stores each invoice's share (sandbox DNS failed); the ERP takes the share
as an input on the billing invoice.

## Decision
A separate `contractor` module, not the plain Proyek dimension (ADR-0034 alternative, still rejected).
- **Contractor project** (`PRC.yyyy.MM.nnnnn`, number period = creation month): name, customer, manager, target
  start, finish date, description, branch, warehouse, accounts (project-in-progress 110506, COGS, income).
- **RAB** (`BGP`): groups (I, II, ...) > work tasks (volume, unit, unit cost, buffer %, unit price) > resource lines
  (MATERIAL item or COST account, unit, qty, unit cost); header fee %. Totals are derived, never stored by hand.
- **MEQ** (material usage): stock out of the project warehouse at inventory cost, Dr project-in-progress; each line
  names its RAB task and resource line.
- **Billing**: a sales invoice on a contractor project names the RAB group(s) billed and the share %; it posts revenue
  and the cost entry `workTotal` × share (Dr COGS / Cr project-in-progress) and marks the tasks Tertagih.
- **Project link on documents**: purchase invoice lines, payment/receipt lines carry an optional contractor project and
  RAB resource line; their journal lines carry the project so the 110506 journal and bank-mutation reports select by it.
- **FPC** (completion): posts the remaining project-in-progress balance to COGS/income and returns leftover stock
  (`Sisa Barang`) to the warehouse at cost.
- **Survey** (`PSV`): progress quantity / % per RAB task, surveyor; reporting only, no journal.

## Alternatives Considered
- **Storing RAB totals as entered fields**: rejected; every total above is a pure function of lines, buffer % and fee %,
  and storing them invites drift from Accurate's arithmetic.
- **Cost entry from actual cost at billing**: rejected; Accurate books planned cost × share, then FPC trues up to actual
  (FPC debit 2.382.300 = plan 170.778.000 - actual 168.395.700, ADR-0034 journal spec).

## Consequences
- Billing share = cost entry share. Accurate stores no field holding 17: `SI.projectProgress` (detail/view sales invoice) holds
  33 / 75 / 100, the cumulative progress at invoicing, and 75 is not 33 + 17 (SI.2026.06.00002 was edited several times). The
  ERP takes the share on the billing (`postProjectDocument` `billing.sharePct`, stored in `project_billings`) and derives the
  cost entry Dr COGS / Cr 110506 = RAB work total x share; replaying 33 / 17 / 50 reproduces 56.356.740 / 29.032.260 / 85.389.000.
- Built in P2 (`apps/api/src/contractor/service.ts`, `apps/api/src/reports/contractor.ts`, routes `/api/contractor/*` and
  `/api/reports/contractor/:report`): all 11 reports zero diff against `captures/contractor/` in
  `apps/api/test/contractor-projects.test.ts`. The Laba/Rugi Proyek Kontraktor capture is the "Proyek harus diisi" error page,
  so the test checks that error and the computed totals against the spec (196.066.600 / 168.395.700 / 27.670.900).
- Migration 0052 (not deployed yet) gained `rab_tasks.start_date/end_date` (Rencana % schedule), `project_billings.date`
  (Tertagih as of a date) and `project_costs`: Realisasi needs each purchase/payment line's quantity and RAB resource,
  which merged journal lines cannot carry (Accurate prints PI.2026.05.00002's two resources as one 110506 line).
- A payment line has no quantity, yet Anggaran & Realisasi prints 7 Hari for 110103.2026.05.00010 (2.100.000 / 350.000 = 6):
  realised quantity defaults to the resource's planned quantity (1 sample).
- FPC returns leftover stock at the project's average MEQ cost of the item (3 x 4.100 = 12.300) and closes the remaining
  110506 balance to COGS only; no income leg was needed by the sample. FPC reads journal_lines, so it catches the ledger
  projection up first.
- Inferred, captured only at 100 / one sample: Rencana % (elapsed share of the task schedule), survey Total Progress and group
  % (weighted by task cost), the Daftar Proyek date filter (Target Mulai), and the order of a task's MEQ lines (Accurate prints
  the reverse of entry order; the test compares them sorted).
- Replay loads the IA.* opening stock (dated 20 Jun) before the May MEQ, dated 1 May, because FIFO costs a usage from stock
  on hand at its date.
