# Penyesuaian Harga Jual per Kategori (`SellingPriceAdjustmentDetailPerCategoryReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/price-t20.json`](fixtures/price-t20.json).
ERP: `apps/api/src/reports/pricing.ts` (`adjustmentPerCategory(…, "PRICE")`), documents `apps/api/src/sales/pricing.ts`; test: `apps/api/test/pricing.test.ts`.
Default-params capture: [`captures/SellingPriceAdjustmentDetailPerCategoryReport.json`](captures/SellingPriceAdjustmentDetailPerCategoryReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). Documents with Mulai Berlaku (date) in range.

## Layout and rules

`Nama Barang | Nomor # | Mulai Berlaku | <one column per price category>`; items by name, each adjustment line in date order; the item name prints only on the item's first row.

Source: Penyesuaian Harga/Diskon documents (`SPA.yyyy.mm.nnnnn`, type ITEM_PRICE_TYPE or ITEM_DISCOUNT_TYPE, price
category Umum, all branches). They post no journal.

## Open work

- Item default prices / minimum prices, end dates and multiple price categories are not modelled.
