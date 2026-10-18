# Sisa Kredit Pelanggan (`CustomerExistingCreditListReport`)

Group: Piutang. **Status: verified** (zero diff, before and after the credit). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`reports.CustomerExistingCreditListReport`).
ERP: `apps/api/src/reports/receivables.ts` (`customerCredit`); test: `apps/api/test/tax.test.ts`.

## Parameters

`ASOF` + `selectedBranch`: `{"asOfDate":"dd/MM/yyyy","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

## Layout

```
Sisa Kredit Pelanggan / Per Tgl. 30 Nov 2035 / Cabang : [Semua Cabang]
Mata Uang | Pelanggan | ID Pelanggan Pelang | Sisa Kredit       <- header text truncated exactly like this
Indonesian Rupiah | NL-T2 Pelanggan A | NL-T2-C1 | 90.000
Total Pelanggan | 90.000
```
With no credit, only the three header lines print (no column header).

## Calculation rules

- Credit = a sales receipt's amount above the invoices it pays (**kelebihan bayar**). Accurate warns "Pembayaran melebihi
  total tagihan faktur!. Ada kelebihan bayar." and saves with `ignoreWarning`.
- Journal of that receipt: Dr Kas 1.200.000 / Cr Piutang 1.110.000 / Cr Piutang 90.000 (the excess on its own line).
- Not credit: unused down payments (T7 window shows nothing) and a sales return on a fully paid invoice (tested, then
  deleted from the sandbox).
- As-of: receipts dated on or before the date (27 Nov 2035: empty; 30 Nov: 90.000).

## Open work

- Using the credit (applying it to a later invoice) is not modelled; the ERP keeps all excess as open credit.
