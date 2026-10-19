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
- Billing an invoice needs the share %; Accurate's own field for it is still untraced (follow-up in P2 capture).
- The 11 Proyek Kontraktor reports become buildable; zero diff is checked against `captures/contractor/`.
