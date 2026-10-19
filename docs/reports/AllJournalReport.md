# Keseluruhan Jurnal (`AllJournalReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json); journals from [`fixtures/trial-balance.json`](fixtures/trial-balance.json). ERP: `apps/api/src/reports/general-ledger.ts`; test: `apps/api/test/trial-balance.test.ts`. Request params: `startDate`, `endDate` (`dd/MM/yyyy`), `selectedBranch`.

Per journal, ordered by date then number:

```
Tanggal : 05 Feb 2031          No. Trans # : JV.2031.02.00001
Tipe Transaksi : Jurnal Umum   Deskripsi : <journal description>
Kode Perkiraan | Nama Perkiraan | Debit | Kredit
<line per journal line, in entry order; the side not used prints 0>
<total debit> | <total credit>
```

Lines are not merged: three debit lines to one account print three rows (fixture J6). The CSV variant
(`AllJournalReport` download) is not covered.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Same window and fixture ([fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`): zero diff. Column header repeats per journal, as in Manufaktur Demo. See ADR-0029.
