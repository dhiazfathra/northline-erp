# Perubahan Harga Jual Per Barang (`SellingPriceAdjustmentHistoryReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/price-t20.json`](fixtures/price-t20.json).
ERP: `apps/api/src/reports/pricing.ts` (`priceHistory`), documents `apps/api/src/sales/pricing.ts`; test: `apps/api/test/pricing.test.ts`.
Default-params capture: [`captures/SellingPriceAdjustmentHistoryReport.json`](captures/SellingPriceAdjustmentHistoryReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). Documents with Mulai Berlaku (date) in range.

## Layout and rules

Per item (name heading), each price change in range: `Mulai Berlaku | Kategori Penjualan | Mata Uang | Harga Lama | Harga Baru | Satuan`. Here **Harga Lama is the previous adjusted price** (0 before the first).

Source: Penyesuaian Harga/Diskon documents (`SPA.yyyy.mm.nnnnn`, type ITEM_PRICE_TYPE or ITEM_DISCOUNT_TYPE, price
category Umum, all branches). They post no journal.

## Open work

- Item default prices / minimum prices, end dates and multiple price categories are not modelled.
