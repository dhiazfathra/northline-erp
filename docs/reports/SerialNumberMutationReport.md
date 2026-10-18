# Histori Nomor Seri/Produksi (`SerialNumberMutationReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberMutationReport.json`](captures/retail/SerialNumberMutationReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `serialMutation` in `apps/api/src/reports/serial-numbers.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Menampilkan histori mutasi nomor seri/produksi barang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).
- `selectedSerialnumber`: SERIALNUMBER_MULTI, default []

Params used for the capture (default over all history unless stated): `{"selectedSerialnumber":[]}`

## Columns

Header block `Nomor Seri/Produksi : <no> | Nama Barang : <name>`, `Kode Barang : <code>`, then `Tgl Transaksi | No. Transaksi Rincian Stok | Tipe Transaksi | Keterangan Rincian Stok | Masuk | Keluar | Saldo`.

## Row grouping

Capture empty: param `selectedSerialnumber=[]` (empty selection), probably one block per selected serial number with a running `Saldo`. Not re-run with a selected serial.

Title lines: `Histori Nomor Seri/Produksi`, `Nomor Seri/Produksi : Nama Barang :`, `Kode Barang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified. Running balance `Saldo` = previous + Masuk - Keluar is assumed.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior.

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- `selectedSerialnumber` = array of serial ids; one titled block per serial (serial order).
- Every warehouse leg is a row: a transfer prints the out-leg (Keluar) then the in-leg (Masuk) with the same number/description, so Saldo runs over all warehouses and returns to the total held.
- Descriptions: purchase `Pembelian dari <vendor>`; transfer `Kirim ke <ref>` / `Terima dari <ref>`. Last row: Masuk and Keluar totals.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

