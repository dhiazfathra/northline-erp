# Retur Penjualan per Penjual (`SalesReturnListBySalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesReturnListBySalesmanReport.json`](captures/retail/SalesReturnListBySalesmanReport.json).

Status: blocked: requires Salesman on invoice.

## Purpose

Menampilkan daftar retur penjualan grup per Penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `Tanggal` | `Pelanggan` | `Total`

## Row grouping

Empty: Retail Demo has no sales returns attributed to a salesman in the range (header `Nomor # | Tanggal | Pelanggan | Total` printed only).

Title lines: `Retur Penjualan per Penjual`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified. Other Retail Demo reports show sales-return postings exist ([ProfitLossByBranchReport](ProfitLossByBranchReport.md) `Retur Penjualan` -29,022,654.61), so returns without a salesman are excluded or the salesman is not stored on returns; not traced.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: grouping, subtotal rows, why returns on the ledger are absent.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

