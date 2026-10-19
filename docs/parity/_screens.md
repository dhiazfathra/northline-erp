# Screen inventory (P4.1)

Read-only inventory of the menus of the 4 allowlisted Accurate demos (Manufaktur, Retail, Trade Portal, Kontraktor). Source: the app module list (`acc.mainMenuDef()`, ids `accurate__<area>__<form>`), read after `assertSandbox`. Nothing was opened, saved, edited or deleted. Date: 2026-10-19.

**Distinct forms: 113** (menu entries, deduped across demos). Tier 1: 33, Tier 2: 38, Tier 3: 42.

**Tier 1 rows with an ERP route: 26 of 33** (an API route and/or built web screen; a bare command with no route counts as none). 7 Tier 1 rows have none.

Tiers: 1 = posts a journal or moves stock (by ERP command where Accurate behavior is unconfirmed, marked * in estimates); 2 = masters and settings; 3 = everything else (lists, reports, SmartLink, pre-posting documents such as quotes, orders, requisitions).

Tier 1 estimate rule: S = create/edit/delete command, route and web screen exist (3-4h); M = command exists, route or web screen or edit/delete missing (5-7h); L = no ERP command (10-12h). Includes the scenario script on both sides and a fix pass. Total 223h (S 7h, M 160h, L 56h).

| Tier 1 form | Estimate |
|---|---|
| Perusahaan > Proses Akhir Bulan | M 6h |
| Buku Besar > Jurnal Umum | S 3h |
| Buku Besar > Pencatatan Beban | M 6h |
| Buku Besar > Pencatatan Gaji | M 6h |
| Buku Besar > Pinjaman Karyawan | M 5h |
| Kas & Bank > Pelunasan Pinjaman | L 10h* |
| Kas & Bank > Pembayaran | M 5h |
| Kas & Bank > Pembayaran Angsuran | L 10h* |
| Kas & Bank > Pencairan Pinjaman | M 5h |
| Kas & Bank > Penerimaan | M 5h |
| Kas & Bank > Transfer Bank | L 12h |
| Penjualan > Faktur Penjualan | S 4h |
| Penjualan > Penerimaan Penjualan | M 6h |
| Penjualan > Pengiriman Pesanan | M 7h |
| Penjualan > Retur Penjualan | M 6h |
| Penjualan > Uang Muka Penjualan | M 5h |
| Pembelian > Faktur Pembelian | M 6h |
| Pembelian > Pembayaran Pembelian | M 6h |
| Pembelian > Penerimaan Barang | M 7h |
| Pembelian > Retur Pembelian | M 6h |
| Pembelian > Uang Muka Pembelian | M 7h |
| Persediaan > Hasil Stok Opname | L 12h* |
| Persediaan > Pekerjaan Pesanan | M 7h* |
| Persediaan > Pemindahan Barang | M 7h |
| Persediaan > Penambahan Bahan Baku | M 7h |
| Persediaan > Penyelesaian Pesanan | M 7h |
| Persediaan > Penyesuaian Persediaan | M 6h |
| Aset Tetap > Aset Tetap | M 6h* |
| Aset Tetap > Disposisi Aset Tetap | M 6h |
| Aset Tetap > Perubahan Aset Tetap | M 6h |
| Kontraktor > Alokasi Bahan Proyek | L 12h* |
| Kontraktor > Bahan Baku Terpakai | M 7h |
| Kontraktor > Penyelesaian Proyek | M 7h |

\* Tier or posting behavior to confirm on the Accurate side in P4.2 (ERP command posts, Accurate not yet checked).

Not enumerated: report catalog (Daftar Laporan opens the 291-row report list, tracked in `_coverage.md`); per-form field sets (P4.2); sub-tabs inside forms; widgets, dashboard and import screens that are module ids but not menu entries (in k-mods.json only); SmartLink screens that need a linked external account.

P4.2/P4.3 batch 1 (2026-10-19): 7 forms run, evidence in [docs/parity/README.md](README.md); 6 `accepted divergence (ADR-0041)`, Pinjaman Karyawan `stopped` (edit shape not found after 3 attempts, ADR-0041). Pencairan Pinjaman's route is new: POST/PUT/DELETE /api/employee-loan-disbursements.

| module | form | Accurate path (menu > submenu) | Accurate module id | ERP route | tier | status | demos |
|---|---|---|---|---|---|---|---|
| Perusahaan | Proses Akhir Bulan | Perusahaan > Proses Akhir Bulan | accurate__company__period-end | POST /api/period-ends; web /ledger/month-end | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Jurnal Umum | Buku Besar > Jurnal Umum | accurate__general-ledger__journal-voucher | POST /api/ledger/commands (PostJournal/Edit/Delete/Reverse); web /docs/journal | 1 | accepted divergence (ADR-0041) | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Pencatatan Beban | Buku Besar > Pencatatan Beban | accurate__general-ledger__expense-accrual | — (command createExpenseAccrual exists, no HTTP route) | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Pencatatan Gaji | Buku Besar > Pencatatan Gaji | accurate__cash-bank__employee-payment | POST /api/payroll/runs | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Pinjaman Karyawan | Buku Besar > Pinjaman Karyawan | accurate__cash-bank__employee-loan | POST/PUT/DELETE /api/employee-loans | 1 | stopped (edit, ADR-0041) | Manufaktur |
| Kas & Bank | Pelunasan Pinjaman | Kas & Bank > Pelunasan Pinjaman | accurate__cash-bank__employee-loan-settlement | — | 1 | todo | Manufaktur |
| Kas & Bank | Pembayaran | Kas & Bank > Pembayaran | accurate__cash-bank__other-payment | POST/PUT/DELETE /api/cash-bank/documents kind=PAY; web /docs/cash-payment | 1 | accepted divergence (ADR-0041) | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | Pembayaran Angsuran | Kas & Bank > Pembayaran Angsuran | accurate__cash-bank__employee-loan-installment | — | 1 | todo | Manufaktur |
| Kas & Bank | Pencairan Pinjaman | Kas & Bank > Pencairan Pinjaman | accurate__cash-bank__employee-loan-disbursement | POST/PUT/DELETE /api/employee-loan-disbursements | 1 | accepted divergence (ADR-0041) | Manufaktur |
| Kas & Bank | Penerimaan | Kas & Bank > Penerimaan | accurate__cash-bank__other-deposit | POST/PUT/DELETE /api/cash-bank/documents kind=DEP; web /docs/cash-receipt | 1 | accepted divergence (ADR-0041) | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | Transfer Bank | Kas & Bank > Transfer Bank | accurate__cash-bank__bank-transfer | — | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Faktur Penjualan | Penjualan > Faktur Penjualan | accurate__customer__sales-invoice | POST/PUT/DELETE /api/sales/invoices; web /docs/sales-invoice | 1 | accepted divergence (ADR-0041) | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Penerimaan Penjualan | Penjualan > Penerimaan Penjualan | accurate__customer__sales-receipt | POST /api/sales/receipts; web /docs/sales-receipt | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Pengiriman Pesanan | Penjualan > Pengiriman Pesanan | accurate__customer__delivery-order | POST /api/sales/deliveries | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Retur Penjualan | Penjualan > Retur Penjualan | accurate__customer__sales-return | POST /api/sales/returns; web /docs/sales-return | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Uang Muka Penjualan | Penjualan > Uang Muka Penjualan | accurate__customer__sales-downpayment | POST/PUT/DELETE /api/sales/down-payments; web /docs/sales-down-payment | 1 | accepted divergence (ADR-0041) | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Faktur Pembelian | Pembelian > Faktur Pembelian | accurate__vendor__purchase-invoice | POST /api/purchases/invoices; web /docs/purchase-invoice | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Pembayaran Pembelian | Pembelian > Pembayaran Pembelian | accurate__vendor__purchase-payment | POST /api/purchases/payments; web /docs/purchase-payment | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Penerimaan Barang | Pembelian > Penerimaan Barang | accurate__vendor__receive-item | POST /api/purchases/receive-items | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Retur Pembelian | Pembelian > Retur Pembelian | accurate__vendor__purchase-return | POST /api/purchases/returns; web /docs/purchase-return | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Uang Muka Pembelian | Pembelian > Uang Muka Pembelian | accurate__vendor__purchase-downpayment | POST /api/purchases/down-payments | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Hasil Stok Opname | Persediaan > Hasil Stok Opname | accurate__inventory__stock-opname-result | — | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Pekerjaan Pesanan | Persediaan > Pekerjaan Pesanan | accurate__inventory__job-order | POST /api/job-costing/job-orders | 1 | todo | Retail, Trade, Kontraktor |
| Persediaan | Pemindahan Barang | Persediaan > Pemindahan Barang | accurate__inventory__item-transfer | POST /api/inventory/transfers | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Penambahan Bahan Baku | Persediaan > Penambahan Bahan Baku | accurate__inventory__material-adjustment | POST /api/job-costing/material-adjustments | 1 | todo | Retail, Trade, Kontraktor |
| Persediaan | Penyelesaian Pesanan | Persediaan > Penyelesaian Pesanan | accurate__inventory__roll-over | POST /api/job-costing/roll-overs | 1 | todo | Retail, Trade, Kontraktor |
| Persediaan | Penyesuaian Persediaan | Persediaan > Penyesuaian Persediaan | accurate__inventory__item-adjustment | POST /api/inventory/adjustments; web /docs/stock-adjustment | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Aset Tetap | Aset Tetap > Aset Tetap | accurate__fixed-asset__fixed-asset | POST /api/fixed-assets; web /fixed-assets | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Disposisi Aset Tetap | Aset Tetap > Disposisi Aset Tetap | accurate__fixed-asset__fixed-asset-disposed | POST /api/fixed-assets/disposals | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Perubahan Aset Tetap | Aset Tetap > Perubahan Aset Tetap | accurate__fixed-asset__fixed-asset-edited | — (command editFixedAsset exists, no HTTP route) | 1 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kontraktor | Alokasi Bahan Proyek | Kontraktor > Alokasi Bahan Proyek | accurate__contractor__material-allocation | — | 1 | todo | Kontraktor |
| Kontraktor | Bahan Baku Terpakai | Kontraktor > Bahan Baku Terpakai | accurate__contractor__material-equipment | POST /api/contractor/material-usages | 1 | todo | Kontraktor |
| Kontraktor | Penyelesaian Proyek | Kontraktor > Penyelesaian Proyek | accurate__contractor__finished-project | POST /api/contractor/completions | 1 | todo | Kontraktor |
| Pengaturan | Accurate Store | Pengaturan > Accurate Store | accurate__company__application | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pengaturan | Akses Grup | Pengaturan > Akses Grup | accurate__company__access-privilege | POST /api/access/groups | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pengaturan | Desain Cetakan | Pengaturan > Desain Cetakan | accurate__company__print-layout | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pengaturan | Pengguna | Pengaturan > Pengguna | accurate__company__user-company | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pengaturan | Penomoran | Pengaturan > Penomoran | accurate__company__auto-number | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pengaturan | Penyetuju Transaksi | Pengaturan > Penyetuju Transaksi | accurate__company__user-approval | — | 2 | todo | Retail |
| Pengaturan | Preferensi | Pengaturan > Preferensi | accurate__company__preferences | PUT /api/settings/report-preferences, /api/settings/costing-method; web /settings/preferences | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Cabang | Perusahaan > Cabang | accurate__company__branch | POST /api/master/branches | 2 | todo | Retail |
| Perusahaan | Departemen | Perusahaan > Departemen | accurate__company__department | POST /api/master/departments | 2 | todo | Retail, Kontraktor |
| Perusahaan | FOB | Perusahaan > FOB | accurate__company__freeonboard | GET /api/reports/master/fob (list only) | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Gaji/Tunjangan | Perusahaan > Gaji/Tunjangan | accurate__company__employee-fee | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Karyawan | Perusahaan > Karyawan | accurate__company__employee | POST /api/employees | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Mata Uang | Perusahaan > Mata Uang | accurate__company__currency | GET /api/reports/master/currencies (list only) | 2 | todo | Manufaktur, Retail |
| Perusahaan | Pajak | Perusahaan > Pajak | accurate__company__tax | web /modules/taxes (list only); GET /api/reports/master/taxes | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Pengiriman | Perusahaan > Pengiriman | accurate__company__shipment | GET /api/reports/master/shipments (list only) | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Proyek | Perusahaan > Proyek | accurate__company__project | POST /api/master/projects | 2 | todo | Kontraktor |
| Perusahaan | Syarat Pembayaran | Perusahaan > Syarat Pembayaran | accurate__company__payment-term | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Akun Perkiraan | Buku Besar > Akun Perkiraan | accurate__general-ledger__glaccount | POST /api/ledger/commands (OpenAccount/Rename/Suspend/Delete); web /accounts | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Anggaran | Buku Besar > Anggaran | accurate__budget-target__accountbudget-target | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | SmartLink e-Banking | Kas & Bank > SmartLink e-Banking | accurate__cash-bank__internet-banking | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Kategori Pelanggan | Penjualan > Kategori Pelanggan | accurate__customer__customer-category | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Kategori Penjualan | Penjualan > Kategori Penjualan | accurate__customer__price-category | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Komisi Penjual | Penjualan > Komisi Penjual | accurate__company__salesman-commission | — | 2 | todo | Retail, Trade, Kontraktor |
| Penjualan | Pelanggan | Penjualan > Pelanggan | accurate__customer__customer | POST/DELETE /api/sales/customers; web /modules/customers | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Penyesuaian Harga/Diskon | Penjualan > Penyesuaian Harga/Diskon | accurate__inventory__sellingprice-adjustment | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | SmartLink e-Commerce | Penjualan > SmartLink e-Commerce | accurate__customer__ecommerce-setting | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Target Penjualan | Penjualan > Target Penjualan | accurate__budget-target__sales-target | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Harga Pemasok | Pembelian > Harga Pemasok | accurate__inventory__vendor-price | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Kategori Pemasok | Pembelian > Kategori Pemasok | accurate__vendor__vendor-category | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Pemasok | Pembelian > Pemasok | accurate__vendor__vendor | POST /api/purchases/vendors; web /modules/vendors | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Barang & Jasa | Persediaan > Barang & Jasa | accurate__inventory__item | POST/DELETE /api/sales/items; web /modules/items | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Gudang | Persediaan > Gudang | accurate__inventory__warehouse | web /modules/warehouses (list only) | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Kategori Barang | Persediaan > Kategori Barang | accurate__inventory__item-category | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Merek Barang | Persediaan > Merek Barang | accurate__inventory__item-brand | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Satuan Barang | Persediaan > Satuan Barang | accurate__inventory__unit | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Kategori Aset | Aset Tetap > Kategori Aset | accurate__fixed-asset__fa-type | — | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Kategori Aset Tetap Pajak | Aset Tetap > Kategori Aset Tetap Pajak | accurate__fixed-asset__fiscal-fa-type | GET /api/reports/master/fiscal-fa-types (list only) | 2 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kontraktor | Proyek Kontraktor | Kontraktor > Proyek Kontraktor | accurate__contractor__project-contractor | POST /api/contractor/projects | 2 | todo | Kontraktor |
| Perusahaan | Kalender | Perusahaan > Kalender | accurate__company__calendar | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Kontak | Perusahaan > Kontak | accurate__company__contact | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Log Aktifitas | Perusahaan > Log Aktifitas | accurate__company__audit | GET /api/reports/activity-log | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Transaksi Berulang | Perusahaan > Transaksi Berulang | accurate__company__recurring | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Perusahaan | Transaksi Favorit | Perusahaan > Transaksi Favorit | accurate__company__memorize-transaction | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Histori Akun | Buku Besar > Histori Akun | accurate__general-ledger__account-history | GET /api/reports/general-ledger/history | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Log Aktifitas Jurnal | Buku Besar > Log Aktifitas Jurnal | accurate__company__audit-journal | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Monitor Anggaran | Buku Besar > Monitor Anggaran | accurate__budget-target__accountbudget-monitor | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Buku Besar | Transfer Anggaran | Buku Besar > Transfer Anggaran | accurate__budget-target__accountbudget-transfer | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | Histori Bank | Kas & Bank > Histori Bank | accurate__cash-bank__bank-book | GET /api/reports/cash-bank/bank-book | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | Rekening Koran | Kas & Bank > Rekening Koran | accurate__cash-bank__bank-statement | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | Rekonsiliasi Bank | Kas & Bank > Rekonsiliasi Bank | accurate__cash-bank__bank-reconcile | web /cash-bank/reconciliation | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | SmartLink Virtual Account | Kas & Bank > SmartLink Virtual Account | accurate__company__application-virtual-account | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kas & Bank | SmartLink e-Payment | Kas & Bank > SmartLink e-Payment | accurate__company__application-epayment | — | 3 | todo | Manufaktur, Retail, Kontraktor |
| Kas & Bank | SmartLink e-Payment | Kas & Bank > SmartLink e-Payment | accurate__cash-bank__e-payment-history | — | 3 | todo | Trade |
| Penjualan | Check In | Penjualan > Check In | accurate__customer__sales-check-in | — | 3 | todo | Retail, Trade, Kontraktor |
| Penjualan | Penawaran Penjualan | Penjualan > Penawaran Penjualan | accurate__customer__sales-quotation | POST /api/sales/quotations; web /docs/sales-quotation | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Pesanan Penjualan | Penjualan > Pesanan Penjualan | accurate__customer__sales-order | POST /api/sales/orders; web /docs/sales-order | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Penjualan | Trade Portal | Penjualan > Trade Portal | accurate__customer__online-order | — | 3 | todo | Trade |
| Penjualan | Tukar Faktur | Penjualan > Tukar Faktur | accurate__customer__exchange-invoice | POST /api/sales/exchange-invoices | 3 | todo | Manufaktur |
| Pembelian | Perintah Pembayaran | Pembelian > Perintah Pembayaran | accurate__vendor__transfer-order | POST /api/purchases/transfer-orders | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Pesanan Pembelian | Pembelian > Pesanan Pembelian | accurate__vendor__purchase-order | POST /api/purchases/orders; web /docs/purchase-order | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Pembelian | Transfer Pemasok | Pembelian > Transfer Pemasok | accurate__vendor__multi-vendor-transfer | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Barang Stok Minimum | Persediaan > Barang Stok Minimum | accurate__inventory__minimum-stock-item | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Barang per Gudang | Persediaan > Barang per Gudang | accurate__inventory__stock-warehouse | GET /api/reports/inventory/valuation | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Pemenuhan Pesanan | Persediaan > Pemenuhan Pesanan | accurate__inventory__backorder-inquiry | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Perintah Stok Opname | Persediaan > Perintah Stok Opname | accurate__inventory__stock-opname-order | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Persediaan | Permintaan Barang | Persediaan > Permintaan Barang | accurate__vendor__purchase-requisition | POST /api/purchases/requisitions | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Aset per Lokasi | Aset Tetap > Aset per Lokasi | accurate__fixed-asset__asset-location | web /asset-modules/by-location | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Aset Tetap | Pindah Aset | Aset Tetap > Pindah Aset | accurate__fixed-asset__asset-transfer | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Kontraktor | Monitoring Kontraktor | Kontraktor > Monitoring Kontraktor | accurate__contractor__monitoring-contractor | GET /api/reports/contractor/* | 3 | todo | Kontraktor |
| Kontraktor | Rencana Anggaran | Kontraktor > Rencana Anggaran | accurate__contractor__budget-plan | POST /api/contractor/rabs | 3 | todo | Kontraktor |
| Kontraktor | Survei Proyek | Kontraktor > Survei Proyek | accurate__contractor__preliminary-survey | POST /api/contractor/surveys | 3 | todo | Kontraktor |
| Kontraktor | Timeline Kontraktor | Kontraktor > Timeline Kontraktor | accurate__contractor__timeline-contractor | — | 3 | todo | Kontraktor |
| SmartLink Tax | Email Faktur Pajak | SmartLink Tax > Email Faktur Pajak | accurate__customer__efaktur-send | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| SmartLink Tax | e-Faktur CTAS | SmartLink Tax > e-Faktur CTAS | accurate__company__efaktur-ctas | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| SmartLink Tax | e-Faktur Legacy | SmartLink Tax > e-Faktur Legacy | accurate__company__efaktur-online | — | 3 | todo | Manufaktur, Retail |
| Daftar Laporan | Analisa AI | Daftar Laporan > Analisa AI | accurate__report-insight-analysis | web /ai/history | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Daftar Laporan | Bukti Potong PPh Ps.21 | Daftar Laporan > Bukti Potong PPh Ps.21 | accurate__report__formulir-1721-bukti-potong | — | 3 | todo | Manufaktur, Retail |
| Daftar Laporan | Daftar Laporan | Daftar Laporan > Daftar Laporan | accurate__report__report | web /reports | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Daftar Laporan | SPT PPN / PPNBM | Daftar Laporan > SPT PPN / PPNBM | accurate__report__spt-masa | — | 3 | todo | Manufaktur, Retail, Trade, Kontraktor |
| Daftar Laporan | SPT PPh Ps.21 | Daftar Laporan > SPT PPh Ps.21 | accurate__report__formulir-1721-induk | — | 3 | todo | Manufaktur, Retail |
