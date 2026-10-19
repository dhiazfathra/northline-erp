# ADR-0029: Trade Portal Demo divergences and the Journal-only re-verification

## Status
Accepted

## Date
2026-10-19

## Context
The third allowlisted sandbox, **Trade Portal Demo** (company PT Automotive Shop), was read through Daftar Laporan
(`/accurate/report/init-report.do`). It lists 266 reports. All 266 were already specified from Manufaktur Demo or
Retail Demo (`docs/reports/_coverage.md`), so no report is new. The 9 Retail-only reports (department, branch and
project Laba/Rugi, department budgets, `DepartmentListReport`, `CurrencyListReport`) are absent.

Each report was captured with default parameters (`docs/reports/captures/trade/`, tagged `dataUsaha`):
239 return rows, 23 print the empty layout (no such transactions in the demo), and 4 always fail (below).

## Findings
1. **Parameters.** Trade Portal Demo answers with Accurate's generic "Upsss..." 500 when a branch parameter is
   `[{name:"[Semua Cabang]",id:null}]` or when a `PER_BRANCH` / `IN_CURRENCY` parameter is omitted. Manufaktur and
   Retail Demo accept both. Sending every non-boolean parameter as `[]` works in Trade Portal Demo and means "all".
   `steps-capture-missing.mjs` does this only for `ACC_DB=trade`, so earlier captures are unchanged.
2. **Still failing with `[]`:** `BalanceSheetComparePeriodReport`, `SalesInvoiceChartReport`,
   `PhysicalInventoryCountSheetReport`, `StockMovementByWarehouseReport`. They are marked as errors for Trade Portal in
   `_coverage.md`; their specs stand on the earlier sandboxes.
3. **Chart of accounts.** Flat numeric numbering (`1101` > `110102`, `6000` > `600019`), not Retail's dotted scheme
   (`111.101-02`). The ERP takes either: account numbers are opaque strings and the tree comes from `parentNo`.
4. **Calculation rules unchanged.** NL-TP journals J1-J4 (Jurnal Umum JV.2045.01.00001 to JV.2045.02.00002, a
   year with no demo data) were posted in Trade Portal Demo and replayed in the ERP
   (`docs/reports/fixtures/trade/journal-tp.json`, `apps/api/test/trade-portal.test.ts`). Laba/Rugi (Standar),
   Laba/Rugi (Multi Periode), Laba/Rugi (Perbandingan Periode) and Neraca Percobaan (the 14 rows the journals touch)
   match with zero diff on the first run. Sign conventions, parent subtotals, section labels, `% Var.` rounding
   and month columns are the same as in Manufaktur Demo.
5. **Neraca is not re-verified here.** Trade Portal's balance-sheet reports carry the demo's pre-2045 history
   (for example a Persediaan opening balance of 6.146.070.000), which the NL-TP fixture does not replay. The Neraca
   rules remain verified on Manufaktur Demo.

## Decision
Keep one implementation for all three sandboxes. Record Trade Portal behavior as a "Trade Portal Demo variation"
in the affected specs and the parameter rule in the capture tooling; change no report code.

## Alternatives Considered
- **Replay the whole Trade Portal history from `AllJournalReport`**: would also cover Neraca, but the capture is a
  one-cell-per-line HTML dump, and the demo's inventory and sales documents would have to be reconstructed.
  Rejected for this pass; isolated NL-TP journals test the same rules.

## Consequences
- The 4 always-failing reports need a manual try in the Trade Portal UI to learn which parameters they expect.
- Anyone capturing from Trade Portal Demo must use `ACC_DB=trade` so the `[]` parameter rule applies.
