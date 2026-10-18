# Rincian Jurnal Akun (CSV) (`JournalDetailListDownloadReport`)

Group: Buku Besar. **Status: verified** (zero diff, Oct 2036 over the T31 journals). Fixture: [`fixtures/fx-t31.json`](fixtures/fx-t31.json) (`downloads.JournalDetailListDownloadReport`).
ERP: `apps/api/src/reports/general-ledger.ts` (`journalDetailListCsv`); test: `apps/api/test/fx.test.ts`.

## Parameters

`startDate` / `endDate` (+ `selectedBranch` or `showOnlyHasTransaction` as the printed report). View `download`: the
background job yields a download page (`report-output-html.do?reportView=download`) whose `contentData.preview` holds the
columns and rows; `computed.downloadLink` serves the zipped CSV. Calling `export-report.do` after that page finds the cache
expired. `runReport(..., { view: 'csv' })` returns the page.

## Layout

`Kode Perkiraan, Nama, Tipe Akun, No. Trans #, Tipe Transaksi, Tanggal, Nilai (Dinormalkan)`: [Rincian Jurnal Akun](JournalDetailListReport.md) flattened, one row per account line with its normalized amount and no block totals.

## Calculation rules

- Same journals, order and amounts as the printed report. Dates are ISO (`2036-10-01`). Amounts are plain rupiah without
  grouping, with a decimal comma when needed (`17493999,5`).

## Open work

- Only one month with two journals is captured; multi-line journals with memos are not.
