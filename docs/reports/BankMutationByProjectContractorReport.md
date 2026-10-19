# Mutasi Bank per Proyek (`BankMutationByProjectContractorReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/BankMutationByProjectContractorReport.json`](captures/contractor/BankMutationByProjectContractorReport.json).

Status: spec (Kontraktor Demo), not built — blocked: requires Contractor Projects (ADR-0034).

## Purpose

Mutasi Bank per Proyek.

## Params

No date (`paramDate` NONE).
- `selectedContractorProject`: `PROJECT_CONTRACTOR`, default `[]`, required false in metadata but the server rejects empty with `Proyek harus diisi`. Accepted wire shape (used in the capture): `[{"id": 51, "name": "Instalasi Solar 16K Wp - OffGrid"}]`.

## Columns

Header: `Nomor #` : PRC.2026.06.00001, `Proyek Kontraktor` : name. Table: `Tanggal` | `Nomor Referensi` | `Bank` | `Keterangan` | `Masuk` | `Keluar` | `Saldo`.

## Row grouping

Flat, date ascending (ties by entry), one row per bank transaction tagged to the project (9 rows; bank `BCA a/c 1234567891`, refs 110103.2026.05.000nn). Final row: totals of Masuk and Keluar only (196.066.600 | 167.400.000), no Saldo total.

## Calculation rules (python-verified)

- `Saldo` = previous Saldo + Masuk - Keluar, starting at 0: 80.000.000, 77.150.000, 13.150.000, 11.050.000, 91.050.000, 64.600.000, 94.600.000, 22.600.000, 28.666.600. Final Saldo 28.666.600 = 196.066.600 - 167.400.000 (verified).
- Masuk = 80.000.000 + 80.000.000 + 30.000.000 + 6.066.600 = 196.066.600; Keluar = 2.850.000 + 64.000.000 + 2.100.000 + 26.450.000 + 72.000.000 = 167.400.000 (verified).
- **Masuk total 196.066.600 = Pendapatan in the Analisa report** (verified; Analisa treats receipts as revenue, labelled `[Tanpa Proyek]`).
- Keluar ties to the journal: PI 2.850.000, 64.000.000, 26.450.000, 72.000.000 and payment 2.100.000 (verified). Realisasi 168.395.700 - Keluar 167.400.000 = 995.700 = stock usage 1.008.000 - leftover 12.300 (verified).
- **Did not reconcile:** receipts 196.066.600 vs sales invoices 170.778.000 (diff 25.288.600) vs RAB 196.093.260 (diff 26.660). Unexplained; likely tax/markup or other revenue.

## Verified / unverified

- Verified: running balance, totals, ties above. Unverified: sort order for same-day rows, multi-bank grouping, opening balance before the first row, transactions without project.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Jul`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Bank receipts/payments with contractor-project tag, bank account, reference number, memo; link from receipts to sales invoices.
