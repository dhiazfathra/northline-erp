# Selisih Saldo Akun Persediaan dengan Nilai Barang (`ItemValueToAccountBalanceDifferenceReport`)

Group: Persediaan. **Status: verified** under [ADR-0013](../decisions/0013-demo-inclusive-totals.md): the layout, the 0
difference, and the change in 110401 and item value between 30 Apr and 31 May 2036. Fixture:
[`fixtures/purchase-expense-t25.json`](fixtures/purchase-expense-t25.json) (`ItemValueToAccountBalanceDifferenceReport`).
ERP: `apps/api/src/reports/inventory.ts` (`itemValueDifference`); test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`startDate` / `endDate`. Balances are taken at the end date; the start date does not change them.

## Layout

`Nomor # | Tanggal | Tipe Transaksi | Keterangan | Nilai`, then:
- section `Selisih antara akun persediaan dengan nilai barang`
  - `Saldo Akun Persediaan`: one row per inventory account (`no | - | name | balance`) and its total
  - `Nilai barang`: one row `Nilai barang | - | Nilai barang Persediaan | -value` and its total
- the grand total `Total dari Selisih ...` = account balances - item value

## Calculation rules

- Inventory account balances at the end date, against the stock value of all items at the end date (negated).
- With every stock move journaled to its item's inventory account, the difference is 0 (as in every capture).
- 30 Apr to 31 May 2036: 110401 moves 193.695.750 -> 193.715.750 and item value 195.583.750 -> 195.603.750, both +20.000.
  These are the two T25 purchase item lines of 10.000.

## Open work

- Differences (a non-zero Selisih and the transaction list Accurate prints under it) are not captured.
