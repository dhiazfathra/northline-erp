# Jurnal Umum (`JournalListReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json); journals from [`fixtures/trial-balance.json`](fixtures/trial-balance.json). ERP: `apps/api/src/reports/general-ledger.ts`; test: `apps/api/test/trial-balance.test.ts`. Request params: `startDate`, `endDate` (`dd/MM/yyyy`), `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

Columns: `Nomor #` | `No. Trans #` | `Tanggal` | `Tipe Transaksi` | `Nilai` | `Keterangan`.

1. One row per Jurnal Umum dated in range, ordered by date then number.
2. `Nomor #` and `No. Trans #` both print the voucher number. Numbers are auto-assigned `JV.yyyy.mm.nnnnn`,
   a counter per calendar month of the transaction date, in posting order (fixture J1…J6 → JV.2030.12.00001 … JV.2031.02.00003).
3. `Nilai` = total debit of the journal; `Keterangan` = journal description; `Tanggal` as `05 Feb 2031` (two-digit day).
4. No total row.

Unverified: other transaction types (only JV seeded), branch filter.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Demo opening `OB` plus NL-TP J1-J4, 1 Jan - 28 Feb 2045. Fixture [fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`: zero diff. Rules unchanged. See ADR-0029.
