# Keseluruhan Jurnal (CSV) (`AllJournalDownloadReport`)

Group: Buku Besar. **Status: verified** (zero diff, Oct 2036 over the T31 journals). Fixture: [`fixtures/fx-t31.json`](fixtures/fx-t31.json) (`downloads.AllJournalDownloadReport`).
ERP: `apps/api/src/reports/general-ledger.ts` (`allJournalsCsv`); test: `apps/api/test/fx.test.ts`.

## Parameters

`startDate` / `endDate` (+ `selectedBranch` or `showOnlyHasTransaction` as the printed report). View `download`: the
background job yields a download page (`report-output-html.do?reportView=download`) whose `contentData.preview` holds the
columns and rows; `computed.downloadLink` serves the zipped CSV. Calling `export-report.do` after that page finds the cache
expired. `runReport(..., { view: 'csv' })` returns the page.

## Layout

`Kode Perkiraan, Nama Perkiraan, No. Trans #, Tanggal, Tipe Transaksi, Deskripsi, Debit, Kredit`: one row per journal line, journals by date then number, lines in journal order (as [Keseluruhan Jurnal](AllJournalReport.md) without block headers and totals).

## Calculation rules

- Same journals, order and amounts as the printed report. Dates are ISO (`2036-10-01`). Amounts are plain rupiah without
  grouping, with a decimal comma when needed (`17493999,5`).

## Open work

- Only one month with two journals is captured; multi-line journals with memos are not.
