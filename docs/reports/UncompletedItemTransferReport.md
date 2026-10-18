# Barang Diterima Sebagian (`UncompletedItemTransferReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/UncompletedItemTransferReport.json`](captures/retail/UncompletedItemTransferReport.json).

Status: **verified** (zero diff on the Retail Demo 2045 seed). Fixture: [`fixtures/retail/inventory-re.json`](fixtures/retail/inventory-re.json). ERP: `uncompletedTransfers` in `apps/api/src/reports/inventory.ts`; test: `apps/api/test/inventory-re.test.ts`.

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

## ERP verification (2045 seed, ADR-0024)

Seed (Retail Demo, all 2045, prefix NL-RE): warehouses NL-RE Gudang A/B; items NL-RE-SN1 (unique serials) and NL-RE-BT1 (batch with expiry); PI.2045.01.00001 into Gudang A (S001-S003; B01 x6 exp 15 Mar 2045, B02 x4 exp 30 Jun 2045); IT.2045.02.00001 Kirim A->B (S001, S002, B01 x5) received by IT.2045.02.00002 with only S001 + B01 x5 (shortfall: S002 stays in transit); IT.2045.03.00001/00002 B->A B01 x2, fully received; Harga Pemasok VPA.2045.01.00001 and VPA.2045.04.00001 (end 30 Jun 2045).

- Only sends with at least one receipt and a line received short (`PARTIAL_RECEIVED`); sends still fully in transit and fully received ones do not print.
- All lines print; Kts Diterima = sum of receipt lines for the item, Sisa = Kuantitas - Kts Diterima (IT.2045.02.00001: SN1 2/1/1, BT1 5/5/0).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

