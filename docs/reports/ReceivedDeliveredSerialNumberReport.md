# Mutasi Nomor Seri/Produksi (`ReceivedDeliveredSerialNumberReport`)

Group: Persediaan. **Status: verified** (zero diff).
Fixture: [`fixtures/serial-t33.json`](fixtures/serial-t33.json). ERP: `apps/api/src/reports/serial-numbers.ts` (`receivedDeliveredSerials`), loader
`loadSerialMoves`; serials enter through purchase-invoice lines (`serials`, header `warehouse`, table `serial_numbers`,
migration 0036); test: `apps/api/test/purchases-2036.test.ts`.

Seed: Preferensi `featureSerialNumber` on; item NL-T33-SN (`manageSN: true`, `serialNumberType: UNIQUE`); PI.2036.11.00001
on 1 Nov 2036 with `detailSerialNumber: [{_status:'insert', serialNumberNo, quantity:1}]` per unit. The purchase template
receives into NL-Gudang B.

## Parameters

`startDate` / `endDate` + `selectedItem` = array of `{id}` (NL-T33-SN = 403).

## Layout

`Kode Barang : <no>`, `Nama Barang : <name>`, `Tanggal | Tipe Transaksi | Nomor Seri/Produksi | Kuantitas`, a section
`Terima Barang` with one row per serial received (date, document type, serial, 1), then a one-cell quantity total. With
no move in the window the labels print with empty values.

## Calculation rules

- Window on the document date: 1-30 Nov 2036 lists both serials (total 2); 15-30 Nov 2036 is empty.
- Outgoing moves (Kirim Barang) are not captured yet.

## Open work

- Serials leaving stock (sales, transfers), batch numbers and expiry dates are not captured.
