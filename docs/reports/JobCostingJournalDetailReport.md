# Rincian Jurnal Pekerjaan Pesanan (`JobCostingJournalDetailReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/JobCostingJournalDetailReport.json`](captures/retail/JobCostingJournalDetailReport.json).

Status: blocked: requires Job Costing (out of scope, ADR-0010). Fixture: [`fixtures/retail/JobCostingJournalDetailReport.json`](fixtures/retail/JobCostingJournalDetailReport.json) (Retail Demo).

## Purpose

Laporan Rincian jurnal dari Pekerjaan Pesanan. Daftar Laporan category: Pekerjaan Pesanan; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).

Params used for the capture (default over all history unless stated): `{}`

## Columns

Block `Tanggal : | Keterangan :`, `Nomor # : <JC no>`, line header `Kode Perkiraan | Nama | Debit | Kredit | Keterangan`, sub-heading `Pekerjaan Pesanan <no>`.

## Row grouping

One block per job order: debit `Persediaan Dalam Proses` (115.000-98), credits to inventory accounts of the issued items (`Persediaan Handphone` 115.000-01, `Persediaan Assesoris Handphone` 115.000-03); a closing line with debit and credit totals.

Title lines: `Rincian Jurnal Pekerjaan Pesanan`, `Tanggal : 07 Des 2016 Keterangan :`, `Nomor # : JC.2016.12.00001`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Balanced: JC.2016.12.00001 debit 6,486,947.11 = credits 47,500 + 6,439,447.11 (checked); JC.2017.01.00001 debit 635,720,816.89 = 631,065,816.89 + 4,655,000 (checked).
- Only the material-issue journal is shown here; the finished-goods journal (`Penyelesaian Pesanan`) is not in this report (unverified).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: journals for completion, labor/overhead.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

