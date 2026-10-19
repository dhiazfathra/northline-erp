# Ringkasan Buku Besar (`GeneralLedgerSummaryReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json); journals from [`fixtures/trial-balance.json`](fixtures/trial-balance.json). ERP: `apps/api/src/reports/general-ledger.ts`; test: `apps/api/test/trial-balance.test.ts`. Request params: `startDate`, `endDate` (`dd/MM/yyyy`), `showZeroBalance` (default `false`). The sandbox has other accounts, so the fixture keeps NL-T1 rows and `300002`.

Columns: `Kode` | `Nama` | `Saldo Awal (Dinormalkan)` | `Perubahan Debit` | `Perubahan Kredit` | `Saldo Akhir (Dinormalkan)`.

Same rows, order, parent aggregation, zero-row hiding, fiscal-year reset and retained-earnings roll-forward as
[Neraca Percobaan](TrialBalanceReport.md). The only difference is presentation: opening and closing print in **one**
column, signed to the account's normal side ("Dinormalkan"): debit-normal types D − C; AP, other liabilities,
long-term liabilities, equity, revenue, other income and accumulated depreciation C − D. Fixture: overdrawn NL-T1 Kas
closes `-1.250.000,5`; NL-T1 Modal `10.000.000`; Laba Ditahan `-31.002.596` (debit balance on a credit-normal account).

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Same window and fixture ([fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`): zero diff. See ADR-0029.
