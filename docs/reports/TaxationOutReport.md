# Daftar PPN/PPnBM Keluaran (`TaxationOutReport`)

Group: Pajak. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json).
ERP: `apps/api/src/reports/tax.ts` (`taxationOut`); test: `apps/api/test/tax.test.ts`.
Default-params capture over the demo data: [`captures/TaxationOutReport.json`](captures/TaxationOutReport.json).

## Parameters

Date parameter kind `FROMTO`: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`. No branch parameter.

## Layout

```
Daftar PPN/PPnBM Keluaran
Dari 01 Nov 2035 s/d 30 Nov 2035
Tanggal | Tgl Pajak | No Referensi | No. Faktur Pajak | Nilai Pajak
PPN Keluaran
Saldo Awal
- | - | 628.100            <- opening, Tanggal/Tgl Pajak printed as "-"
628.100                    <- opening subtotal
ZZ-R01-PPN 11% (11%)       <- one block per tax: "<tax name> (<rate>%)"
05 Nov 2035 | 05 Nov 2035 | SI.2035.11.00002 | 110.000
20 Nov 2035 | 20 Nov 2035 | SI.2035.11.00003 | 70.538
180.538                    <- block subtotal
Total dari PPN Keluaran | 808.638   <- opening + all blocks
```

An empty No. Faktur Pajak cell is dropped from the row (HTML cell is blank), as everywhere in the captures.

## Calculation rules

- Source: taxable sales invoices. Each line's **item default tax** applies only if the invoice is taxable. Without an item
  tax, Accurate saves the invoice untaxed even with "Kena Pajak" ticked (this is why earlier script-seeded invoices had no PPN).
- Line total = qty × price − line discount (`discPct` of the gross, rounded to the rupiah).
- Invoice discount = `discPct` × sum of line totals, rounded.
- **DPP** per tax = its lines' totals − their share of the invoice discount.
- **PPN** = DPP × rate, rounded half-up to the rupiah: 641.250 × 11% = 70.537,5 → **70.538**.
- Invoice total (receivable) = subtotal − invoice discount + PPN.
- Rows: invoices with tax date in [from, to], ordered by tax date, then number. Tax date = invoice date (no separate
  tax date captured yet).
- Saldo Awal = sum of PPN Keluaran on invoices with tax date before `from`. Over the sandbox this includes the demo data's
  628.100 (ZZ-R01/ZZ-R03 invoices, Oct 2026); the test adds that as one opening line.

Journal of a taxed invoice (AllJournalReport, same fixture), line order: Dr Piutang (total), Dr invoice-discount account
(440101 Diskon Penjualan IDR), Dr item sales-discount account (400004 Diskon Penjualan), Cr PPN Keluaran (210201, the tax's
sales account), Cr Penjualan at **gross** (before line discount).

## Open work

- Multi-line, multi-tax invoices: discount pro-rating remainder and per-line vs per-invoice PPN rounding not observed yet
  (`shortcut:` comment in `createSalesInvoice`).
- Invoices with an e-Faktur number (No. Faktur Pajak) and a tax date different from the invoice date.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff with costing method AVERAGE (ADR-0031). **Generalised rule**: one section per tax *sales account* (from the tax master, in tax order), titled with the account name, not one fixed "PPN Keluaran" section. Each section: Saldo Awal = account balance before the period (credit - debit); one block per tax whose tax lines post to it; then **Transaksi Lainnya** groups for every other posting on the account, grouped by document kind (sales invoices first), rows `date | date | number | faktur | amount`, where the faktur cell is the tax number for sales invoices and the document number otherwise. Trade Portal's demo tax master links PPnBM to Persediaan (sales account 110401, purchase account 110402), so its Daftar PPN/PPnBM Keluaran lists every inventory movement: the 35 opening Penyesuaian Persediaan (Saldo Awal -6.146.070.000), the NL-TP purchases (-1.000.000, -1.200.000) and the sale's HPP credit (+1.650.000 average; FIFO would give 1.600.000; matches under AVERAGE, ADR-0031). ERP: `taxationListBySection` + `loadTaxSections` in `apps/api/src/reports/tax.ts`; `taxationOut` is the one-section case and still matches Manufaktur Demo. See ADR-0029.
