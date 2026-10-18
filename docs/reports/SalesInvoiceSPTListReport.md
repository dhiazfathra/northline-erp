# Faktur Penjualan SPT Masa PPN (`SalesInvoiceSPTListReport`)

Group: Pajak. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/SalesInvoiceSPTListReport.json`](captures/SalesInvoiceSPTListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.



## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Nomor # | Tanggal | No. Faktur Pajak | Tgl Faktur Pajak | Pelanggan | Nilai Pajak`

## Findings

- Fixture [`fixtures/tax-t19.json`](fixtures/tax-t19.json): two taxed invoices without an e-Faktur number give an **empty** report,
  so only invoices carrying a No. Faktur Pajak are listed. ERP `salesInvoiceSpt` reproduces the empty case
  (`apps/api/test/tax.test.ts`) and refuses rows with a tax number until those are captured.

## Open work

- Capture an invoice with an e-Faktur number (needs the e-Faktur number range set up in the sandbox).

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
