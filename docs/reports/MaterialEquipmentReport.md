# Daftar Bahan Baku Terpakai (`MaterialEquipmentReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/MaterialEquipmentReport.json`](captures/contractor/MaterialEquipmentReport.json).

Status: verified (Kontraktor Demo, ADR-0038). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json) (`contractor`); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/contractor.ts` `materialEquipmentList`.

## Purpose

Laporan yang berisi daftar bahan baku terpakai kontraktor.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy; captured `01/01/2000` to `31/12/2040`, prints `Dari 01 Jan 2000 s/d 31 Des 2040`).
- `selectedBranch`: `BRANCH_MULTI_WITH_ALL_BRANCH`, default `[]`; wire `[{"name":"[Semua Cabang]","id":null}]`, prints `Cabang : [Semua Cabang]`.

## Columns

`Tanggal` | `Nomor #` | `No. Proyek` | `Keterangan`

## Row grouping

Flat, one row per material-usage document (MEQ.yyyy.MM.nnnnn). Demo: MEQ.2026.05.00001 (08 Mei), MEQ.2026.05.00003 (12 Mei), MEQ.2026.05.00004 (14 Mei), all PRC.2026.06.00001. **MEQ.2026.05.00002 is absent** (numbering gap; deleted/other-project/draft, unknown).

## Calculation rules

- Listing only, no amounts. Values (journal posting, 246.000 / 255.000 / 507.000) show in [ProjectContractorJournalReport](ProjectContractorJournalReport.md) as `Bahan Baku Terpakai`; lines in [MaterialEquipmentDetailReport](MaterialEquipmentDetailReport.md).
- Descriptions are free text (typos preserved, e.g. `epmasangan`).

## Verified / unverified

- Verified: the 3 documents match the detail report and journal numbers/dates.
- Unverified: cause of the MEQ 00002 gap; branch/date filters.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, period/branch lines, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Des`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Material-usage document: number, date, contractor project, description, branch, lines (item, qty, unit, warehouse, RAB task) with stock-valued cost posted to project-in-progress.
