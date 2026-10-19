# Penyesuaian Diskon Jual (`SellingDiscountAdjustmentDetailReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/price-t20.json`](fixtures/price-t20.json).
ERP: `apps/api/src/reports/pricing.ts` (`adjustmentDetail(…, "DISCOUNT")`), documents `apps/api/src/sales/pricing.ts`; test: `apps/api/test/pricing.test.ts`.
Default-params capture: [`captures/SellingDiscountAdjustmentDetailReport.json`](captures/SellingDiscountAdjustmentDetailReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). Documents with Mulai Berlaku (date) in range.

## Layout and rules

Same blocks without Tanggal Berakhir; columns `Kode # | Nama Barang | Diskon (%) | Diskon Lama (%)`. Diskon Lama is blank, so the row has three cells.

Source: Penyesuaian Harga/Diskon documents (`SPA.yyyy.mm.nnnnn`, type ITEM_PRICE_TYPE or ITEM_DISCOUNT_TYPE, price
category Umum, all branches). They post no journal.

## Open work

- Item default prices / minimum prices, end dates and multiple price categories are not modelled.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Demo data traced: SPA.2025.06.00002 (10 Jun 2025, Umum) sets per-item discounts (2% to 50%). An empty Diskon Lama (%) cell is dropped from the row, as everywhere in the captures. Layout unchanged. See ADR-0029.
