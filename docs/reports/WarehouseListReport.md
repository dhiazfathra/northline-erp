# Daftar Gudang (`WarehouseListReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/WarehouseListReport.json`](captures/retail/WarehouseListReport.json).

Status: existing module; spec + verify. Fixture: [`fixtures/retail/WarehouseListReport.json`](fixtures/retail/WarehouseListReport.json) (Retail Demo).

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

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

