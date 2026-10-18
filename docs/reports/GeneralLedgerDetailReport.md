# Rincian Buku Besar (`GeneralLedgerDetailReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json); journals from [`fixtures/trial-balance.json`](fixtures/trial-balance.json). ERP: `apps/api/src/reports/general-ledger.ts`; test: `apps/api/test/trial-balance.test.ts`. Request params: `startDate`, `endDate` (`dd/MM/yyyy`), `showOnlyHasTransaction` (default `true`).

Columns: `Tanggal` | `Tipe Transaksi` | `Keterangan` | `Debit` | `Kredit` | `Saldo Akhir`. Per account:

```
NL-T1-1101 - NL-T1 Kas
31 Jan 2031 | Saldo per 31 Jan 2031 | 11.749.999,5        ← day before startDate, normalized opening
05 Feb 2031 | Jurnal Umum | NL-T1-J4 | 2.000.000 | 0 | 13.749.999,5
...
2.000.000 | 15.000.000                                    ← period debit | credit totals
```

1. Accounts: leaf accounts with at least one line in range (`showOnlyHasTransaction=true`), in account-tree order.
2. Opening uses the trial-balance rules (P&L accounts reset at fiscal-year start; retained earnings roll-forward), normalized sign.
3. `Keterangan` is the **line memo** (blank memo prints nothing).
4. Running balance is normalized and does **not** reset when the range crosses a fiscal year (fixture `span`: Pendapatan
   keeps 3.000.000 into January; the opening row is the only place the reset applies).
5. Lines ordered by date, journal number, entry order; each line is its own row.
