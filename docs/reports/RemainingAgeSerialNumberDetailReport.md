# Sisa Umur Per Nomor Produksi (`RemainingAgeSerialNumberDetailReport`)

Group: Persediaan. **Status: verified** (zero diff).
Fixture: [`fixtures/serial-t33.json`](fixtures/serial-t33.json). ERP: `apps/api/src/reports/serial-numbers.ts` (`remainingAgeSerials`), loader
`loadSerialMoves`; serials enter through purchase-invoice lines (`serials`, header `warehouse`, table `serial_numbers`,
migration 0036); test: `apps/api/test/purchases-2036.test.ts`.

Seed: Preferensi `featureSerialNumber` on; item NL-T33-SN (`manageSN: true`, `serialNumberType: UNIQUE`); PI.2036.11.00001
on 1 Nov 2036 with `detailSerialNumber: [{_status:'insert', serialNumberNo, quantity:1}]` per unit. The purchase template
receives into NL-Gudang B.

## Parameters

`asOfDate` + `selectedItem` = array of `{id}`.

## Layout

`Kode Barang : <no>`, `Nama Barang : <name>`, `No Seri/Produksi | Kuantitas | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120 | > 120`,
one row per serial number.

## Calculation rules

- Buckets are remaining shelf life up to the serial's expiry date. T33 serials have no expiry date, so every bucket
  prints 0 while the quantity prints 1.
- Captured on 10 and 30 Nov 2036. On 10 Nov Accurate already lists both serials received on 1 Nov.

## Open work

- Serials leaving stock (sales, transfers), batch numbers and expiry dates are not captured.
