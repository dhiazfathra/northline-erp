# Rincian Komisi Penjual (Dihitung per Periode) (`SalesmanCommissionByPeriodDetailReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionByPeriodDetailReport.json`](captures/retail/SalesmanCommissionByPeriodDetailReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesmanCommissionByPeriodDetailReport.json`](captures/retail/SalesmanCommissionByPeriodDetailReport.json).

## Purpose

Laporan yang berisi rincian perhitungan nilai komisi bulanan yang didapatkan Tenaga Penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `PERIOD`: `periodMonth`, `periodYear`.

Params used for the capture (default over all history unless stated): `{"periodMonth":"12","periodYear":2026}`

## Columns

`Nama Komisi Penjual` | `Permeriksaan syarat` | `Nilai Komisi`

## Row grouping

Empty for December 2026. Header `Nama Komisi Penjual | Permeriksaan syarat | Nilai Komisi` (the Indonesian typo `Permeriksaan` is Accurate's). Title `Rincian Komisi Penjual (Dihitung per Periode)`.

Title lines: `Rincian Komisi Penjual (Dihitung per Periode)`, `Per Desember 2026`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Komisi Penjual rules (NL-RC Komisi: 5% of sales value, level 1 only, NL-RC Sales A and B; the sandbox's Komisi Team: 7%, levels 1-5, every salesman, applies to NL-RC too).
- A commission is earned when the invoice is **fully settled**, dated by the receipt that settles it (receipts + returns cover the total). The partly paid SI.2043.01.00001 earns nothing; SI.2043.02.00001 is settled by the 25 Mar 2043 receipt.
- Base = sum of line totals (IDR, before tax; a foreign line at the invoice rate) where the salesman sits at a level the rule pays (level = position in the line's salesman list). Shared line of SI.2043.02.00001: A is level 1, B level 2, so Komisi Team pays B 7% x 6,000,000 = 420,000 but NL-RC Komisi pays B only 5% x 4,000,000 = 200,000 and A 5% x 2,000,000 = 100,000.
- A return creates negative rows `Syarat terpenuhi (Retur)` dated on the return date (7% and 5% of the returned 2,000,000 line: -140,000 / -100,000 in February 2043, while the invoice itself is settled in March). Unverified: a return against an invoice that is never settled (implemented as counted).
- `Permeriksaan syarat` (Accurate's typo) prints `Syarat terpenuhi`; rules have no conditions (`Tanpa batasan dan syarat`), other condition types are unverified.
- Period = calendar month of the event date. Per salesman: name line, one row per rule and kind (normal, then `(Retur)`) summed over the month's invoices (A, March 2043: Komisi Team 140,000 + 63,000 = 203,000), then the salesman total; February 2043 shows B at -60,000 = 105,000 - 140,000 + 75,000 - 100,000.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

