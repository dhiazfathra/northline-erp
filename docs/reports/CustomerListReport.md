# Daftar Pelanggan (`CustomerListReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `ID Pelanggan` | `Nama` | `Tgl/Jam Pembuatan` | `Saldo (Mata Uang)` | `Alamat lainnya`. Grouped under the customer category (`Umum`); one row per customer by number, zero balances included; creation time `dd Mon yyyy HH:mm:ss` in Asia/Jakarta; balance as `IDR <receivable at asOfDate>`; empty address prints nothing. The test passes Accurate's creation timestamps through (they are wall-clock values) and checks the rest.
