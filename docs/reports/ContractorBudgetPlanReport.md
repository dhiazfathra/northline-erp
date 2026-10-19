# Daftar Anggaran (`ContractorBudgetPlanReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/ContractorBudgetPlanReport.json`](captures/contractor/ContractorBudgetPlanReport.json).

Status: verified (Kontraktor Demo, ADR-0038). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json) (`contractor`); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/contractor.ts` `contractorBudgetPlan`.

## Purpose

Laporan yang berisi daftar anggaran proyek kontraktor (RAB).

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy; captured `01/01/2000` to `31/12/2040`, prints `Dari 01 Jan 2000 s/d 31 Des 2040`).
- `selectedBranch`: `BRANCH_MULTI_WITH_ALL_BRANCH`, default `[]`; wire `[{"name":"[Semua Cabang]","id":null}]`, prints `Cabang : [Semua Cabang]`.

## Columns

`Tanggal` | `Nomor #` | `No. Proyek` | `Nama Proyek Kontraktor` | `Total RAB` | `Progress` | `Keterangan`

## Row grouping

Flat, one row per RAB document (BGP.yyyy.MM.nnnnn). Demo: 20 Jun 2026, BGP.2026.06.00001, PRC.2026.06.00001, `Instalasi Solar 16K Wp - OffGrid`, Total RAB 196.093.260. `Progress` and `Keterangan` cells are empty (omitted from the capture).

## Calculation rules

- **Total RAB (196.093.260) does not equal the plan total of [ProjectBudgetComparisonReport](ProjectBudgetComparisonReport.md) (170.778.000)**: difference 25.315.260, ratio 1,14823 (python). Total RAB is therefore not the sum of the cost-plan lines; probably the selling-price total (cost + margin/tax) (inferred, unproven).
- It is also not equal to receipts 196.066.600 (diff 26.660).
- No totals row for one document.

## Verified / unverified

- Verified: arithmetic above. Unverified: what `Progress` prints when filled; how Total RAB is derived; multiple RABs per project.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, period/branch lines, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Des`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

RAB (budget plan) header: number, date, contractor project, total (selling) amount, progress, description. Lines with task hierarchy are in [ProjectBudgetComparisonReport](ProjectBudgetComparisonReport.md).
