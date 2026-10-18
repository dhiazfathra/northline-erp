# Arus Kas per Akun (`CashFlowbyAccountReport`)

Group: Kas & Bank. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-bank.json`](fixtures/cash-bank.json). ERP: `apps/api/src/reports/cash-bank.ts`; test: `apps/api/test/cash-bank.test.ts`.

Params: `startDate`, `endDate`, `selectedBank`. Columns: `Tanggal` | `Tipe Transaksi` | `No. Trans #` | `Keterangan` | `Nilai (Domestik)`.

Per selected cash account: its name, then one block per **counter-account** (the other lines of each journal that moves this
cash account), in order of first appearance by date and number. Each line's value is the counter line's C − D (cash in positive);
each block ends with its subtotal; the cash account ends with the grand total (fixture: −1.250.000,5 + 2.000.000 − 15.000.000 = −14.250.000,5).

Unverified: journals with several cash lines or several counter-accounts (value per counter line assumed).
