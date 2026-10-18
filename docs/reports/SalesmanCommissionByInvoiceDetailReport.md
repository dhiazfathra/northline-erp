# Rincian Komisi (Dihitung per Faktur) (`SalesmanCommissionByInvoiceDetailReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionByInvoiceDetailReport.json`](captures/retail/SalesmanCommissionByInvoiceDetailReport.json).

Status: blocked: requires Salesman commission. Fixture: [`fixtures/retail/SalesmanCommissionByInvoiceDetailReport.json`](fixtures/retail/SalesmanCommissionByInvoiceDetailReport.json) (Retail Demo).

## Purpose

Laporan yang berisi rincian perhitungan nilai komisi yang didapatkan Tenaga Penjual dari tiap Faktur. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

`Nama Komisi Penjual` | `Permeriksaan syarat` | `Nilai Komisi`

## Row grouping

Per salesman: name line, then per invoice number line, a row `Komisi Team | Syarat terpenuhi | <value>` and a subtotal line; the salesman total follows the last invoice. Page break repeats header (`Rincian Komisi (Dihitung per Faktur)`).

Title lines: `Rincian Komisi (Dihitung per Faktur)`, `Dari 01 Jan 2000 s/d 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Salesman total = sum of invoice commissions: Adam 173,880,000 + 1,120,000 = 175,000,000 (checked); Jhonni Haris 7,115,343.05 + 51,800 + 122,500 + 420,000 = 7,709,643.05 (checked).
- `Permeriksaan syarat` shows `Syarat terpenuhi` (condition met) for every row; the commission has no conditions (`Tanpa batasan dan syarat`), other values are unverified.

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: non-met condition wording, multiple commission rules per invoice, ordering of invoices.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

