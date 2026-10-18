# Perubahan Harga Beli Per Barang (`VendorPriceHistoryReport`)

Group: Pembelian. **Status: verified** (zero diff, 3 dates around two seeded price changes). Fixture: [`fixtures/vendor-price-t27.json`](fixtures/vendor-price-t27.json).
ERP: `apps/api/src/reports/payables.ts` (`vendorPriceHistory`), loader `loadVendorPrices`, service `createVendorPrice` (migration 0033);
test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`asOfDate` + `selectedItem` = array of `{id}` (NL-T4-B1 = 350).

## Layout

`Mulai Berlaku | Tanggal Berakhir | Pemasok | Mata Uang | Harga Lama | Harga Baru | Satuan`; per item a name row, then one
row per Harga Pemasok line dated by the as-of date, oldest first. An empty Tanggal Berakhir cell is dropped from the row.

## Calculation rules

- Source: Harga Pemasok documents (`/accurate/inventory/save-vendor-price.do`, number `VPA.yyyy.mm.nnnnn`; detail
  `detailItem[n].price` — sending `unitPrice` as well saves the price as 0). No journal.
- Harga Lama = the same vendor's previous price for the item; 0 for the first. Deleted documents do not count.

| As of | Rows |
|---|---|
| 30 Jun 2036 | header only |
| 10 Jul 2036 | 01 Jul 2036, 0 -> 15.000 |
| 31 Jul 2036 | 01 Jul 0 -> 15.000; 20 Jul 15.000 -> 18.000 |

## Open work

- End-effective dates, foreign currencies and several vendors per item are not captured.
