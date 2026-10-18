# Daftar Gudang (`WarehouseListReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/WarehouseListReport.json`](captures/retail/WarehouseListReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `warehouseList` in `apps/api/src/reports/inventory.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Laporan yang berisi daftar Gudang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).

Params used for the capture (default over all history unless stated): `{}`

## Columns

`Nama | Alamat Lengkap | Deskripsi`

## Row grouping

One row per warehouse, no total: `GD. JAKARTA`, `GD. SURABAYA`. Addresses print with line breaks removed (joined without a space: `...No.39Penjaringan, Jakarta Utara - 14450Jakarta DKI Jakarta...`).

Title lines: `Daftar Gudang`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Rows match `inventory/search-warehouse.do`: 2 warehouses (default warehouse GD. JAKARTA, GD. SURABAYA), descriptions `GUDANG JAKARTA` / `GUDANG SURABAYA` (checked: both rows and addresses).
- `PIC` and the user list (present in the API) are not printed.

## Drill-down (ACC_DB=retail, read-only)

- `inventory/search-warehouse.do` rowCount 2.

## Verified / unverified

- Verified: both rows against the warehouse search API.
- Unverified: suspended warehouses inclusion, sort rule.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- All warehouses by name, plus `Transit (AOL System)` with description `Barang dalam perjalanan pindah barang atau klaim ke pemasok` and no address (appears once transit is in use).
- Alamat Lengkap = street lines + "city province zip" + country joined without separators.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

