# Pergerakan Stok per Barang (`StockMovementByWarehouseReport`)

Group: Gudang. **Status: verified** (zero diff, 8 windows). Fixture: [`fixtures/stock-movement.json`](fixtures/stock-movement.json).
ERP: `apps/api/src/reports/inventory.ts` (`stockMovementByWarehouse`); test: `apps/api/test/adjustments.test.ts`.

## Parameters

`FROMTO` + `selectedWarehouse`: **an array of `{id}`** (`[{"id":50}]`). `null` errors ("invalid input syntax for type
bigint"), a bare object errors (HashMap cast). With several ids only the first warehouse is reported.

## Layout

`Nama Barang | Kuantitas Saldo Awal | Kuantitas Penjualan | Kuantitas Pembelian | Kuantitas Produksi | Kuantitas Pemindahan | Kuantitas Penyesuaian | Kuantitas Lainnya | Kuantitas Saldo Akhir`

One row per item with at least one stock move in the warehouse in the window (Aug–Sep 2034: no rows although
NL-T4-B1 held 22 units). Rows by item name. No totals.

## Calculation rules (signed quantities, that warehouse only)

| Column | Moves |
|---|---|
| Saldo Awal | all moves before `from` |
| Penjualan | sales invoices and delivery orders (out, negative) and **sales returns** (positive): Dec 2033 shows 2 |
| Pembelian | purchase invoices, goods receipts, and **purchase returns** (negative): Dec 2033 shows −1 |
| Pemindahan | item transfers (out to transit negative, in from transit positive) |
| Penyesuaian | inventory adjustments |
| Produksi / Lainnya | not exercised (0) |
| Saldo Akhir | Saldo Awal + all columns |

Header dates spell August "Agu" (`fmtHeaderDate`), as in other period headers.
