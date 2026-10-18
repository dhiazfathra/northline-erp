# Umur Nomor Seri/Batch (`SerialNumberAgingDetailReport`)

Group: Persediaan. **Status: verified** (zero diff).
Fixture: [`fixtures/serial-t33.json`](fixtures/serial-t33.json). ERP: `apps/api/src/reports/serial-numbers.ts` (`serialAging`), loader
`loadSerialMoves`; serials enter through purchase-invoice lines (`serials`, header `warehouse`, table `serial_numbers`,
migration 0036); test: `apps/api/test/purchases-2036.test.ts`.

Seed: Preferensi `featureSerialNumber` on; item NL-T33-SN (`manageSN: true`, `serialNumberType: UNIQUE`); PI.2036.11.00001
on 1 Nov 2036 with `detailSerialNumber: [{_status:'insert', serialNumberNo, quantity:1}]` per unit. The purchase template
receives into NL-Gudang B.

## Parameters

`asOfDate` + `selectedItem` and `selectedWarehouse` = arrays of `{id}` (NL-Gudang B = 100, Utama = 50).

## Layout

`No Seri/Produksi No Seri | Tgl Transaksi Rincian Stok | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120 | > 120`, an item name row,
then per serial on hand: a row with the serial alone and a row `serial | receipt date | buckets`.

## Calculation rules

- Only serials on hand **in the selected warehouse** at the as-of date. Utama prints the header only, because the
  serials sit in NL-Gudang B.
- Age = as-of date - receipt date, in the same buckets as Rincian Umur Persediaan: 29 days (30 Nov 2036) is 1 - 30; 75
  days (15 Jan 2037) is 61 - 90. Before the receipt (31 Oct 2036), header only.

## Open work

- Serials leaving stock (sales, transfers), batch numbers and expiry dates are not captured.
