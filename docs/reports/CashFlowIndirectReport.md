# Arus Kas (Tak Langsung) (`CashFlowIndirectReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-flow.json`](fixtures/cash-flow.json). ERP: `apps/api/src/reports/cash-flow.ts`; test: `apps/api/test/cash-flow.test.ts`.

Params: `periodStartMonth`, `periodStartYear`, `periodEndMonth`, `periodEndYear`, `selectedBranch`. Range = first day of the start
month to the last day of the end month. Columns `Keterangan` | `Nilai`.

Every movement row is −(Σdebit − Σcredit) in the range over the account types listed (credit increases add cash):

| Row | Types |
|---|---|
| Laba/Rugi | net income (all P&L types, C − D) |
| Tambah Akumulasi Penyusutan / Utang Usaha / Liabilitas Jangka Pendek | ACCUMULATED_DEPRECIATION / ACCOUNT_PAYABLE / OTHER_CURRENT_LIABILITY |
| Kurang Piutang Usaha / Persediaan / Aset Lancar Lainnya | ACCOUNT_RECEIVABLE / INVENTORY / OTHER_CURRENT_ASSET |
| Total Aktifitas Operasi | sum of the above |
| Investasi: Kurang Aset Tetap / Kurang Aset Lainnya, Total Investasi | FIXED_ASSET / OTHER_ASSET |
| Pendanaan: Tambah Liabilitas Jangka Panjang / Tambah Modal, Total Pendanaan | LONG_TERM_LIABILITY / EQUITY |
| Total dari Arus Kas Bersih … | operasi + investasi + pendanaan |
| Kas & Setara Kas di Awal period | CASH_BANK balance before the range |
| Kas & Setara Kas di Akhir period | awal + total |

All rows print even when 0. Fixture: Laba/Rugi 2.749.999,5; accrual J6 shows as Tambah Liabilitas Jangka Pendek 1.000.000.

Unverified: foreign-currency cash (sandbox USD banks revalue), whether retained-earnings postings count under Tambah Modal.
