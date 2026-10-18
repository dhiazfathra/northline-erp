# Stok Nomor Seri/Produksi per Gudang (`SerialNumberStockPerWarehouseReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberStockPerWarehouseReport.json`](captures/retail/SerialNumberStockPerWarehouseReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `serialStockPerWarehouse` in `apps/api/src/reports/serial-numbers.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Menampilkan daftar stok nomor seri/produksi per gudang per barang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedItem`: ITEM_SN_MULTI, default []

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040","selectedItem":[]}`

## Columns

Same columns as [SerialNumberStockReport](SerialNumberStockReport.md) with a warehouse level: `Kode Barang`, `Nama Barang`, then `No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`.

## Row grouping

Capture empty (default selection). By analogy with the unfiltered sibling, selecting items likely yields data per warehouse (GD. JAKARTA, GD. SURABAYA); not re-run.

Title lines: `Stok Nomor Seri/Produksi per Gudang`, `Per Tgl. 31 Des 2040`, `Kode Barang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified (capture empty; a selected-item run was only made for the non-warehouse report).

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: warehouse grouping, selection params, all numbers.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- Per item block, then per warehouse (name order, transit warehouse included) the serials and a one-cell quantity subtotal.
- Same Sisa Hari rule as SerialNumberStockReport (relative to as-of).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

