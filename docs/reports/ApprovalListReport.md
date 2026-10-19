# Laporan Rincian Penyetuju Transaksi (`ApprovalListReport`)

Group: Pemeriksaan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ApprovalListReport.json`](captures/retail/ApprovalListReport.json).

Status: verified on Retail Demo, empty layout only (ADR-0028). Fixture: [`fixtures/retail/approval-rf.json`](fixtures/retail/approval-rf.json); test `apps/api/test/approvals.test.ts`; code `apps/api/src/reports/approvals.ts`.

## Purpose

Menampilkan laporan penyetuju setiap transaksi. Daftar Laporan category: Pemeriksaan; view type `report`.

## Params

Date kind `FROMTO_TIMESTAMP`: `startDate`, `endDate` (dd/MM/yyyy; kind FROMTO_TIMESTAMP, filters on the transaction timestamp).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Header block `Transaksi : | Status :`, `Pemohon :`; lines `Penyetuju | Status | Tgl Disetujui`.

## Row grouping

Only documents that went through approvers print. With none in range, the template labels print empty (verified).
Populated layout as implemented (unverified): per document `Transaksi : <no> Status : <status>`, `Pemohon : <user>`,
the column header, then one line per approver `<user> | <status> | <dd MMM yyyy>`, documents by date then number.

Title lines: `Laporan Rincian Penyetuju Transaksi`, `Dari 01 Jan 2000 s/d 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Rules (Penyetuju Transaksi) apply per transaction type (SI, SQ, DO, SO in Retail Demo) from a minimum amount.
- A requester who is one of the rule's approvers is approved at once with no approver rows; such documents do not
  print. NL-RF-SO1..3 (2046, Rp 950,000,000 to 1,200,000,000, rule min Rp 900,000,000) all went this way.
- Any rejection rejects the document; approval completes when the mode (one, two, all) is met (unverified).

## Verified / unverified

- Verified: empty layout for 2046 with three auto-approved NL-RF sales orders; auto-approval of a requester-approver.
- Unverified: everything about documents with approver rows (approved, rejected, pending). The sandbox has a single
  user, so a document cannot be submitted by someone other than its approver. Recapture once a second user exists.
- Demo transfers carrying `approvalStatus` APPROVED with no rows fit the same rule.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

