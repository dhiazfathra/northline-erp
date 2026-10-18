# Histori Nomor Seri/Produksi (`SerialNumberMutationReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberMutationReport.json`](captures/retail/SerialNumberMutationReport.json).

Status: existing module; spec + verify.

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

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

