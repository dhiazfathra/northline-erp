# Laporan Rincian Penyetuju Transaksi (`ApprovalListReport`)

Group: Pemeriksaan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ApprovalListReport.json`](captures/retail/ApprovalListReport.json).

Status: blocked: requires Approval workflow.

## Purpose

Menampilkan laporan penyetuju setiap transaksi. Daftar Laporan category: Pemeriksaan; view type `report`.

## Params

Date kind `FROMTO_TIMESTAMP`: `startDate`, `endDate` (dd/MM/yyyy; kind FROMTO_TIMESTAMP, filters on the transaction timestamp).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Header block `Transaksi : | Status :`, `Pemohon :`; lines `Penyetuju | Status | Tgl Disetujui`.

## Row grouping

Empty: no transactions with approvals in the range (template labels only). Retail Demo transfers carry `approvalStatus` APPROVED (API), but no approver rows are printed.

Title lines: `Laporan Rincian Penyetuju Transaksi`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Transaksi : Status :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior; why approved transfers do not appear (approval workflow may be a different feature).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

