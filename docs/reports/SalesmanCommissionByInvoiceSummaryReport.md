# Ringkasan Komisi (Dihitung per Faktur) (`SalesmanCommissionByInvoiceSummaryReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionByInvoiceSummaryReport.json`](captures/retail/SalesmanCommissionByInvoiceSummaryReport.json).

Status: blocked: requires Salesman commission. Fixture: [`fixtures/retail/SalesmanCommissionByInvoiceSummaryReport.json`](fixtures/retail/SalesmanCommissionByInvoiceSummaryReport.json) (Retail Demo).

## Purpose

Laporan yang berisi daftar nilai komisi yang didapatkan oleh tiap-tiap Tenaga Penjual dengan cara perhitungan per Faktur. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

`Nama Tenaga Penjual` | `Nilai Komisi`

## Row grouping

One row per salesman: `Nama Tenaga Penjual | Nilai Komisi`, no total row.

Title lines: `Ringkasan Komisi (Dihitung per Faktur)`, `Dari 01 Jan 2000 s/d 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Commission rule `Komisi Team` = 7% of sales value (see [SalesmanCommissionListReport](SalesmanCommissionListReport.md)). Adam 175,000,000 = 173,880,000 (SI.2016.10.00006) + 1,120,000 (SI.2017.02.00005) (checked); Jhonni Haris 7,709,643.05 = 7,115,343.05 + 51,800 + 122,500 + 420,000 (checked) against [SalesmanCommissionByInvoiceDetailReport](SalesmanCommissionByInvoiceDetailReport.md).
- Base is the pre-tax invoice value: SI.2017.02.00003 total 1,925,000 gives 122,500 = 7% x 1,750,000 (checked), SI.2017.02.00007 total 6,600,000 gives 420,000 = 7% x 6,000,000 (checked), SI.2017.01.00003 total 814,000 gives 51,800 = 7% x 740,000 (checked); SI.2017.02.00005 total 17,600,000 gives 1,120,000 = 7% x 16,000,000 (checked).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: SI.2016.10.00006 (7% x 2,484,000,000 = 173,880,000 matches the invoice total, so that invoice appears untaxed: tax status not traced); foreign-currency invoice SI.2016.10.00003 7,115,343.05 (invoice total 10,730 SGD, conversion rate not traced).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

