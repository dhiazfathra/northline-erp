# Anggaran & Realisasi Proyek (`ProjectBudgetComparisonReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/ProjectBudgetComparisonReport.json`](captures/contractor/ProjectBudgetComparisonReport.json).

Status: verified (Kontraktor Demo, ADR-0038). Fixture: [`fixtures/contractor/projects-k.json`](fixtures/contractor/projects-k.json) (`contractor`); test `apps/api/test/contractor-projects.test.ts`. ERP: `apps/api/src/reports/contractor.ts` `projectBudgetComparison`.

## Purpose

Laporan yang berisi perbandingan anggaran proyek.

## Params

No date (`paramDate` NONE).
- `selectedContractorProject`: `PROJECT_CONTRACTOR`, default `[]`, required false in metadata but the server rejects empty with `Proyek harus diisi`. Accepted wire shape (used in the capture): `[{"id": 51, "name": "Instalasi Solar 16K Wp - OffGrid"}]`.

## Columns

Header: `Nomor #` : PRC.2026.06.00001, `Nama Proyek` : name. Table: `Bahan Baku dan Biaya` | `Satuan` | `Kuantitas (Rencana)` | `Total Biaya (Rencana)` | `Kuantitas (Realisasi)` | `Total Biaya (Realisasi)` | `Selisih`.

## Row grouping

`RAB : BGP.2026.06.00001` then RAB task (`I. Pemasangan Panel`) then sub-task (`Konstruksi (Rangka, ...)`) then material/cost lines. Sub-task subtotal row (3 amounts, no label), `Total <task>` row (3 amounts). Then block `Pengeluaran di Luar Anggaran` with `Rincian Barang` (`Draining Clip (Plastik) (Sisa Barang)` qty plan 0, realisasi -3, -12.300) and `Rincian Biaya` (`Beban Transportasi Karyawan` 1 x 150.000), each with a subtotal; final `Total` 170.778.000 | 168.395.700 | -2.382.300.

## Calculation rules (python-verified)

- `Selisih` = Realisasi - Rencana per line (13 lines, e.g. Skrup 600.000-750.000 = -150.000; Kabel NYM 90.000-650.000 = -560.000) and for every subtotal/total.
- Subtotals: task 1 = 3.448.000 + 64.000.000 + 2.450.000 = 69.898.000 (realisasi 69.196.000, -702.000); task 2 = 27.360.000 / 26.555.000 / -805.000; task 3 = 73.520.000 / 72.507.000 / -1.013.000.
- Sections sum: plan 170.778.000; realisasi 168.258.000 + out-of-budget (-12.300 + 150.000 = 137.700) = **168.395.700**; Selisih -2.520.000 + 137.700 = **-2.382.300**. All verified.
- Out-of-budget lines have plan 0 so Selisih = Realisasi. Leftover stock (`Sisa Barang`) is negative: 3 clips x 4.100 = 12.300 (verified); but plan 64 - used 60 = 4, so the -3 is a return qty, not plan minus usage.
- Realisasi sources tie to documents: Skrup 600.000 + Besi 2.250.000 = PI.2026.05.00002 2.850.000; Panel 64.000.000 = PI.2026.05.00004; Tukang 2.100.000 = payment 110103.2026.05.00010; Inverter 16.100.000 + SCC 10.200.000 = 26.300.000 of PI.2026.05.00005 (+150.000 transport = 26.450.000); Battery 72.000.000 = PI.2026.05.00006; Draining Clip 246.000, MCB 255.000, 507.000 = the three MEQ documents. All verified.
- Cross-check: Realisasi total **168.395.700 = BPP in [captures/contractor/AnalysisProfitLossProjectReport.json](captures/contractor/AnalysisProfitLossProjectReport.json)** (verified).
- Plan total 170.778.000 equals the sum of the three sales invoices (56.356.740 + 29.032.260 + 85.389.000, verified) but is not the RAB total 196.093.260 (see [ContractorBudgetPlanReport](ContractorBudgetPlanReport.md)).

## Verified / unverified

- Verified: all arithmetic above. Unverified: overspend sign/format, multiple RABs, multi-currency, why a plan quantity prints with no unit cost, rows with no realisasi.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Jul`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

RAB lines (task / sub-task / item, unit, qty, unit cost, task hierarchy), actual qty and cost per line from purchase invoices, payments, material-usage docs, link of each actual to a RAB line, out-of-budget bucket (items and cost accounts).
