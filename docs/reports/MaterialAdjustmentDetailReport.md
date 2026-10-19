# Rincian Penambahan Bahan Baku (`MaterialAdjustmentDetailReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Manufaktur Demo** sandbox, 2026-10-19. Captures: 2049 seed rows in [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json) (`reports.MaterialAdjustmentDetailReport`), empty default-param capture [`captures/MaterialAdjustmentDetailReport.json`](captures/MaterialAdjustmentDetailReport.json).

Status: **verified** (zero diff on the Manufaktur Demo 2049 NL-JC49 seed and on the empty default-param capture; P3.1, docs/goals/full-parity-v2.md). Fixture: [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json). ERP: `materialAdjustmentDetail` in `apps/api/src/reports/job-costing.ts`, route `GET /api/reports/job-costing/material-adjustment-detail?from&to`; test: `apps/api/test/job-costing.test.ts`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default [] (not modelled: one branch).

Params used for the seed capture: `{"startDate":"01/01/2049","endDate":"31/12/2049","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`; default capture: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

## Columns

Block header `Nomor # : <MA no> | Tipe : <type>`, `No Batch # : <JC no> | Keterangan : <desc>`, `Tanggal : <date>`; lines `Kode Barang | Nama Barang | Kuantitas | Satuan`.

## Row grouping

One block (one page) per adjustment dated in range. With nothing in range the report still prints one empty block (labels only).

Title lines: `Rincian Penambahan Bahan Baku`, `Dari <dd MMM yyyy> s/d <dd MMM yyyy>`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>`. Manufaktur Demo prints the company name above the title; it is left out of the fixture.

## Calculation rules

- Quantities print unsigned for both types (MA2 Retur Barang prints `1`); no cost column (checked).
- Cost rule (ERP, not printed here): a pick is issued at FIFO cost; a return comes back at the job's average issued unit cost of that item (MA2: 2.500 = 1 x 10.000/4). Histori Pekerjaan Pesanan shows -2.500 for it.
- Numbers print id-ID (`62.500`); dates `dd MMM yyyy` with Indonesian month abbreviations.

## Verified / unverified

- Verified: every row of the NL-JC49 2049 capture and of the empty default-param capture.
- Unverified: several branches, multi-page blocks, quantities with decimals, portions that do not divide evenly.
