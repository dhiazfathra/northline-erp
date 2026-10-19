# Laba/Rugi Proyek (`ProfitLossByProjectReport`)
Group: Pusat Laba & Biaya. Reverse-engineered Accurate Online, **Kontraktor Demo** sandbox, 2026-10-19. Default capture: [`captures/contractor/ProfitLossByProjectReport.json`](captures/contractor/ProfitLossByProjectReport.json).
Status: verified (Kontraktor Demo, ADR-0035). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/dimensions.ts` `profitLossByDim(.., 'project', .., STANDARD)`.
## Purpose
Menampilkan laba rugi per Proyek untuk periode yg dipilih. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.
## Params
Date kind `FROMTO`.
- `selectedBranch`: PER_BRANCH, default []
- `selectedProject`: PROJECT_MULTI, default []
- `selectedDepartment`: PER_DEPARTMENT_OPTIONAL, default true
- `showTotal`: BOOLEAN, default false
- `showParentAccount`: BOOLEAN, default true
- `showChildAccount`: BOOLEAN, default true
- `showZeroBalance`: BOOLEAN, default false
- `showParentAccountBalance`: BOOLEAN, default true
- Data classification 1-10 (PER_DATA_CLASSIFICATION_n_OPTIONAL): send `[]`.
Wire: `selectedProject` (PROJECT_MULTI) is required ("Proyek harus diisi"); `selectedDepartment` and data classifications must be `[]`, not their `true` default.
Params used for the fixture (NL-K seed, 2047):
- `ProfitLossByProjectReport`: `{"startDate": "01/01/2047", "endDate": "31/12/2047", "selectedProject": [{"id": 100, "name": "NL-K-P1"}, {"id": 150, "name": "NL-K-P2"}], "selectedBranch": [], "selectedDepartment": [], "showTotal": false, "showParentAccount": true, "showChildAccount": true, "showZeroBalance": false, "showParentAccountBalance": true}`
## Rules
- One column per selected project, then Total. Each column is the standard Laba/Rugi (ProfitLossStandardReport.md) over the journal lines carrying that project; lines without a project are left out (2047: Total LABA BERSIH 13.234.567 vs 12.834.567 in Laba/Rugi Standar, the difference being the 400.000 Beban Komisi line without project).
- Account rows zero in every column are hidden; parent subtotals as in the standard statement.
- Title line `Proyek : NL-K-P1, NL-K-P2` above the header on each page (page furniture).
- Same rules as Laba/Rugi Departemen (ProfitLossByDepartmentReport.md, Retail Demo) except the statement style (ADR-0035 finding 2).
## Seed
Kontraktor Demo, all `NL-K`: projects NL-K-P1/P2, Jurnal Umum JV.2047.01.00001 to JV.2047.04.00001 (project and no-project lines; one 1.234.567 other-income line), Per Proyek Anggaran B1-B3 (one amount with cents). Never mixed with other sandboxes.
## Verified / unverified
- Verified: zero diff on the body rows (page furniture stripped) against the 2047 capture.
- Unverified: branch filter other than all, department and data-classification filters, foreign currency, parent projects (sub-projects).
