# Barang Diterima Sebagian (`UncompletedItemTransferReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/UncompletedItemTransferReport.json`](captures/retail/UncompletedItemTransferReport.json).

Status: existing module; spec + verify. Fixture: [`fixtures/retail/UncompletedItemTransferReport.json`](fixtures/retail/UncompletedItemTransferReport.json) (Retail Demo).

## Purpose

Laporan yang berisi pemindahan barang antar gudang dimana barang diterima sebagian. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Block header `No. Pemindahan # : <no> | Gudang Tujuan/Dari : <wh>`, `Tanggal : | Gudang :`, `Proses Pemindahan Barang : Kirim Barang | No. Terima # : <doc>`; lines `Kode Barang | Nama Barang | Kuantitas | Satuan | Kts Diterima | Sisa`.

## Row grouping

Title `Barang Diterima Sebagian`; filter line `Filter berdasarkan : Proses Pemindahan Barang, Status Pemindahan Barang`. One block per partially received send document; all its lines are printed (including fully received lines).

Title lines: `Barang Diterima Sebagian`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Filter berdasarkan : Proses Pemindahan Barang, Status Pemindahan Barang`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Retail Demo has one: IT.2016.12.00001 (11 Des 2016, GD. JAKARTA -> GD. SURABAYA), receive doc IT.2016.12.00002: Charger Iphone 6S Plus 20 sent, 19 received, `Sisa` 1; Anti Gores Iphone 5S 20 sent, 20 received, `Sisa` 0 (checked: `Sisa` = Kuantitas - Kts Diterima, and equals the item transfer detail receive quantities).
- Only `PARTIAL_RECEIVED` documents appear (the 10 other sends are `FULL_RECEIVED` in the API; checked).

## Drill-down (ACC_DB=retail, read-only)

- Status from `search-item-transfer.do` `itemTransferOutStatus`; quantities from [ItemTransferDetailReport](ItemTransferDetailReport.md).

## Verified / unverified

- Verified: the single block and its arithmetic.
- Unverified: behaviour with several partial receipts or multiple receive docs per send.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

