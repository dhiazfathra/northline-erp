# Rincian Akun Penyelesaian Pesanan (`RollOverAccountDetailReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Manufaktur Demo** sandbox, 2026-10-19. Captures: 2049 seed rows in [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json) (`reports.RollOverAccountDetailReport`), empty default-param capture [`captures/RollOverAccountDetailReport.json`](captures/RollOverAccountDetailReport.json).

Status: **verified** (zero diff on the Manufaktur Demo 2049 NL-JC49 seed and on the empty default-param capture; P3.1, docs/goals/full-parity-v2.md). Fixture: [`fixtures/jobcosting-m49.json`](fixtures/jobcosting-m49.json). ERP: `rollOverAccountDetail` in `apps/api/src/reports/job-costing.ts`, route `GET /api/reports/job-costing/roll-over-account-detail?from&to`; test: `apps/api/test/job-costing.test.ts`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default [] (not modelled: one branch).

Params used for the seed capture: `{"startDate":"01/01/2049","endDate":"31/12/2049","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`; default capture: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

## Columns

Block header `Nomor # : <RO no> | No Pekerjaan # : <JC no>`, `Tanggal : <date>`; lines `Nama Biaya | Kode Perkiraan Akun Perkiraan | Porsi [%] | Alokasi Biaya`.

## Row grouping

One block per roll-over to accounts dated in range. Empty range: one empty block.

Title lines: `Rincian Akun Penyelesaian Pesanan`, `Dari <dd MMM yyyy> s/d <dd MMM yyyy>`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>`. Manufaktur Demo prints the company name above the title; it is left out of the fixture.

## Calculation rules

- `Porsi [%]` prints with a ` %` suffix (`70 %`), unlike the item report (checked).
- `Alokasi Biaya` = job total x portion: RO.2049.02.00002 70% 17.500, 30% 7.500 of 25.000 (checked).
- Accurate refuses an account that is one of the job's own expense accounts ("Akun ini merupakan akun rincian biaya pada pekerjaan pesanan"); the ERP raises the same.
- Numbers print id-ID (`62.500`); dates `dd MMM yyyy` with Indonesian month abbreviations.

## Verified / unverified

- Verified: every row of the NL-JC49 2049 capture and of the empty default-param capture.
- Unverified: several branches, multi-page blocks, quantities with decimals, portions that do not divide evenly.
