# Daftar Proyek (`ProjectListReport`)
Group: Lain-lain. Reverse-engineered Accurate Online, **Kontraktor Demo** sandbox, 2026-10-19. Default capture: [`captures/contractor/ProjectListReport.json`](captures/contractor/ProjectListReport.json).
Status: verified (Kontraktor Demo, ADR-0035). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/dimensions.ts` `projectList`.
## Purpose
Laporan yang berisi daftar proyek. Daftar Laporan category: Lain-lain; view type `report`.
## Params
Date kind `NONE`.
- none

Wire: No parameters.
Params used for the fixture (NL-K seed, 2047):
- `ProjectListReport`: `{}`
## Rules
- Columns Nama, Keterangan; one row per Proyek (dimension master) by name; an empty Keterangan prints no cell.
- Demo default capture is empty: the demo has no Proyek, only a contractor project.
## Seed
Kontraktor Demo, all `NL-K`: projects NL-K-P1/P2, Jurnal Umum JV.2047.01.00001 to JV.2047.04.00001 (project and no-project lines; one 1.234.567 other-income line), Per Proyek Anggaran B1-B3 (one amount with cents). Never mixed with other sandboxes.
## Verified / unverified
- Verified: zero diff on the body rows (page furniture stripped) against the 2047 capture.
- Unverified: branch filter other than all, department and data-classification filters, foreign currency, parent projects (sub-projects).
