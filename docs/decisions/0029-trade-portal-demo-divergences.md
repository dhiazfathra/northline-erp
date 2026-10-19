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
all 266 now return a page (4 only after the parameter fixes in finding 2). Only 35 contain amounts: the demo holds
an opening stock adjustment, selling price/discount adjustments, item and tax masters, and no sales, purchase,
receivable or payable documents. Of those 35, 21 had no amounts in the Manufaktur or Retail captures.

## Findings
1. **Parameters.** Trade Portal Demo answers with Accurate's generic "Upsss..." 500 when a `PER_BRANCH` or
   `IN_CURRENCY` parameter is omitted; sending `[]` works and means "all". Branch-multi parameters
   (`BRANCH_MULTI_WITH_ALL_BRANCH`) need `[{name:"[Semua Cabang]",id:null}]` as in the other sandboxes: `[]` there
   silently returns no rows (corrected 2026-10-19; the first Trade capture used `[]` and showed false empties). A few
   reports 500 on `[Semua Cabang]`; `steps-capture-missing.mjs` retries those with `[]`, only for `ACC_DB=trade`.
2. **Date and warehouse parameters.** `DATECOMPARE` (Neraca Perbandingan Periode) and `YEARTODATE` (Grafik
   Penjualan) take `startDate`/`endDate`. A single-warehouse parameter (`WAREHOUSE`) must be a list,
   `[{"name":"Utama","id":50}]`: Trade Portal rejects `null` (Manufaktur Demo accepts it) and a bare string or object
   fails with a Java `ClassCastException`. With these, all 266 reports capture.
3. **Chart of accounts.** Flat numeric numbering (`1101` > `110102`, `6000` > `600019`), not Retail's dotted scheme
   (`111.101-02`). The ERP takes either: account numbers are opaque strings and the tree comes from `parentNo`.
4. **Calculation rules unchanged.** NL-TP journals J1-J4 (Jurnal Umum JV.2045.01.00001 to JV.2045.02.00002, a
   year with no demo data) were posted in Trade Portal Demo and replayed in the ERP
   (`docs/reports/fixtures/trade/journal-tp.json`, `apps/api/test/trade-portal.test.ts`). Laba/Rugi (Standar),
   Laba/Rugi (Multi Periode), Laba/Rugi (Perbandingan Periode) and Neraca Percobaan (the 14 rows the journals touch)
   match with zero diff on the first run (the Neraca Percobaan also in full, see 5). Sign conventions, parent subtotals, section labels, `% Var.` rounding
   and month columns are the same as in Manufaktur Demo.
5. **Neraca re-verified.** The demo's whole pre-2045 history nets to one balance, Persediaan 6.146.070.000 against
   Equitas Saldo Awal (Neraca per 31 Des 2044). The fixture carries it as journal `OB` dated 2025-06-01. With it,
   the full Neraca Percobaan, Neraca (Standar) per 28 Feb 2045 and Neraca (Perbandingan Periode) 31 Des 2044 vs
   28 Feb 2045 match with zero diff. Current-year earnings print as "Laba Tahun Ini", the same as the ERP.
6. **Costing method: Average.** NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003) and 10 @ 120.000
   (PI.2045.03.00004), sold 15 @ 200.000 (SI.2045.03.00001): Laba/Rugi March 2045 shows Beban Pokok Penjualan
   1.650.000 (15 x 110.000). FIFO, used by Manufaktur Demo and the ERP (ADR-0006), gives 1.600.000. Plan:
   ADR-0031.

## Decision
Keep one implementation for all three sandboxes. Record Trade Portal behavior as a "Trade Portal Demo variation"
in the affected specs and the parameter rule in the capture tooling; change no report code.

## Alternatives Considered
- **Replay the whole Trade Portal history from `AllJournalReport`**: the capture is a one-cell-per-line HTML dump.
  Unneeded: the history nets to one balance (finding 5), carried as journal `OB`.

## Consequences
- Anyone capturing from Trade Portal Demo must use `ACC_DB=trade` so the `[]` parameter rule applies.
