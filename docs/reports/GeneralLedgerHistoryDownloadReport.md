# Histori Buku Besar (CSV) (`GeneralLedgerHistoryDownloadReport`)

Group: Buku Besar. **Status: verified** (zero diff, Oct 2036 over the T31 journals). Fixture: [`fixtures/fx-t31.json`](fixtures/fx-t31.json) (`downloads.GeneralLedgerHistoryDownloadReport`).
ERP: `apps/api/src/reports/general-ledger.ts` (`glHistoryCsv`); test: `apps/api/test/fx.test.ts`.

## Parameters

`startDate` / `endDate` (+ `selectedBranch` or `showOnlyHasTransaction` as the printed report). View `download`: the
background job yields a download page (`report-output-html.do?reportView=download`) whose `contentData.preview` holds the
columns and rows; `computed.downloadLink` serves the zipped CSV. Calling `export-report.do` after that page finds the cache
expired. `runReport(..., { view: 'csv' })` returns the page.

## Layout

`Tanggal, Tipe Transaksi Jurnal, No Bukti #, Kode #, Nama Perkiraan, Keterangan Jurnal, Debit, Kredit`: [Histori Buku Besar](GeneralLedgerHistoryReport.md) with the date moved from a group row into each line.

## Calculation rules

- Same journals, order and amounts as the printed report. Dates are ISO (`2036-10-01`). Amounts are plain rupiah without
  grouping, with a decimal comma when needed (`17493999,5`).

## Open work

- Only one month with two journals is captured; multi-line journals with memos are not.
