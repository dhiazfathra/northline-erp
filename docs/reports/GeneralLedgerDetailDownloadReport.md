# Rincian Buku Besar (CSV) (`GeneralLedgerDetailDownloadReport`)

Group: Buku Besar. **Status: verified** (zero diff, Oct 2036 over the T31 journals). Fixture: [`fixtures/fx-t31.json`](fixtures/fx-t31.json) (`downloads.GeneralLedgerDetailDownloadReport`).
ERP: `apps/api/src/reports/general-ledger.ts` (`glDetailCsv`); test: `apps/api/test/fx.test.ts`.

## Parameters

`startDate` / `endDate` (+ `selectedBranch` or `showOnlyHasTransaction` as the printed report). View `download`: the
background job yields a download page (`report-output-html.do?reportView=download`) whose `contentData.preview` holds the
columns and rows; `computed.downloadLink` serves the zipped CSV. Calling `export-report.do` after that page finds the cache
expired. `runReport(..., { view: 'csv' })` returns the page.

## Layout

`Kode Perkiraan, Nama, Tipe Akun, Tanggal, Tipe Transaksi, Keterangan, Debit, Kredit, Saldo Akhir`. For each account with transactions (`showOnlyHasTransaction`): an opening row dated the day before the start (`Saldo per 30 Sep 2036`, empty type/debit/credit), then each line with the running normalized balance. There is no total row. Tipe Akun uses the account-type label (720102 Laba/Rugi Terealisasi USD = `Beban Lainnya`, so a credit prints -50000).

## Calculation rules

- Same journals, order and amounts as the printed report. Dates are ISO (`2036-10-01`). Amounts are plain rupiah without
  grouping, with a decimal comma when needed (`17493999,5`).

## Open work

- Only one month with two journals is captured; multi-line journals with memos are not.
