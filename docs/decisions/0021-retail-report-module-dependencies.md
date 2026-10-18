# ADR-0021: Module dependencies surfaced by Retail Demo reports, and a proposed build order

## Status
Accepted 2026-10-19: the principal asked for all 46 reports and every missing module to be built, Job Costing included
(this supersedes ADR-0010 for the four Job Costing reports only).

## Date
2026-10-19

## Context
Daftar Laporan was read from both allowlisted sandboxes (`docs/reports/_coverage.md`): **Manufaktur Demo** lists 248
reports, **Retail Demo** lists 275. All 248 Manufaktur reports appear in Retail; the 27 extra Retail reports cover
salesmen, departments, branches, job costing and approvals. 229 reports already have a spec (206 verified, 23 out of
scope); 46 have none: the 27 Retail-only reports plus 19 that are listed in both sandboxes but were never specified.

The goal brief assumed the ERP event-sources only Journal and Period. That is out of date. The ERP already carries
Sales, Purchasing, Inventory (FIFO, ADR-0006), Cash & Bank, Fixed Assets, Tax and Payroll, all posting through the
ledger (ADR-0005), and 206 reports are verified on them. "Blocked" below therefore means a module or dimension that does
not exist yet, not "anything beyond Journal".

No missing report can be produced from Journal/Period/Account alone. The only candidate, Laba/Rugi Cabang
(`ProfitLossByBranchReport`), splits P&L by branch; Retail Demo has two branches (JAKARTA, SURABAYA) and the ERP ledger
is single-branch (`BRANCH = 'Kantor Pusat'` in `reports/receivables.ts`). A one-column version would only pass a fixture
that never uses a second branch.

## Dependencies surfaced

| Missing capability | Reports | What it adds to the model |
|---|---|---|
| Salesman on sales documents | 8: `AgingReceivablePerSalesmanReport`, `AgingReceivableDetailPerSalesmanReport`, `OutstandingInvoicePerSalesmanReport`, `SalesInvoiceListBySalesmanReport`, `SalesReturnListBySalesmanReport`, `SalesSalesmanByItemReport`, `SalesmanSalesTargetReport`, `TransactionPerSalesmanListReport` | Salesman master; salesman field on invoice/return/receipt |
| Salesman commission | 5: `SalesmanCommission*` | Commission rules per salesman; needs the row above |
| Salesman check-in | 1: `SalesCheckInPerSalesmanReport` | Mobile check-in events; no ERP source today |
| Department dimension | 6: `ProfitLossByDepartmentReport`, `AnalysisProfitLossDepartmentReport`, `ProfitLossDepartmentMultiPeriodReport`, `ProfitLossComparePeriodPerDepartmentReport`, `DepartmentListReport`, plus `ProfitLossCompareBudgetDepartmentReport` (also needs Budget) | Department master; department on every journal line |
| Branch dimension | 1: `ProfitLossByBranchReport` (and makes the existing single-branch "per Cabang" reports real) | Branch on journal header and documents |
| Budget | 2: `ProfitLossCompareBudgetReport`, `ProfitLossCompareBudgetDepartmentReport` | Budget amounts per account and period |
| Project dimension | 1: `ProfitLossComparePeriodPerProjectReport` | Project on journal lines (Retail Demo has no projects) |
| Sales Quotation | 4: `SalesQuotation*` | Quotation documents (non-posting) |
| Approval workflow | 1: `ApprovalListReport` | Approval state on documents |
| Serial expiry date | 1: `SerialNumberExpiredSoonReport` | Expiry date on serial/batch numbers |
| Job Costing | 4: `JobCosting*`, `FinishedJobCostByMonth` | Job orders; out of scope under ADR-0010 unless that ADR is revisited |

13 more reports need no new module (sales orders, item transfers, warehouses, serial stock, vendor price adjustment):
they are spec-only today and can be verified on the existing modules.

## Proposed build order (for review)
1. **Branch dimension.** Smallest model change (one field on journal header and documents), unblocks
   `ProfitLossByBranchReport` and turns the existing single-branch "per Cabang" reports into real ones.
2. **Department dimension.** One field per journal line plus a master; unblocks 5 reports, 6 with Budget.
3. **Salesman on sales documents**, then **Salesman commission**: 13 Retail-specific reports, all on the sales side.
4. **Verify the 13 existing-module reports** (no model change; can run in parallel with any of the above).
5. **Budget**, **Sales Quotation**, **Serial expiry**, **Project**: small, few reports each.
6. **Approval workflow**, **Salesman check-in**: cross-cutting or external source; lowest value per effort.
7. **Job Costing** stays out of scope (ADR-0010).

Ordering rationale: dimensions first, because they touch the event schema of Journal and every later document must
carry them; adding them after Salesman/Budget would mean migrating more events.

## Alternatives Considered

### Ship `ProfitLossByBranchReport` now on the single-branch ledger
- Pros: one more report "verified" in this goal
- Cons: the Retail fixture has two branch columns; a one-column report matches only a degenerate fixture
- Rejected: verification against a fixture that can't exercise the feature is not verification

### Order by report count (Salesman first)
- Pros: most reports unblocked earliest
- Cons: Salesman is a sales-document field; the dimensions change the Journal event schema, which is cheaper first
- Not chosen, but a reasonable call if Retail sales reporting is the business priority

## Consequences
- This goal builds no new report: every missing report is either blocked on a capability above or on an existing
  module and left at spec. The verification loop has nothing to run until one of these is approved.
- Retail Demo prints numbers in en-US format (`10,904,843,757.9`) where Manufaktur Demo prints id-ID (`1.860.000`);
  report fixtures from the two sandboxes must not be compared as strings.
- Four department/project P&L variants could not be captured through the API (server error for every parameter shape
  tried); their specs are partial until captured through the UI.
