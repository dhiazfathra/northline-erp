# Nomor Produksi Segera Kadaluarsa (`SerialNumberExpiredSoonReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberExpiredSoonReport.json`](captures/retail/SerialNumberExpiredSoonReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `serialExpiredSoon` in `apps/api/src/reports/serial-numbers.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Menampilkan laporan Nomor seri/produksi yang akan segera kadaluarsa. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Per-item block `Kode Barang : / Nama Barang :` then `No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`.

## Row grouping

Capture empty: no serial with an expiry date in Retail Demo (serials seen in [SerialNumberStockReport](SerialNumberStockReport.md) have blank expiry).

Title lines: `Nomor Produksi Segera Kadaluarsa`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Kode Barang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified; `Sisa Hari(Kadaluarsa)` presumably expiry minus as-of days.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- Lists batches whose expiry date is within [start, end] and that still have stock; serials without expiry never appear.
- Sisa Hari counts whole days from the print moment (not the report dates): printed 19 Oct 2026 03:52 WIB, 15 Mar 2045 shows 6721 (calendar difference 6722 minus the part day). The fixture stores `printedAt` and the test passes it as `now`.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

