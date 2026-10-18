# Rincian Komisi (Dihitung per Faktur) (`SalesmanCommissionByInvoiceDetailReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionByInvoiceDetailReport.json`](captures/retail/SalesmanCommissionByInvoiceDetailReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesmanCommissionByInvoiceDetailReport.json`](captures/retail/SalesmanCommissionByInvoiceDetailReport.json).

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

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Komisi Penjual rules (NL-RC Komisi: 5% of sales value, level 1 only, NL-RC Sales A and B; the sandbox's Komisi Team: 7%, levels 1-5, every salesman, applies to NL-RC too).
- A commission is earned when the invoice is **fully settled**, dated by the receipt that settles it (receipts + returns cover the total). The partly paid SI.2043.01.00001 earns nothing; SI.2043.02.00001 is settled by the 25 Mar 2043 receipt.
- Base = sum of line totals (IDR, before tax; a foreign line at the invoice rate) where the salesman sits at a level the rule pays (level = position in the line's salesman list). Shared line of SI.2043.02.00001: A is level 1, B level 2, so Komisi Team pays B 7% x 6,000,000 = 420,000 but NL-RC Komisi pays B only 5% x 4,000,000 = 200,000 and A 5% x 2,000,000 = 100,000.
- A return creates negative rows `Syarat terpenuhi (Retur)` dated on the return date (7% and 5% of the returned 2,000,000 line: -140,000 / -100,000 in February 2043, while the invoice itself is settled in March). Unverified: a return against an invoice that is never settled (implemented as counted).
- `Permeriksaan syarat` (Accurate's typo) prints `Syarat terpenuhi`; rules have no conditions (`Tanpa batasan dan syarat`), other condition types are unverified.
- Layout: salesman name line, then per invoice (by number) its number line, rule rows (rules by name, each followed by its return row) and an invoice subtotal, then the salesman total. Events are filtered by their own date (the March window shows SI.2043.02.00001 without its February return rows).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

