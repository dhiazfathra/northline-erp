# ADR-0035: Kontraktor Demo divergences; project reports, project budgets and Daftar Proyek

## Status
Accepted

## Date
2026-10-19

## Context
Fourth allowlisted sandbox, **Kontraktor Demo** (company PT Solar Energy Indonesia). Daftar Laporan: 289 reports, 16 new
(ADR-0034). All 289 were captured with default parameters into `docs/reports/captures/contractor/` (tagged
`dataUsaha: "Kontraktor Demo"`): 92 carry data, 188 are empty layouts, 9 error (they need a department or project
selection and the demo has none, or the contractor P&L, see 5).

## Findings
1. **Parameters as in Trade Portal.** An omitted `PER_BRANCH` / `IN_CURRENCY` parameter returns "Upsss..." 500; `[]`
   works. `steps-capture-missing.mjs` applies the Trade Portal rule to `ACC_DB=contractor`. `*_OPTIONAL` dimension
   parameters (`selectedDepartment`, data classifications) must be `[]` too: their `true` default gives
   `Boolean cannot be cast to List`.
2. **Project P&L prints the standard statement.** Laba/Rugi Proyek, (Multi Periode), (Perbandingan Periode) and
   (Perbandingan Anggaran) print one `LABA BERSIH` and id-ID numbers (`1.234.567`, `300.000,5`), where Retail Demo
   prints `LABA BERSIH (Sebelum Pajak)` / `(Setelah Pajak)` and en-US numbers. The dimension reports gain a `Style`
   (`RETAIL` default, `STANDARD`); routes take `style=standard`. Retail tests unchanged.
3. **Analisa Laba/Rugi Proyek** adds a `Nomor Proyek` column (`-` on `[Tanpa Proyek]`); the total row has no number
   cell. Pendapatan includes other income (NL-K-P1: 10.000.000 + 1.234.567).
4. **Anggaran has a Per Proyek scope** (`scopeType: PROJECT`, `projectId`); Retail Demo offers only Umum / Per
   Departemen. Migration 0050 adds `budgets.project` (never together with a department) and widens the unique key.
   Umum now means department and project both null.
5. **Contractor projects are a separate record** from the Proyek dimension (ADR-0034). Laba/Rugi Proyek Kontraktor
   rejected every `selectedContractorProject` shape tried with "Proyek harus diisi"; spec kept partial.
6. **Daftar Proyek** prints Nama and Keterangan; `projects` gains `description`.
7. **Costing and aging as in Trade Portal.** Preferensi reads `featureCostingMethod: AVERAGE` and aging from
   `INVOICEDATE` (read from the preferences form, not yet proven with a seeded purchase/sale). Kontraktor maps to
   costing AVERAGE and `AgingBasis` INVOICE_DATE (ADR-0029 findings 6-7, ADR-0031); Manufaktur Demo stays FIFO / due date.

## Verification
NL-K seed in Kontraktor Demo (2047, a year with no demo data): projects NL-K-P1/P2, Jurnal Umum JV.2047.01.00001 to
JV.2047.04.00001 (lines with and without a project, revenue, COGS, expense, other income), Per Proyek Anggaran
B1-B3 (one amount with cents). Fixture `docs/reports/fixtures/contractor/projects-k.json`, test
`apps/api/test/contractor-projects.test.ts`: Laba/Rugi Proyek, Multi Periode, Perbandingan Periode, Analisa,
Perbandingan Anggaran (two projects), Daftar Proyek and Laba/Rugi (Standar) 2047 match with zero diff.

## Consequences
- Which style an instance prints is a query parameter for now; it belongs with the business profile (ADR-0031).
- Budgets still have no API endpoint (ADR-0025).
