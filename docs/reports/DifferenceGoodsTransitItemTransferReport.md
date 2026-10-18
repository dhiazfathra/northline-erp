# Perbedaan Persediaan Terkirim Pemindahan Barang (`DifferenceGoodsTransitItemTransferReport`)

Group: Pemeriksaan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/DifferenceGoodsTransitItemTransferReport.json`](captures/retail/DifferenceGoodsTransitItemTransferReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `transitDifference` in `apps/api/src/reports/inventory.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Menampilkan daftar pindah barang yang sudah diproses namun jurnal akun persediaan terkirim ada perbedaan. Daftar Laporan category: Pemeriksaan; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040"}`

## Columns

`Tanggal | No. Kirim # | No. Terima # | Selisih`

## Row grouping

Empty in Retail Demo, also when re-run with asOfDate 31/12/2016 (checked, 1 run). Title `Perbedaan Persediaan Terkirim Pemindahan Barang`, subtitle `Per Tgl. 31 Des 2040`.

Title lines: `Perbedaan Persediaan Terkirim Pemindahan Barang`, `Per Tgl. 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Surprising: Retail Demo has a 1-unit transfer shortfall (IT.2016.12.00001 sent 20, received 19), yet the report is empty. Hypothesis: it lists only value differences on goods in transit under a perpetual in-transit costing option that the sandbox does not use; unverified.

## Drill-down (ACC_DB=retail, read-only)

- Ran `report.mjs DifferenceGoodsTransitItemTransferReport '{"asOfDate":"31/12/2016"}'`: header only.
- The P&L (all history) has an account `Beban Selisih Nilai barang (Item Transfer)` 768,544.36 (see [ProfitLossByBranchReport](ProfitLossByBranchReport.md)), so transfer value differences are posted somewhere; not linked to this report.

## Verified / unverified

- Verified: empty output at two as-of dates.
- Unverified: layout with data, trigger conditions, whether the 768,544.36 relates.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- Header only for the 2045 seed, also with a 1-unit shortfall still in transit: Retail Demo posted no journal for these transfers (AllJournalReport Jan-Mar 2045 lists only the purchase invoice), so there is no in-transit value to differ.
- The 2016 demo transfers do journal (Dr Barang Terkirim / Cr Persediaan, receipt with a 0 line to Beban Selisih Nilai barang); the trigger for a non-zero Selisih is still unobserved. The ERP prints the header only (shortcut in code).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

