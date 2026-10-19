# Laba/Rugi Proyek (Multi Periode) (`ProfitLossProjectMultiPeriodReport`)
Group: Pusat Laba & Biaya. Reverse-engineered Accurate Online, **Kontraktor Demo** sandbox, 2026-10-19. Default capture: [`captures/contractor/ProfitLossProjectMultiPeriodReport.json`](captures/contractor/ProfitLossProjectMultiPeriodReport.json).
Status: verified (Kontraktor Demo, ADR-0035). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/dimensions.ts` `profitLossMultiPeriodBy(.., 'project', .., STANDARD)`.
## Purpose
Menampilkan laba rugi proyek bulanan pada rentang periode terpilih. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.
## Params
Date kind `PERIODFROMTO`.
- `selectedBranch`: PER_BRANCH, default []
- `selectedProject`: PER_PROJECT, default []
- `selectedDepartment`: PER_DEPARTMENT_OPTIONAL, default true
- `selectedCurrency`: IN_CURRENCY, default []
- `showTotal`: BOOLEAN, default false
- `showParentAccount`: BOOLEAN, default true
- `showChildAccount`: BOOLEAN, default true
- `showZeroBalance`: BOOLEAN, default false
- `showParentAccountBalance`: BOOLEAN, default true

Wire: `selectedProject` (PER_PROJECT) as a one-element list.
Params used for the fixture (NL-K seed, 2047):
- `ProfitLossProjectMultiPeriodReport`: `{"periodStartMonth": "1", "periodStartYear": 2047, "periodEndMonth": "4", "periodEndYear": 2047, "selectedProject": [{"id": 100, "name": "NL-K-P1"}], "selectedBranch": [], "selectedDepartment": [], "selectedCurrency": [], "showTotal": false, "showParentAccount": true, "showChildAccount": true, "showZeroBalance": false, "showParentAccountBalance": true}`
## Rules
- One project, one column per month (full Indonesian month name), then Total; title `Laba/Rugi <project> (Multi Periode)`.
- Each month is the standard Laba/Rugi over that project's lines; account rows zero in every month hidden.
## Seed
Kontraktor Demo, all `NL-K`: projects NL-K-P1/P2, Jurnal Umum JV.2047.01.00001 to JV.2047.04.00001 (project and no-project lines; one 1.234.567 other-income line), Per Proyek Anggaran B1-B3 (one amount with cents). Never mixed with other sandboxes.
## Verified / unverified
- Verified: zero diff on the body rows (page furniture stripped) against the 2047 capture.
- Unverified: branch filter other than all, department and data-classification filters, foreign currency, parent projects (sub-projects).
