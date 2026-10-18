# Rincian Permintaan Barang (`PurchaseRequisitionDetailReport`)

Group: Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/requisition-t12.json`](fixtures/requisition-t12.json) (PR.2034.08.00001, 4 units, unprocessed). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/purchase-orders.test.ts`. Verified only for an unprocessed requisition.

Block per requisition: `Nomor # : <no>`, `Tanggal : <date>`, header `Kode #` | `Nama Barang` | `Kuantitas`, lines, quantity total.
