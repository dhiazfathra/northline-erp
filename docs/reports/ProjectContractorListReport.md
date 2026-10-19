# Daftar Proyek Kontraktor (`ProjectContractorListReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/ProjectContractorListReport.json`](captures/contractor/ProjectContractorListReport.json).

Status: verified (Kontraktor Demo, ADR-0038). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json) (`contractor`); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/contractor.ts` `projectContractorList`.

## Purpose

Laporan yang berisi daftar proyek kontraktor. Category Proyek Kontraktor; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy; captured `01/01/2000` to `31/12/2040`, prints `Dari 01 Jan 2000 s/d 31 Des 2040`).
- `selectedBranch`: `BRANCH_MULTI_WITH_ALL_BRANCH`, default `[]`; wire `[{"name":"[Semua Cabang]","id":null}]`, prints `Cabang : [Semua Cabang]`.

## Columns

`No. Proyek` | `Nama` | `Target Mulai` | `Tanggal Selesai` | `Keterangan`

## Row grouping

Flat, one row per contractor project; no totals. Demo: PRC.2026.06.00001 `Instalasi Solar 16K Wp - OffGrid`, 04 Mei 2026, 22 Mei 2026, `Panel 16500 WpBattery 48 KWH`.

## Calculation rules

- Pure listing. The date range filters on an unknown project date (inferred: Target Mulai); not tested.
- Number format: project number `PRC.yyyy.MM.nnnnn`; note PRC.**2026.06** while Target Mulai is **May** — the number period is the creation month, not the start month (inferred, 1 sample).
- Tanggal Selesai (22 Mei) differs from the FPC closing date (01 Jul 2026, see [ProjectContractorJournalReport](ProjectContractorJournalReport.md)): it is a planned/entered end date, not the completion posting date (inferred).

## Verified / unverified

- Verified (by reading): 1 row, values copied from the capture.
- Unverified: date-filter column, branch filter, multi-row ordering, empty Tanggal Selesai.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, period/branch lines, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Des`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Contractor project: number, name, target start, end date, description, branch.
