# Penyesuaian Harga Jual (`SellingPriceAdjustmentDetailReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/price-t20.json`](fixtures/price-t20.json).
ERP: `apps/api/src/reports/pricing.ts` (`adjustmentDetail(…, "PRICE")`), documents `apps/api/src/sales/pricing.ts`; test: `apps/api/test/pricing.test.ts`.
Default-params capture: [`captures/SellingPriceAdjustmentDetailReport.json`](captures/SellingPriceAdjustmentDetailReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). Documents with Mulai Berlaku (date) in range.

## Layout and rules

One block per adjustment document, header repeated per block: Nomor/Kategori Penjualan, Mulai Berlaku/Berlaku di Cabang, Tanggal Berakhir, then `Kode # | Nama Barang | Harga Baru | Harga Lama | Harga Minimum`. **Harga Lama is the item master's default price (0), not the previous adjustment**: SPA.2035.12.00003 (120.000 → 125.000) still prints 0.

Source: Penyesuaian Harga/Diskon documents (`SPA.yyyy.mm.nnnnn`, type ITEM_PRICE_TYPE or ITEM_DISCOUNT_TYPE, price
category Umum, all branches). They post no journal.

## Open work

- Item default prices / minimum prices, end dates and multiple price categories are not modelled.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Demo data traced: SPA.2025.06.00001 (09 Jun 2025, Umum, all branches) sets Produk Harga Grosir (100038) from 50.000 to 45.000, minimum 40.000. Layout unchanged. See ADR-0029.
