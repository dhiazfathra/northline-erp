# Stok Nomor Seri/Produksi per Barang (`SerialNumberStockPerItemReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberStockPerItemReport.json`](captures/retail/SerialNumberStockPerItemReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `serialStockPerItem` in `apps/api/src/reports/serial-numbers.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Menampilkan daftar stok nomor seri/produksi per barang per gudang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedWarehouse`: WAREHOUSE, default null

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040"}`

## Columns

`No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`

## Row grouping

Capture empty (title `Stok Nomor Seri/Produksi per Barang`, subtitle `Per Tgl. 31 Des 2040`). Run once more with the same params: still empty (checked). No item filter in the param list (as-of only); why it is empty while the item-filtered sibling returns 82 serials is unknown.

Title lines: `Stok Nomor Seri/Produksi per Barang`, `Per Tgl. 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: whether an item selection is required (not in the Daftar Laporan param list captured), all data.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- `selectedWarehouse` must be an array of `{id}` (an object fails server-side with a cast error); the default null prints nothing (why the original capture was empty).
- Per warehouse (name order), per item (name order) the serials, then a one-cell quantity subtotal; Sisa Hari relative to as-of.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

