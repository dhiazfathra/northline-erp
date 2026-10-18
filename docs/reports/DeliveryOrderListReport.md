# Daftar Pengiriman Pesanan (`DeliveryOrderListReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox, sales orders enabled), 2026-10-18. Fixture: [`fixtures/sales-order-t14.json`](fixtures/sales-order-t14.json) (linked SO.2034.10.00001 → DO.2034.10.00001 → SI.2034.10.00001). ERP: `apps/api/src/reports/receivables.ts`, `createSalesOrder`/`createDeliveryOrder`; test: `apps/api/test/adjustments.test.ts`.

Columns `Nomor #` | `Tanggal` | `Pelanggan` | `Pengiriman` (empty shipment prints nothing).

Postings: delivery Dr Persediaan Terkirim / Cr Persediaan at FIFO cost (type Pengiriman Pesanan); the invoice then posts sales and Dr HPP / Cr Persediaan Terkirim.
