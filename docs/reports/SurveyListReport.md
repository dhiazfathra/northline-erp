# Daftar Survei Proyek (`SurveyListReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/SurveyListReport.json`](captures/contractor/SurveyListReport.json).

Status: spec (Kontraktor Demo), not built — blocked: requires Contractor Projects (ADR-0034).

## Purpose

Laporan yang berisi daftar survei proyek kontraktor.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy; captured `01/01/2000` to `31/12/2040`, prints `Dari 01 Jan 2000 s/d 31 Des 2040`).
- `selectedBranch`: `BRANCH_MULTI_WITH_ALL_BRANCH`, default `[]`; wire `[{"name":"[Semua Cabang]","id":null}]`, prints `Cabang : [Semua Cabang]`.

## Columns

`Tanggal` | `Nomor #` | `No. Proyek` | `Progres (Survei)` | `Keterangan` | `Surveyor`

## Row grouping

Flat, one row per survey document (PSV.yyyy.MM.nnnnn), date ascending in the capture. Demo: PSV.2026.05.00001 (09 Mei), 00002 (12 Mei), 00003 (14 Mei), all PRC.2026.06.00001, surveyor Sumarno Waluyo, `Progres (Survei)` 100 each.

## Calculation rules

- `Progres (Survei)` = the survey's `Total Progress` shown in [ContractorSurveyDetailReport](ContractorSurveyDetailReport.md) (100 for all three; verified match).
- Each survey covers a different RAB task (Pemasangan Panel, Instalasi Inverter, Instalasi Battery & PLN), so 100 means that survey's lines are complete, not that the project is 100% (inferred; all samples are 100).
- No totals row.

## Verified / unverified

- Verified: 3 rows cross-checked with the detail report (dates, numbers, surveyor, progress).
- Unverified: partial progress, filter column for dates, branch filter, number-format when progress has decimals.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, period/branch lines, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Des`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Survey document: number, date, contractor project, surveyor (name), description, total progress %, branch; lines in [ContractorSurveyDetailReport](ContractorSurveyDetailReport.md).
