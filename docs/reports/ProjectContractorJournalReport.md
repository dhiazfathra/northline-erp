# Jurnal Proyek Dalam Proses (`ProjectContractorJournalReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/ProjectContractorJournalReport.json`](captures/contractor/ProjectContractorJournalReport.json).

Status: spec (Kontraktor Demo), not built — blocked: requires Contractor Projects (ADR-0034).

## Purpose

Laporan yang berisi jurnal proyek.

## Params

No date (`paramDate` NONE).
- `selectedContractorProject`: `PROJECT_CONTRACTOR_MULTI` (multi-select), default `[]`. Wire used: `[{"id": 51, "name": "Instalasi Solar 16K Wp - OffGrid"}]`.

## Columns

Header: `No. Proyek Proyek` : number, `Nama Proyek` : name, `Target Mulai Proyek` : 04 Mei 2026. Table: `Tanggal` | `Tipe Transaksi` | `Kode Perkiraan` | `Nama Akun Perkiraan` | `Debit` | `Kredit`.

## Row grouping

One group per source document (document number as heading), lines of that document on account 110506 `Proyek Dalam Proses`, then a subtotal row (Debit, Kredit). Ordered by date. Final row = grand total 170.790.300 | 170.790.300.

| Doc | Type | Debit | Kredit |
|---|---|---|---|
| PI.2026.05.00002 | Faktur Pembelian | 2.850.000 | |
| PI.2026.05.00004 | Faktur Pembelian | 64.000.000 | |
| MEQ.2026.05.00001 | Bahan Baku Terpakai | 246.000 | |
| 110103.2026.05.00010 | Pembayaran | 2.100.000 | |
| SI.2026.05.00005 | Faktur Penjualan | | 56.356.740 |
| PI.2026.05.00005 | Faktur Pembelian | 26.300.000 + 150.000 | |
| MEQ.2026.05.00003 / 00004 | Bahan Baku Terpakai | 255.000 / 507.000 | |
| SI.2026.06.00002 | Faktur Penjualan | | 29.032.260 |
| PI.2026.05.00006 | Faktur Pembelian | 72.000.000 | |
| SI.2026.05.00007 | Faktur Penjualan | | 85.389.000 |
| FPC.2026.07.00003 | Penyelesaian Proyek | 2.382.300 | 12.300 |

## Calculation rules (python-verified)

- Costs debit 110506, sales invoices credit it, so the account is the WIP balance. Debits sum 170.790.300, credits 56.356.740 + 29.032.260 + 85.389.000 + 12.300 = 170.790.300: **balanced to zero after FPC**.
- FPC (01 Jul 2026) closes the balance: before FPC debits 168.408.000, credits 170.778.000, net credit 2.370.000; FPC net debit 2.382.300 - 12.300 = 2.370.000 closes it. FPC debit 2.382.300 = revenue 170.778.000 - realised cost 168.395.700 = the project margin vs plan, i.e. the negative of the budget-comparison total Selisih (verified). FPC credit 12.300 reverses the leftover clips (Sisa Barang) (inferred; amounts match).
- Debits before FPC 168.408.000 = BPP 168.395.700 + 12.300 (verified), so BPP = debits excl. FPC less the leftover reversal; ties to [ProjectBudgetComparisonReport](ProjectBudgetComparisonReport.md) and the Analisa report.
- Document numbers carry the booking period, not the transaction date: SI.2026.06.00002 is dated 12 Mei.
- The journal shows only the 110506 side; offset accounts (hutang, kas/bank, persediaan, pendapatan) are not printed.

## Verified / unverified

- Verified: totals and reconciliations above. Unverified: how the FPC amounts are split between accounts (HPP, pendapatan); multi-project output (group per project? total per project?); an unfinished project (no FPC).
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Jul`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Project-in-progress account (110506) setting; project dimension on purchase invoices, payments, material usage, sales invoices; project completion document (FPC) with closing entry to cost/revenue; leftover-stock return.
