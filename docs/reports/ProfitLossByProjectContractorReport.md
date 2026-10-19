# Laba/Rugi Proyek Kontraktor (`ProfitLossByProjectContractorReport`)

Group: Proyek Kontraktor. Metadata only; capture [`captures/contractor/ProfitLossByProjectContractorReport.json`](captures/contractor/ProfitLossByProjectContractorReport.json) holds the server error, no layout (Kontraktor Demo, PT Solar Energy Indonesia, 2026-10-19).

Status: partial: layout not captured. spec (Kontraktor Demo), not built — blocked: requires Contractor Projects (ADR-0034).

## Purpose

Menampilkan laba rugi per Proyek Kontraktor untuk periode yg dipilih. View type `financialstatement`.

## Params

No date (`paramDate` NONE) although the description says "periode".
- `selectedContractorProject`: `PROJECT_CONTRACTOR`, default `[]`. Wire shape **not found**: `51`, `"51"`, `[51]`, `[{id:51}]`, `{id,no}`, `[{id:51,name}]` all rejected with `Proyek harus diisi` or a generic `Upsss...` 500. The shape that works for the other contractor reports (`[{"id":51,"name":...}]`) is not accepted here.
- `selectedDataClassification1`..`10`: `PER_DATA_CLASSIFICATION_n_OPTIONAL`, default true.
- Booleans: `showTotal` (false), `showParentAccount` (true), `showChildAccount` (true), `showZeroBalance` (false), `showParentAccountBalance` (true).

## Columns / Row grouping

Not captured. Expected (inferred from sibling [ProfitLossByProjectReport](ProfitLossByProjectReport.md) style): account tree of Laba/Rugi, one amount column for the chosen project.

## Calculation rules

Not captured. Hypothesis to test later: totals should agree with [AnalysisProfitLossProjectReport](captures/contractor/AnalysisProfitLossProjectReport.json) for PRC.2026.06.00001: Pendapatan 196.066.600, BPP 168.395.700, Laba 27.670.900 (196.066.600 - 168.395.700 verified arithmetically; that the P&L report shows the same is unverified).

## Verified / unverified

- Verified: params from the Daftar Laporan metadata; the error responses.
- Unverified: everything else.
- Page furniture and number/date formats as the other Kontraktor Demo captures (id-ID, `dd MMM yyyy`).

## Data the ERP would need

As [ProjectContractorJournalReport](ProjectContractorJournalReport.md) (project dimension on revenue/cost postings, completion document) plus account classification.
