# Histori Proses Penjualan (`SalesFlowHistoryReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns: Penawaran, Pesanan, Pengiriman, Uang Muka, Faktur, Retur, Penerimaan Penjualan, Tukar Faktur. One row per invoice in range (date order), its settling receipt numbers, `-` for every empty stage. Unverified: several receipts for one invoice (assumed one row each).

Linked documents (verified with `sales-order-t14.json`): order, delivery and invoice share one row.
