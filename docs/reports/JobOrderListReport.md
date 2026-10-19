# Daftar Pekerjaan Pesanan (`JobOrderListReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Manufaktur Demo** sandbox, 2026-10-19. Captures: 2049 seed rows in [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json) (`reports.JobOrderListReport`), empty default-param capture [`captures/JobOrderListReport.json`](captures/JobOrderListReport.json).

Status: **verified** (zero diff on the Manufaktur Demo 2049 NL-JC49 seed and on the empty default-param capture; P3.1, docs/goals/full-parity-v2.md). Fixture: [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json). ERP: `jobOrderList` in `apps/api/src/reports/job-costing.ts`, route `GET /api/reports/job-costing/job-order-list?from&to`; test: `apps/api/test/job-costing.test.ts`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the seed capture: `{"startDate":"01/01/2049","endDate":"31/12/2049","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}` (the report has no branch parameter; ignored); default capture: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.

## Columns

`Nomor # | Tanggal | Pelanggan | Keterangan | Status | Total`.

## Row grouping

One row per job order (JC) dated in range, in number order. No total row.

Title lines: `Daftar Pekerjaan Pesanan`, `Dari <dd MMM yyyy> s/d <dd MMM yyyy>`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>`. Manufaktur Demo prints the company name above the title; it is left out of the fixture.

## Calculation rules

- `Pelanggan` is the job order's customer; a job without one prints no cell (checked, JC2/JC3).
- `Status`: `Selesai` once a Penyelesaian Pesanan exists, otherwise `Sedang diproses`.
- `Total` = materials + expenses of the job order + Penambahan Bahan Baku picks - returns: JC.2049.01.00001 prints 62.500 = 55.000 + 10.000 (MA1 pick) - 2.500 (MA2 return) (checked).
- Numbers print id-ID (`62.500`); dates `dd MMM yyyy` with Indonesian month abbreviations.

## Verified / unverified

- Verified: every row of the NL-JC49 2049 capture and of the empty default-param capture.
- Unverified: several branches, multi-page blocks, quantities with decimals, portions that do not divide evenly.
