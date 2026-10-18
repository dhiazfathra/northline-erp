# Laba/Rugi Terealisasi (`RealizeGainLossReport`)

Group: Buku Besar. **Status: verified** (zero diff, 2 windows, one USD invoice and receipt). Fixture: [`fixtures/fx-t31.json`](fixtures/fx-t31.json).
ERP: `apps/api/src/reports/receivables.ts` (`realizedGainLoss`), loader `loadRealizedReceipts`; currency handling in
`createSalesInvoice` / `createSalesReceipt` ([ADR-0012](../decisions/0012-foreign-currency-sales.md), migration 0034);
test: `apps/api/test/fx.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy).

## Layout

`Nomor # | Tanggal | Bayar (Kurs Faktur) | Bayar (Kurs Cek) | Untung/Rugi`, grouped by currency name (`US Dollar`), then
by document type (`Penerimaan Penjualan`). One row per receipt, then a subtotal row for the type and one for the currency.
With no foreign receipt in the window only the header prints.

## Calculation rules

- Bayar (Kurs Faktur) = foreign payment x invoice rate (the receivable settled). Bayar (Kurs Cek) = foreign payment x
  receipt rate (cash received). Untung/Rugi = Kurs Cek - Kurs Faktur.
- T31: 100 USD invoiced at 15.000 (1.500.000), received at 15.500 (1.550.000), gain 50.000.
- The receipt journal is Dr cash 1.550.000 / Cr Piutang Usaha USD 1.500.000 / Cr 720102 Laba/Rugi Terealisasi USD 50.000.
- The window filters on the receipt date (1-14 Oct 2036: header only).

## Seeding notes

The sales invoice needs `currencyId` 100 (USD), `arAccountId` 504 (110303) and `rate`/`fiscalRate`. The receipt is cloned
from `rcpt-raw.txt` with `currencyId` 100 and `rate`: `chequeAmount` is IDR, and the invoice amounts are USD.

## Open work

- Losses, purchase payments in foreign currency and several currencies are not captured.
