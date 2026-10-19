# Rincian Jurnal Akun (`JournalDetailListReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json). ERP: `apps/api/src/reports/general-ledger.ts`. Params: `startDate`, `endDate`, `selectedBranch`.

Per leaf account with lines in range (account-tree order), each block on its own page:

```
Kode Perkiraan : NL-T1-1101    Tipe Akun : Kas & Bank
Nama : NL-T1 Kas
No. Trans # | Tipe Transaksi | Tanggal | Nilai (Dinormalkan)
JV.2031.02.00001 | Jurnal Umum | 05 Feb 2031 | 2.000.000
JV.2031.02.00002 | Jurnal Umum | 10 Feb 2031 | -15.000.000
-13.000.000                                   ← block total
```

1. One row per journal line (not merged per journal), amount = line D − C normalized to the account's normal side.
2. No opening balance. Type labels as in [Daftar Akun Perkiraan](GlAccountListReport.md).

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Same window and fixture ([fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`): zero diff. See ADR-0029.
