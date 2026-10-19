# Rincian Bahan Baku Terpakai (`MaterialEquipmentDetailReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/MaterialEquipmentDetailReport.json`](captures/contractor/MaterialEquipmentDetailReport.json).

Status: spec (Kontraktor Demo), not built — blocked: requires Contractor Projects (ADR-0034).

## Purpose

Laporan yang berisi rincian bahan baku terpakai.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy; captured `01/01/2000` to `31/12/2040`, prints `Dari 01 Jan 2000 s/d 31 Des 2040`).
- `selectedBranch`: `BRANCH_MULTI_WITH_ALL_BRANCH`, default `[]`; wire `[{"name":"[Semua Cabang]","id":null}]`, prints `Cabang : [Semua Cabang]`.

## Columns

Per document header block (3 label/value pairs): `Tanggal` / `Nama Proyek`, `Nomor #` / `Keterangan`, `No. Proyek`. Lines: `Keterangan` | `Kuantitas` | `Satuan` | `Nama gudang`. No cost columns.

## Row grouping

One page per MEQ document (3 pages; page break per document). Within a document: RAB task name as a sub-heading, then item lines. Demo:
- MEQ.2026.05.00001 (08 Mei): task `Konstruksi (Rangka, skrup dan drain clip)`: Draining Clip (Plastik) 60 PCS, gudang Utama.
- MEQ.2026.05.00003 (12 Mei): task `Solar Charge Controler Epever 100A`: MCB TOMZ 2P AC - 50A 3 PCS.
- MEQ.2026.05.00004 (14 Mei): `Instalasi Battery to Inverter`: MCB TOMZ 2P DC - 125 A 2 PCS, Kabel Battery 2x25mm DC 3 Meter; `Instalasi Inverter to PLN`: MCB TOMZ 2P AC - 50A 1 PCS, Kabel Listrik NYM 3x2.5mm 10 Meter.

## Calculation rules

- Quantities cross-check the `Kuantitas (Realisasi)` column of [ProjectBudgetComparisonReport](ProjectBudgetComparisonReport.md): clip 60, MCB AC 3 + 1, MCB DC 2, kabel battery 3, NYM 10 (verified by eye; python for values below).
- Implied unit costs (value / qty, verified): clip 246.000/60 = 4.100; MCB AC 255.000/3 = 85.000 (and 85.000 for qty 1 in PLN); MEQ4 total 132.000 + 200.000 + 90.000 + 85.000 = 507.000 = journal MEQ.2026.05.00004. Journal MEQ total 246.000 + 255.000 + 507.000 = 1.008.000.
- Header capture layout is irregular (single-cell rows when cells are empty); layout of a real print is label : value pairs.

## Verified / unverified

- Verified: qty and value cross-checks above. Unverified: valuation method (assumed average cost), multi-warehouse, decimals.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, period/branch lines, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Des`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

Material-usage lines: item, qty, unit, warehouse, RAB task link, stock cost at posting; header description.
