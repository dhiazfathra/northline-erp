# Rincian Pemindahan Barang (`ItemTransferDetailReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ItemTransferDetailReport.json`](captures/retail/ItemTransferDetailReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `transferDetail` in `apps/api/src/reports/inventory.ts`; test: `apps/api/test/inventory-re.test.ts`.

## Purpose

Laporan yang berisi pemindahan barang antar gudang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Per-transfer block: labels `No. Pemindahan # : <no>`, `Tanggal : <date>`, `Proses Pemindahan Barang : Kirim Barang | Terima Barang`, `Gudang Tujuan/Dari : <wh>`, `Alamat Tujuan/Dari`, `Gudang`, `Alamat Gudang`; lines `Kode Barang | Nama Barang | Kuantitas | Satuan`.

## Row grouping

One block and page per transfer, ascending by number (22 pages, `Halaman n dari 22`). Kirim (send) and Terima (receive) are separate documents: a receive doc references the sender warehouse in `Gudang Tujuan/Dari`.

Title lines: `Rincian Pemindahan Barang`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `No. Pemindahan #`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- 22 blocks = 22 transfers from `inventory/search-item-transfer.do` (rowCount 22; checked).
- Quantities: all Kirim documents total 468 units, Terima documents 467 (checked by parsing the capture): the 1-unit gap is IT.2016.12.00001 `9900008 Charger Iphone 6S Plus` sent 20, received 19 in IT.2016.12.00002; API status of IT.2016.12.00001 is `PARTIAL_RECEIVED` (Diterima Sebagian), all other Kirim docs `FULL_RECEIVED` (checked).
- For `Kirim Barang` the `Gudang Tujuan/Dari` cell is the destination (GD. SURABAYA for Jakarta -> Surabaya sends); for `Terima Barang` it is the origin (checked on 10 pairs).
- IT.2016.12.00004.1 is a receive document whose number has a `.1` suffix (revision/duplicate numbering quirk).

## Drill-down (ACC_DB=retail, read-only)

- `search-item-transfer.do` listing: `itemTransferTypeName` Kirim Barang / Terima Barang, `fromItemTransferNumber` links receive to sender, `itemTransferOutStatus` per send doc (FULL_RECEIVED x10, PARTIAL_RECEIVED x1).

## Verified / unverified

- Verified: 22 blocks, per-pair quantities, partial receipt.
- Unverified: multi-line blocks with more than 3 lines in other data, price/cost columns (none printed).

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- One page per transfer in number order, Kirim and Terima separate; labels and values print as one-cell rows (Jasper layout).
- `Gudang Tujuan/Dari` = reference warehouse; addresses are street lines + "city province zip" + country joined without separators.
- A receive document prints its own received quantity (1 of 2 for the shortfall).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

