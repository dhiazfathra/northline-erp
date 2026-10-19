# Rincian Survei Proyek (`ContractorSurveyDetailReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/ContractorSurveyDetailReport.json`](captures/contractor/ContractorSurveyDetailReport.json).

Status: verified (Kontraktor Demo, ADR-0038). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json) (`contractor`); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/contractor.ts` `contractorSurveyDetail`.

## Purpose

Laporan yang berisi rincian survei proyek.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy; captured `01/01/2000` to `31/12/2040`, prints `Dari 01 Jan 2000 s/d 31 Des 2040`).
- `selectedBranch`: `BRANCH_MULTI_WITH_ALL_BRANCH`, default `[]`; wire `[{"name":"[Semua Cabang]","id":null}]`, prints `Cabang : [Semua Cabang]`.

## Columns

Header block per survey (label : value pairs): `Tanggal` / `Nama Proyek`; `Nomor #` / `Nama Surveyor`; `No. Proyek` / `Total Progress`. Lines: `Keterangan` | `Volume` | `Progress(Kts)` | `Satuan` | `Progress (%)`.

## Row grouping

One page per survey (3 pages). Inside: RAB task name (without the Roman numeral, unlike [ProjectContractorProgressReport](ProjectContractorProgressReport.md)), then lines.
- PSV.2026.05.00001 (09 Mei): Pemasangan Panel: Konstruksi 1/1 LS, PV Solar Lesso 550Wp 32/32 PCS, Jasa Pasang 7/7 Hari.
- PSV.2026.05.00002 (12 Mei): Instalasi Inverter: Deye 10KW 1/1 PCS, SCC Epever 100A 3/3 PCS.
- PSV.2026.05.00003 (14 Mei): Instalasi Battery & PLN: Shoto Battery 12/12 PCS, Battery to Inverter 1/1 LS, Inverter to PLN 10/10 Meter.

## Calculation rules

- `Progress (%)` = Progress(Kts) / Volume x 100 (inferred; all 100). `Total Progress` = 100 on every survey (inferred as weighted/average of lines; not distinguishable from the data).
- Volumes match RAB line quantities in [ProjectBudgetComparisonReport](ProjectBudgetComparisonReport.md) (32 panel, 7 hari, 1 inverter, 3 SCC, 12 battery; verified). Note the lines are RAB *task* lines (work items), not the material lines under them.

## Verified / unverified

- Verified: volumes vs RAB quantities; `Total Progress` vs [SurveyListReport](SurveyListReport.md).
- Unverified: partial progress, cumulative vs per-survey progress when several surveys hit the same line.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, period/branch lines, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Des`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Survey with lines linked to RAB task lines: volume, cumulative progress qty, unit, progress %; surveyor; total progress.
