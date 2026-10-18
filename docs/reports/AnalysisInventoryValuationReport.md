# Analisa Nilai Persediaan (`AnalysisInventoryValuationReport`)

Group: Persediaan. **Status: verified** (zero diff on header + NL-T4 rows, 6 windows). Fixture: [`fixtures/stock-movement.json`](fixtures/stock-movement.json) (`AnalysisInventoryValuationReport`).
ERP: `apps/api/src/reports/inventory.ts` (`analysisValuation`); test: `apps/api/test/adjustments.test.ts`.

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). All warehouses.

## Layout

Two header rows: `Nama Barang | Saldo Awal | Penjualan | Pembelian | Produksi | Penyesuaian | Lainnya | Saldo Akhir`, then
`Kuantitas | Nilai` per column. One row per stock item in name order (every item, also without movement).

## Calculation rules (quantity and FIFO value, signed)

| Window | NL-T4 Barang A row |
|---|---|
| Okt-Nov 2033 | 0/0, sales -15 / -165.000 (FIFO cost), purchases 25 / 303.000, closing 10 / 138.000 |
| Des 2033 | sales return +2 / 29.200 under Penjualan; purchase return -1 / -13.000 under Pembelian |
| Jan-Jun 2034 | goods receipts +10 / 75.000 under Pembelian |
| Jul 2034 | adjustment +1 / 22.000 under Penyesuaian |
| Okt 2034 | delivery order -4 / -55.200 under Penjualan |
| Nov 2034 | transfers between warehouses: no change (they net to zero over all warehouses) |

- Saldo Awal = moves before `from`; Saldo Akhir = Saldo Awal + all columns.
- Values are the stock-move values (FIFO cost for issues, purchase cost for receipts, the return costing of ADR-0008).
