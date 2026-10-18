# Daftar Akun Perkiraan (`GlAccountListReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/general-ledger.json`](fixtures/general-ledger.json). ERP: `apps/api/src/reports/general-ledger.ts`. Params: `asOfDate`.

Columns: `Kode Perkiraan` | `Nama` | `Tipe Akun` | `Saldo`. Every account prints, zero balances included, in account-tree order;
parents show their subtree sum (`3000 Modal 71.907.404`).

1. `Saldo` = trial-balance closing at `asOfDate` (P&L accounts fiscal-year-to-date, Laba Ditahan with closed years rolled in),
   normalized to the account's normal side.
2. Type labels: Kas & Bank, Piutang Usaha, Persediaan, Aset Lancar Lainnya, Aset Tetap, Akumulasi Penyusutan, Utang Usaha,
   Liabilitas Jangka Pendek, Liabilitas Jangka Panjang, Modal, Pendapatan, Beban Pokok Penjualan, Beban, Pendapatan Lainnya,
   Beban Lainnya. "Aset Lainnya" for OTHER_ASSET is assumed (no such account in the sandbox).

Unverified: one sandbox parent (2102) prints type "Liabilitas Jangka"; foreign-currency accounts show a revalued balance
(USD bank 1.600.000 here vs 1.550.000 in the trial balance).
