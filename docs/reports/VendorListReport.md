# Daftar Pemasok (`VendorListReport`)

Group: Utang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/payables.test.ts`.

Params: `asOfDate`. Columns `ID Pemasok` | `Nama` | `Saldo (Mata Uang)`; under the category `Umum`; every vendor by number, zero balances included; `IDR <payable at asOfDate>`.
