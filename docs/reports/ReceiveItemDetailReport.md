# Rincian Penerimaan Barang (`ReceiveItemDetailReport`)

Group: Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-order-t9.json`](fixtures/purchase-order-t9.json) (PO.2034.06.00001, RI.2034.06.00001, PI.2034.06.00001, **unlinked** in Accurate). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/purchase-orders.test.ts`.

Block per receipt: `Nomor # : <no>  Pemasok : <name>`, `Tanggal : <date>`, header `Kode #` | `Nama Barang` | `Kuantitas` | `Satuan`, lines, quantity total. Accurate posts the receipt journal with zero amounts (Persediaan / Hutang Pembelian Belum Ditagih) when no price is set; the ERP posts none.

Unverified: linked order → receipt → invoice (processed quantities, shared flow rows).
