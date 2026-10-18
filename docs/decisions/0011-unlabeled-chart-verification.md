# ADR-0011: Unlabeled charts are verified through their backing table report

## Status
Accepted

## Date
2026-10-18

## Context
Most Accurate charts print value labels, which we transcribe from the PNG into `fixtures/charts.json` and diff exactly.
Some charts (Proyeksi Ketersediaan Kas, Grafik Penjualan, Grafik Perbandingan Nilai Akun) render unlabeled lines or bars
as a server-side PNG. Their XLS export only embeds the same image, so exact values cannot be read.

## Decision
An unlabeled chart counts as **verified** when both hold:
1. Its x-axis points (dates or categories), read from the PNG, match what the ERP computes for the same data.
2. Its values come from figures already verified at zero diff in a table report, and the ERP's chart series is built
   from that same verified function. The report doc names the backing table report.

Each chart's doc records the x-axis it showed and the backing report.

## Alternatives Considered
- **Approximate from pixels with a tolerance**: lets a wrong rounding or sign pass if it stays within tolerance; weaker
  than tying the values to a zero-diff table.
- **Leave unlabeled charts at spec**: honest, but leaves reports unverified whose numbers are already proven elsewhere.

## Consequences
- Verification of these charts is only as strong as the backing table report; a chart-only quirk (e.g. a different
  date range rule) is caught only through the x-axis check.
