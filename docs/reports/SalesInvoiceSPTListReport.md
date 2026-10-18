# Faktur Penjualan SPT Masa PPN (`SalesInvoiceSPTListReport`)

Group: Pajak. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json).
ERP: `apps/api/src/reports/tax.ts` (`salesInvoiceSpt`); test: `apps/api/test/tax.test.ts`.
Default-params capture: [`captures/SalesInvoiceSPTListReport.json`](captures/SalesInvoiceSPTListReport.json) (empty: no demo invoice was ever reported).

## Parameters

`FROMTO`: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`.

## Layout

Columns `Nomor # | Tanggal | No. Faktur Pajak | Tgl Faktur Pajak | Pelanggan | Nilai Pajak`. Groups:

```
Digunggung                                  <- retail document code; no transaction-type heading
SI.2035.11.00003 | 20 Nov 2035 | 20 Nov 2035 | NL-T2 Pelanggan A | 70.538      <- no tax number: cell dropped
SI.2035.11.00002 | 05 Nov 2035 | 010.035-35.00000001 | 05 Nov 2035 | ... | 110.000
180.538
01 - kepada selain Pemungut PPN             <- transaction type (party default)
CoreTax - Faktur Pajak                      <- document code (party default)
SI.2035.11.00004 | 25 Nov 2035 | 010.035-35.00000002 | 25 Nov 2035 | NL-T19 Pelanggan PKP | 44.000
44.000
```

## Calculation rules

- Only invoices **reported in a saved SPT Masa** (Daftar Laporan > SPT PPN / PPNBM, `sptMasaId` set) with tax date in
  range appear. Taxed invoices alone are not enough: before the SPT was saved this report was empty.
- Document code and transaction type come from the customer/vendor tax settings at invoice time (customer default
  Digunggung; PKP customer with NPWP gives "CoreTax - Faktur Pajak"; vendors default to Faktur Pajak, 01).
- Groups: Digunggung first, then by transaction type and document code. Rows by No. Faktur Pajak (blank first), then
  number. Nilai Pajak = the invoice's PPN; each group ends with its sum. No grand total.

## Open work

- Other transaction types/document codes (exports, Pemungut PPN, Dokumen FP) and their labels; group order with more
  than one CoreTax group (`shortcut:` comment in `sptList`).
