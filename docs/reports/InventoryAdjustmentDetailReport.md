# Penyesuaian Stok Barang (`InventoryAdjustmentDetailReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture:
[`fixtures/adjustment-t10.json`](fixtures/adjustment-t10.json) (IA.2034.07.00001 +3 @ 16.000, IA.2034.07.00002 −2).
ERP: `adjustmentDetail` in `apps/api/src/reports/inventory.ts`, `src/inventory/adjustment.ts`; test: `apps/api/test/adjustments.test.ts`.

Params: `startDate`, `endDate`, branch. One block per adjustment (title lines repeat): `Nomor # : <no>  Keterangan : <description>`,
`Tanggal : <date>`, header `Kode Barang` | `Nama Barang` | `Kuantitas` | `Satuan`, one row per line (quantity unsigned).

Postings (journal type "Penyesuaian Persediaan"): increase Dr Persediaan / Cr adjustment account at the given unit cost;
decrease Dr adjustment account / Cr Persediaan at FIFO cost (2 × 13.000). Stock card rows read `Penyesuaian <number>`.

Also found: an **unlinked** goods receipt adds its quantity to stock at zero value (opening 21 units with 229.200).
