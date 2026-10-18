# Histori Buku Besar (`GeneralLedgerHistoryReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json); journals from [`fixtures/trial-balance.json`](fixtures/trial-balance.json). ERP: `apps/api/src/reports/general-ledger.ts`; test: `apps/api/test/trial-balance.test.ts`. Request params: `startDate`, `endDate` (`dd/MM/yyyy`), `selectedBranch`.

Columns: `Tipe Transaksi Jurnal` | `No Bukti #` | `Kode #` | `Nama Perkiraan` | `Keterangan Jurnal` | `Debit` | `Kredit`.

1. A date row (`05 Feb 2031`) opens each date; under it every journal line of that date, journals by number, lines in entry order.
2. `Keterangan Jurnal` is the journal description (not the line memo).
3. No opening balance, no running balance, no totals.
