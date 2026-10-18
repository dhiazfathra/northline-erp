# Retur Pembelian per Barang (`PurchaseReturnByItemReport`)

Group: Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/returns-t6.json`](fixtures/returns-t6.json) (sales return SRT.2033.12.00001, purchase return PRT.2033.12.00001). ERP: `apps/api/src/reports/receivables.ts` (`returnList`, `returnDetail`, `returnByItem`), `src/returns/service.ts` (ADR-0008); test: `apps/api/test/returns.test.ts`.

Columns `Nama Barang Barang & Jasa` | `Nilai Retur` (at the purchase price); `Total Nama Barang Barang & Jasa`.

Postings and stock effect: see ADR-0008.
