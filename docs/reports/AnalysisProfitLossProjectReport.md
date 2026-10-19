# Analisa Laba/Rugi Proyek (`AnalysisProfitLossProjectReport`)
Group: Pusat Laba & Biaya. Reverse-engineered Accurate Online, **Kontraktor Demo** sandbox, 2026-10-19. Default capture: [`captures/contractor/AnalysisProfitLossProjectReport.json`](captures/contractor/AnalysisProfitLossProjectReport.json).
Status: verified (Kontraktor Demo, ADR-0035). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/dimensions.ts` `analysisProfitLossProject`.
## Purpose
Laporan yang menampilkan analisa laba/rugi proyek. Daftar Laporan category: Pusat Laba & Biaya; view type `crosstab`.
## Params
Date kind `FROMTO`.
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Wire: Only `selectedBranch` (BRANCH_MULTI_WITH_ALL_BRANCH, `[Semua Cabang]`).
Params used for the fixture (NL-K seed, 2047):
- `AnalysisProfitLossProjectReport`: `{"startDate": "01/01/2047", "endDate": "31/12/2047", "selectedBranch": [{"name": "[Semua Cabang]", "id": null}]}`
## Rules
- Columns Nama Proyek, Nomor Proyek, Pendapatan, BPP, Beban, Laba/Rugi; one row per project with activity (by name), then `[Tanpa Proyek]` with Nomor `-`, then `Total Nama Proyek` (no Nomor cell).
- Pendapatan = REVENUE + OTHER_INCOME (credit − debit); BPP = COGS; Beban = EXPENSE + OTHER_EXPENSE (debit − credit); Laba/Rugi = Pendapatan − BPP − Beban.
- Demo data (default capture): the contractor project's revenue 196.066.600 and BPP 168.395.700 appear under `[Tanpa Proyek]`: contractor projects are not the Proyek dimension (ADR-0034).
## Seed
Kontraktor Demo, all `NL-K`: projects NL-K-P1/P2, Jurnal Umum JV.2047.01.00001 to JV.2047.04.00001 (project and no-project lines; one 1.234.567 other-income line), Per Proyek Anggaran B1-B3 (one amount with cents). Never mixed with other sandboxes.
## Verified / unverified
- Verified: zero diff on the body rows (page furniture stripped) against the 2047 capture.
- Unverified: branch filter other than all, department and data-classification filters, foreign currency, parent projects (sub-projects).
