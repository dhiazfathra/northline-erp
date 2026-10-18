# Status Pesanan Permintaan Barang (`PurchaseRequisitionOrderStatusReport`)

Group: Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/requisition-t12.json`](fixtures/requisition-t12.json) (PR.2034.08.00001, 4 units, unprocessed). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/purchase-orders.test.ts`. Verified only for an unprocessed requisition.

Block per requisition: `Nomor # : <no>  Keterangan : <desc>`, `Tanggal`, header `Kode #` | `Nama Barang` | `Kuantitas (Unit)` | `Kts Dipesan (Unit)` | `Persentase PO (Kts)` | `Tot Hrg Estimasi` | `Total Harga Pesanan` | `Persentase PO (Harga)`; quantities print with the unit (`4 PCS`), percentages `0 %`.
