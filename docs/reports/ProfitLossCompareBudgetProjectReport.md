# Laba/Rugi Proyek (Perbandingan Anggaran) (`ProfitLossCompareBudgetProjectReport`)
Group: Pusat Laba & Biaya. Reverse-engineered Accurate Online, **Kontraktor Demo** sandbox, 2026-10-19. Default capture: [`captures/contractor/ProfitLossCompareBudgetProjectReport.json`](captures/contractor/ProfitLossCompareBudgetProjectReport.json).
Status: verified (Kontraktor Demo, ADR-0035). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/budget.ts` `profitLossCompareBudget(.., 'project', STANDARD)`.
## Purpose
Menampilkan laba/rugi per proyek dengan penambahan kolom anggaran dan perbandingannya dan juga persentasenya. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.
## Params
Date kind `PERIODFROMTO`.
- `selectedProject`: PER_PROJECT, default []
- `showTotal`: BOOLEAN, default false
- `showParentAccount`: BOOLEAN, default true
- `showChildAccount`: BOOLEAN, default true
- `showZeroBalance`: BOOLEAN, default false
- `showParentAccountBalance`: BOOLEAN, default true

Wire: `selectedProject` (PER_PROJECT) one-element list.
Params used for the fixture (NL-K seed, 2047):
- `ProfitLossCompareBudgetProjectReport`: `{"periodStartMonth": "1", "periodStartYear": 2047, "periodEndMonth": "12", "periodEndYear": 2047, "selectedProject": [{"id": 150, "name": "NL-K-P2"}], "showTotal": false, "showParentAccount": true, "showChildAccount": true, "showZeroBalance": false, "showParentAccountBalance": true}`
- `ProfitLossCompareBudgetProjectReport#P1`: `{"periodStartMonth": "1", "periodStartYear": 2047, "periodEndMonth": "4", "periodEndYear": 2047, "selectedProject": [{"id": 100, "name": "NL-K-P1"}], "showTotal": false, "showParentAccount": true, "showChildAccount": true, "showZeroBalance": false, "showParentAccountBalance": true}`
## Rules
- Columns Aktual (IDR), Anggaran, Variance, % Var. over months; Aktual = the project's journal lines, Anggaran = its Per Proyek budgets (Anggaran `scopeType: PROJECT`, ADR-0035 finding 4). Variance = Aktual − Anggaran; % Var. = Variance / |Anggaran| to 2 decimals, `100 %` on a zero budget.
- Umum and other projects' budgets are not included (P1 shows only B1 8.000.000).
- Cents print: `300.000,5`, `3.699.999,5`.
- Same rules as ProfitLossCompareBudgetDepartmentReport.md except style and scope.
## Seed
Kontraktor Demo, all `NL-K`: projects NL-K-P1/P2, Jurnal Umum JV.2047.01.00001 to JV.2047.04.00001 (project and no-project lines; one 1.234.567 other-income line), Per Proyek Anggaran B1-B3 (one amount with cents). Never mixed with other sandboxes.
## Verified / unverified
- Verified: zero diff on the body rows (page furniture stripped) against the 2047 capture.
- Unverified: branch filter other than all, department and data-classification filters, foreign currency, parent projects (sub-projects).
