# Progres Proyek (`ProjectContractorProgressReport`)

Group: Proyek Kontraktor. Reverse-engineered from Accurate Online, **Kontraktor Demo** (PT Solar Energy Indonesia), 2026-10-19. Capture: [`captures/contractor/ProjectContractorProgressReport.json`](captures/contractor/ProjectContractorProgressReport.json).

Status: spec (Kontraktor Demo), not built — blocked: requires Contractor Projects (ADR-0034).

## Purpose

Laporan yang berisi Progres Proyek.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy; captured `31/12/2040`, prints `Per Tgl. 31 Des 2040`).
- `selectedContractorProject`: `PROJECT_CONTRACTOR`, default `[]`, required false in metadata but the server rejects empty with `Proyek harus diisi`. Accepted wire shape (used in the capture): `[{"id": 51, "name": "Instalasi Solar 16K Wp - OffGrid"}]`.

## Columns

`Uraian Pekerjaan` | `Rencana %` | `Realisasi %` | `Tagihan` | `Faktur Penjualan`. Above the table: `Progres (Rencana %)` : 100 and `Progres (Realisasi %)` : 100 (project level).

## Row grouping

RAB task heading with Roman numeral (`I. Pemasangan Panel`, `II. Instalasi Inverter`, `III. Instalasi Battery & PLN`) carrying Rencana/Realisasi %, then task lines. Each line shows `Tertagih` and the sales invoice number:
- I (3 lines) -> SI.2026.05.00005 (10 Mei); II (2 lines) -> SI.2026.06.00002 (12 Mei); III (3 lines) -> SI.2026.05.00007 (15 Mei). All 100/100.

## Calculation rules

- `Realisasi %` = survey progress (3 surveys at 100, see [ContractorSurveyDetailReport](ContractorSurveyDetailReport.md)) as of `asOfDate`; `Rencana %` plan schedule as of the date (inferred; all 100 at 2040).
- `Tertagih` = a sales invoice references the RAB task line; `Faktur Penjualan` is that invoice. The three invoices are exactly the three credits on account 110506 in [ProjectContractorJournalReport](ProjectContractorJournalReport.md) (verified).
- Untouched lines presumably print an empty/other Tagihan status (not captured; name unknown).
- Project-level 100 = (inferred) weighted/mean of tasks; indistinguishable here.

## Verified / unverified

- Verified: invoice numbers and dates against the journal report.
- Unverified: every non-100 case, Tagihan values other than `Tertagih` (e.g. partial), weighting, as-of cut-off hiding later surveys.
- Page furniture to strip before comparing: company line `PT Solar Energy Indonesia`, report title, repeated column header per page, `ACCURATE Accounting System Report`, `Tercetak pada 19 October 2026 - HH:mm` (English month), `Halaman n` / `dari N`.
- Numbers id-ID (`1.234.567`, negatives `-150.000`), dates `dd MMM yyyy` Indonesian months (`Mei`, `Jul`). Empty cells are omitted from the capture, so a row can be shorter than its header.

## Data the ERP would need

RAB task hierarchy with plan schedule %, survey progress per line, link from sales-invoice line to RAB line (billed flag), project-level progress.
