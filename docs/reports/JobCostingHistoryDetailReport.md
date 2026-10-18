# Histori Pekerjaan Pesanan (`JobCostingHistoryDetailReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/JobCostingHistoryDetailReport.json`](captures/retail/JobCostingHistoryDetailReport.json).

Status: **verified** (zero diff on the Retail Demo 2047 seed, except the order among a job's material lines (see below); ADR-0026). Fixture: [`fixtures/retail/jobcosting-rg.json`](fixtures/retail/jobcosting-rg.json). ERP: `jobCostingHistory` in `apps/api/src/reports/job-costing.ts`; test: `apps/api/test/job-costing.test.ts`.

## Purpose

Laporan Histori Pekerjaan Pesanan. Daftar Laporan category: Pekerjaan Pesanan; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

Block header `Batch No. : <JC no> | Status : Selesai`, `Tanggal Pekerjaan | Keterangan`, `Tanggal Selesai | Total Pesanan`; lines `Tanggal | Kode | Bahan dan Biaya | Kuantitas | Unit | Alokasi (%) | Biaya | Tipe Transaksi`.

## Row grouping

One block per job-costing batch (JC.2016.12.00001, JC.2017.01.00001 ...): `Pengeluaran Barang` lines (materials issued) then `Penyelesaian Pesanan` (finished item, with `Alokasi (%)` 100).

Title lines: `Histori Pekerjaan Pesanan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- JC.2016.12.00001 `Total Pesanan` 6,486,947.11 = 47,500 + 6,439,447.11 material issues (checked).
- Finished item line `Penyelesaian Pesanan`: Iphone 5 64 GB + Antigores qty 1 at 3,847,500 while material issued is 6,486,947.11: the finished value is NOT equal to the material cost (and in JC.2017.01.00001 finished 942,126,946.31 > materials 635,720,816.89 per [FinishedJobCostByMonth](FinishedJobCostByMonth.md)). Surprising; how the finished value is set (standard cost?) is unverified.

## Verified / unverified

NL-RG seed (2047, fixture above):
- Status `Selesai` once a Penyelesaian Pesanan exists, otherwise `Sedang diproses`; an open job prints `Tanggal Selesai :` with no date (checked, NL-RG-JC2).
- Expense lines print first: `Kode` is the expense account (511.000-04), no Unit, type `Pengeluaran Barang`.
- The finished line's `Biaya` is the job total x `Alokasi (%)` on the NL-RG seed (55,000 = 40,000 materials + 15,000 expense, 100%). The demo's finished values differ from their material cost; that rule is still unverified.
- Order among material lines is not stable in Accurate: NL-RG-JC1 prints seq 2 then 1, NL-RG-JC2 seq 1 then 2, with ids ascending in both. The ERP prints seq order and the test compares material lines sorted by code (ADR-0026).

Demo capture:

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: allocation percentages other than 100, labor/overhead cost lines, status values other than `Selesai`.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

