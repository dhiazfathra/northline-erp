# Ringkasan Pemindahan Barang (`ItemTransferListReport`)

Group: Gudang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox, multi-warehouse enabled), 2026-10-18. Fixture:
[`fixtures/transfer-t15.json`](fixtures/transfer-t15.json) (IT.2034.11.00001 Kirim Utama → NL-Gudang B, IT.2034.11.00002 Terima).
ERP: `transferList` in `apps/api/src/reports/inventory.ts`, `createItemTransfer`; test: `apps/api/test/adjustments.test.ts`.

Columns `Tanggal` | `No. Pemindahan #` | `Proses` (`Kirim Barang` / `Terima Barang`) | `Gudang` | `Gudang Tujuan/Dari`.

Transfers post **no journal**. Sending moves stock from the source warehouse into `Transit (AOL System)`; receiving moves it
from transit into the destination. Stock card rows: type `Pemindahan Barang`, descriptions `Kirim ke <wh>` / `Terima dari <wh>`.
