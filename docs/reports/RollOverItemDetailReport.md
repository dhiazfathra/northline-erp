# Rincian Barang Penyelesaian Pesanan (`RollOverItemDetailReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Manufaktur Demo** sandbox, 2026-10-19. Captures: 2049 seed rows in [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json) (`reports.RollOverItemDetailReport`), empty default-param capture [`captures/RollOverItemDetailReport.json`](captures/RollOverItemDetailReport.json).

Status: **verified** (zero diff on the Manufaktur Demo 2049 NL-JC49 seed and on the empty default-param capture; P3.1, docs/goals/full-parity-v2.md). Fixture: [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json). ERP: `rollOverItemDetail` in `apps/api/src/reports/job-costing.ts`, route `GET /api/reports/job-costing/roll-over-item-detail?from&to`; test: `apps/api/test/job-costing.test.ts`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default [] (not modelled: one branch).

Params used for the seed capture: `{"startDate":"01/01/2049","endDate":"31/12/2049","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`; default capture: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

## Columns

Block header `Nomor # : <RO no> | No Pekerjaan # : <JC no>`, `Tanggal : <date>`; lines `Nama Barang | Kode Barang Barang & Jasa | Porsi [%] | Alokasi Biaya`.

## Row grouping

One block per roll-over to items dated in range (roll-overs to accounts are left out). Empty range: one empty block.

Title lines: `Rincian Barang Penyelesaian Pesanan`, `Dari <dd MMM yyyy> s/d <dd MMM yyyy>`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>`. Manufaktur Demo prints the company name above the title; it is left out of the fixture.

## Calculation rules

- `Alokasi Biaya` = job total (with picks/returns) x `Porsi [%]`; the last line takes the rounding remainder: RO.2049.02.00001 60% 37.500, 40% 25.000 of 62.500 (checked).
- `Porsi [%]` prints as a plain number (`60`).
- Numbers print id-ID (`62.500`); dates `dd MMM yyyy` with Indonesian month abbreviations.

## Verified / unverified

- Verified: every row of the NL-JC49 2049 capture and of the empty default-param capture.
- Unverified: several branches, multi-page blocks, quantities with decimals, portions that do not divide evenly.
