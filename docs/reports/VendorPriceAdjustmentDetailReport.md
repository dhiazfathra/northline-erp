# Penyesuaian Harga Beli (`VendorPriceAdjustmentDetailReport`)

Group: Pembelian. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/VendorPriceAdjustmentDetailReport.json`](captures/retail/VendorPriceAdjustmentDetailReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `vendorPriceAdjustmentDetail` in `apps/api/src/reports/payables.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Menampilkan laporan harga beli barang. Daftar Laporan category: Pembelian; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Header block `Nomor # : | Mata Uang :`, `Mulai Berlaku : | Tanggal Berakhir :`, `Pemasok :`; lines `Kode # | Nama Barang | Harga Baru`.

## Row grouping

Empty: no vendor price adjustments in the date range (template only: labels with empty values).

Title lines: `Penyesuaian Harga Beli`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Nomor # : Mata Uang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified. Selling price adjustments exist in the tool README, but the purchase-side search endpoint was not found (3 guessed `search-*.do` paths returned 404), so absence of documents was not confirmed.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: existence of documents in Retail Demo, all behavior.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- One titled block per Harga Pemasok document dated in range; Mata Uang prints the currency name (`Indonesian Rupiah`).
- Tanggal Berakhir blank (cell dropped) unless an end date is set; Harga Baru en-US with up to 2 decimals (`22,750.5`); lines in entry order.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

