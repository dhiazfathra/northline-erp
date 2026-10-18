# Accurate Daftar Laporan — catalog

Captured 2026-10-18 from Accurate Online v1.0.1#4970 (sandbox Data Usaha) via `/accurate/report/init-report.do`.
This is the acceptance-spec index: each report gets its own `docs/reports/<planId>.md` once reverse-engineered.

Param date kinds: FROMTO (date range), ASOF (single date), PERIOD/PERIODFROMTO (month/year), ASOFYEAR, COMPAREFROMTO, DATECOMPARE, YEARTODATE, NONE.

## Keuangan (FINANCIAL_STATMENT)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Laba/Rugi (Standar) | `ProfitLossStandardReport` | financialstatement | FROMTO | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Neraca (Standar) | `BalanceSheetStandardReport` | financialstatement | ASOF | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Laba/Rugi (Multi Periode) | `ProfitLossMultiPeriodReport` | financialstatement | PERIODFROMTO | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Neraca (Multi Periode) | `BalanceSheetMultiPeriodReport` | financialstatement | PERIODFROMTO | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Laba/Rugi (Multi Year) | `ProfitLossMultiYearReport` | financialstatement | ASOFYEAR | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Neraca (Multi Year) | `BalanceSheetMultiYearReport` | financialstatement | ASOFYEAR | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Arus Kas (Tak Langsung) | `CashFlowIndirectReport` | report | PERIODFROMTO | selectedBranch= | |
| Proyeksi Ketersediaan Kas | `CashAvailabilityChartReport` | chart | FROMTO | — | |
| Proyeksi Kas per Bulan | `CashProjectionReport` | report | NONE | — | |
| Laba/Rugi (Perbandingan Periode) | `ProfitLossComparePeriodReport` | financialstatement | COMPAREFROMTO | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Laba/Rugi (Kuartal) | `ProfitLossQuarterReport` | financialstatement | ASOFYEAR | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Neraca (Perbandingan Periode) | `BalanceSheetComparePeriodReport` | financialstatement | DATECOMPARE | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Neraca (Induk Skontro) | `BalanceSheetParentScontroReport` | financialstatement | ASOF | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | |
| Arus Kas (Langsung) | `CashFlowDirectReport` | report | PERIODFROMTO | selectedBranch= | |
| Rincian Arus Kas (Tak Langsung) | `CashFlowDetailIndirectReport` | report | PERIODFROMTO | showZeroBalance=false | |
| Rasio Keuangan (Per Tahun) | `FinancialRatioReport` | report | ASOFYEAR | — | |
| Rasio Keuangan (Per Bulan) | `FinancialRatioPerMonthReport` | report | PERIOD | — | |
| Fokus Keuangan | `FinancialFocusReport` | report | ASOFYEAR | — | |
| Laba Ditahan | `RetainedEarningReport` | report | ASOFYEAR | — | |
| Perubahan Ekuitas Pemilik | `OwnerEquityChangedReport` | report | FROMTO | — | |
| Grafik Perbandingan Nilai Akun | `AccountValueCompareChartReport` | chart | FROMTO | — | |
| Grafik Pendapatan berbanding Biaya | `RevenueToExpenseComparisonChartReport` | chart | FROMTO | — | |
| Grafik Harta Bersih | `NetWorthChartReport` | chart | PERIODFROMTO | — | |
| Grafik Rasio Likuiditas | `LiquidityRatioChartReport` | chart | PERIODFROMTO | — | |
| Grafik Pengembalian Aset | `ReturnOnAssetChartReport` | chart | PERIODFROMTO | — | |
| Grafik Pengembalian pada Modal | `ReturnOnEquityChartReport` | chart | PERIODFROMTO | — | |
| Arus Kas Multi Period (Langsung) | `CashFlowDirectMultiPeriodReport` | report | PERIODFROMTO | — | |
| Arus Kas Multi Period (Tak Langsung) | `CashFlowIndirectMultiPeriodReport` | report | PERIODFROMTO | — | |
| Rincian Arus Kas Multi Period (Tak Langsung) | `CashFlowDetailIndirectMultiPeriodReport` | report | PERIODFROMTO | showZeroBalance=false | |

## Buku Besar (GENERAL_LEDGER)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Keseluruhan Jurnal | `AllJournalReport` | report | FROMTO | selectedBranch= | |
| Keseluruhan Jurnal (CSV) | `AllJournalDownloadReport` | download | FROMTO | selectedBranch= | |
| Ringkasan Buku Besar | `GeneralLedgerSummaryReport` | report | FROMTO | showZeroBalance=false | |
| Histori Buku Besar | `GeneralLedgerHistoryReport` | report | FROMTO | selectedBranch= | |
| Histori Buku Besar (CSV) | `GeneralLedgerHistoryDownloadReport` | download | FROMTO | selectedBranch= | |
| Rincian Buku Besar | `GeneralLedgerDetailReport` | report | FROMTO | showOnlyHasTransaction=true | |
| Rincian Buku Besar (CSV) | `GeneralLedgerDetailDownloadReport` | download | FROMTO | showOnlyHasTransaction=true | |
| Rincian Jurnal Akun | `JournalDetailListReport` | report | FROMTO | selectedBranch= | |
| Rincian Jurnal Akun (CSV) | `JournalDetailListDownloadReport` | download | FROMTO | selectedBranch= | |
| Laba/Rugi Terealisasi | `RealizeGainLossReport` | report | FROMTO | — | |
| Laba/Rugi Tidak Terealisasi | `UnRealizeGainLossReport` | report | PERIODFROMTO | — | |
| Neraca Percobaan | `TrialBalanceReport` | report | FROMTO | showZeroBalance=false, showParentAccount=true | [verified](TrialBalanceReport.md) |
| Jurnal Umum | `JournalListReport` | report | FROMTO | selectedBranch= | |
| Daftar Akun Perkiraan | `GlAccountListReport` | report | ASOF | — | |
| Rincian Gaji Karyawan per Bulan | `EmployeePaymentByEmployeeReport` | crosstab | PERIOD | selectedBranch= | |
| Rincian Gaji Karyawan per Tahun | `EmployeePaymentYearlyByEmployeeReport` | crosstab | ASOFYEAR | selectedBranch= | |
| Pajak Penghasilan Karyawan | `EmployeePphReport` | crosstab | ASOFYEAR | selectedBranch= | |
| Porsi Gaji Karyawan | `EmployeeSalaryProportionReport` | chart | ASOFYEAR | selectedBranch= | |
| Gaji Karyawan per Tahun | `EmployeeSalaryPerYearReport` | chart | NONE | selectedBranch= | |
| Ringkasan Pencatatan Beban | `ExpenseAccrualSummaryReport` | report | FROMTO | selectedBranch= | |
| Rincian Pencatatan Beban | `ExpenseAccrualDetailReport` | report | FROMTO | selectedBranch= | |

## Kas & Bank (CASH_BANK)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Histori Bank | `BankBookReport` | report | FROMTO | selectedBank= | |
| Transaksi Bank Terekonsiliasi | `ReconciledBankReport` | report | FROMTO | selectedBank= | |
| Transaksi Bank belum Terekonsiliasi | `UnreconciledBankReport` | report | FROMTO | selectedBank= | |
| Ringkasan Pembayaran per Bank | `PaymentByBankSummaryReport` | crosstab | FROMTO | selectedBank= | |
| Ringkasan Penerimaan per Bank | `DepositByBankSummaryReport` | crosstab | FROMTO | selectedBank= | |
| Giro Mundur (Belum Jatuh Tempo) | `OutstandingChequeReport` | report | ASOF | selectedBank= | |
| Arus Kas per Akun | `CashFlowbyAccountReport` | report | FROMTO | selectedBank= | |
| Rincian Pembayaran per Bank | `PaymentByBankDetailReport` | report | FROMTO | selectedBank= | |
| Rincian Penerimaan per Bank | `DepositByBankDetailReport` | report | FROMTO | selectedBank= | |
| Daftar Kas | `CashBankAccountListReport` | report | ASOF | — | |
| Rekening Koran | `BankStatementReport` | report | FROMTO | selectedBank= | |
| Ringkasan Daftar Pembayaran | `PaymentListReport` | report | FROMTO | selectedBranch= | |
| Ringkasan Daftar Penerimaan | `DepositListReport` | report | FROMTO | selectedBranch= | |
| Rincian Beban Pembayaran | `PaymentLoadReport` | report | FROMTO | selectedBank= | |
| Rekonsiliasi Bank (Jurnal terhadap Rekening Koran) | `BankReconcileBookToStatementReport` | report | FROMTO | selectedBank= | |
| Rekonsiliasi Bank (Rekening Koran terhadap Jurnal) | `BankReconcileStatementToBookReport` | report | FROMTO | selectedBank= | |
| Daftar Piutang Karyawan | `EmployeeLoanListReport` | report | NONE | selectedBranch= | |
| Angsuran Pinjaman per Karyawan | `EmployeeLoanInstallmentByEmployeeReport` | report | NONE | selectedEmployeeLoan= | |
| History Peminjaman per Karyawan | `EmployeeLoanHistoryReport` | report | NONE | selectedEmployeeLoan= | |

## Piutang (AR_CUSTOMER)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Faktur Belum Lunas | `OutstandingSalesInvoiceReport` | report | ASOF | selectedBranch= | |
| Faktur Belum Lunas per Pelanggan | `OutstandingSalesInvoicePerCustomerReport` | crosstab | ASOF | selectedBranch= | |
| Umur Piutang | `AgingReceivableReport` | crosstab | ASOF | selectedBranch= | |
| Buku Besar Pembantu Piutang | `ARLedgerReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | |
| Histori Piutang | `ARHistoryReport` | report | FROMTO | selectedBranch= | |
| Rata-rata Pembayaran Pelanggan | `OwingCollectionPerCustomerReport` | report | FROMTO | selectedBranch= | |
| Rincian Umur Piutang | `AgingReceivableDetailReport` | report | ASOF | selectedBranch= | |
| Grafik Umur Piutang | `AgingReceivableChartReport` | chart | ASOF | selectedBranch= | |
| Rincian Buku Besar Pembantu Piutang | `ARLedgerDetailReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | |
| Pernyataan Piutang | `CustomerStatementReport` | report | FROMTO | selectedBranch= | |
| Grafik Rata-rata Pembayaran Pelanggan | `OwingCollectionGraphReport` | chart | FROMTO | — | |
| Pembayaran Faktur | `SalesInvoicePaidReport` | report | FROMTO | selectedBranch= | |
| Pembayaran PPh Penjualan | `SalesInvoicePphPaidReport` | report | FROMTO | selectedBranch= | |
| Sisa Kredit Pelanggan | `CustomerExistingCreditListReport` | crosstab | ASOF | selectedBranch= | |
| Penerimaan Penjualan | `SalesReceiptListReport` | report | FROMTO | selectedBranch= | |
| Rincian Penerimaan Penjualan | `SalesReceiptListDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Pelanggan | `CustomerListReport` | report | ASOF | selectedBranch= | |
| Limit Piutang Pelanggan | `CustomerLimitReport` | report | NONE | selectedBranch= | |
| Rincian Tukar Faktur | `ExchangeInvoiceDetailReport` | report | FROMTO | selectedBranch= | |

## Penjualan (SALES)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Penjualan per Pelanggan | `ViewSalesByCustomerReport` | crosstab | FROMTO | selectedBranch= | |
| Penjualan per Barang | `ViewSalesByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Penjualan per Merek | `ViewSalesByBrandReport` | crosstab | FROMTO | selectedBranch= | |
| Penjualan Barang per Pelanggan | `ViewSalesItemByCustomerReport` | crosstab | FROMTO | selectedBranch= | |
| Penjualan Barang per Gudang | `ViewSalesItemByWarehouseReport` | crosstab | FROMTO | selectedBranch= | |
| Penjualan Pelanggan per Barang | `ViewSalesCustomerByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Histori Proses Penjualan | `SalesFlowHistoryReport` | report | FROMTO | — | |
| Rincian Penjualan per Pelanggan | `ViewSalesByCustomerDetailReport` | report | FROMTO | selectedBranch= | |
| Rincian Penjualan per Barang | `ViewSalesByItemDetailReport` | report | FROMTO | selectedBranch= | |
| Penjualan per Cabang | `ViewSalesByBranchReport` | crosstab | FROMTO | selectedBranch= | |
| Penjualan Barang per Cabang | `ViewSalesItemByBranchReport` | crosstab | FROMTO | selectedBranch= | |
| Retur Penjualan per Barang | `SalesReturnByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Grafik Penjualan Bulanan | `AnnualSalesChartReport` | chart | FROMTO | selectedBranch= | |
| Porsi Penjualan per Pelanggan | `TopSalesCustomerChartReport` | chart | FROMTO | selectedBranch= | |
| Porsi Penjualan per Barang | `TopSalesItemChartReport` | chart | FROMTO | selectedBranch= | |
| Uang Muka Penjualan | `SalesDownPaymentByCustomerReport` | report | FROMTO | selectedBranch= | |
| Target Penjualan Barang | `ItemSalesTargetReport` | report | ASOFYEAR | selectedBranch= | |
| Target Penjualan per Kategori | `ItemCategorySalesTargetReport` | report | ASOFYEAR | selectedBranch= | |
| Target Penjualan per Bulan | `GeneralSalesTargetReport` | report | ASOFYEAR | selectedBranch= | |
| Daftar Pengiriman Pesanan | `DeliveryOrderListReport` | report | FROMTO | selectedBranch= | |
| Rincian Pengiriman Pesanan | `DeliveryOrderDetailReport` | report | FROMTO | selectedBranch= | |
| Status Pengiriman Pesanan | `DeliveryOrderHistorySummaryReport` | report | FROMTO | selectedBranch= | |
| Daftar Faktur Penjualan | `SalesInvoiceListReport` | report | FROMTO | selectedBranch= | |
| Rincian Faktur Penjualan | `SalesInvoiceDetailReport` | report | FROMTO | selectedBranch= | |
| Grafik Penjualan | `SalesInvoiceChartReport` | chart | YEARTODATE | selectedBranch= | |
| Daftar Retur Penjualan | `SalesReturnListReport` | report | FROMTO | selectedBranch= | |
| Rincian Retur Penjualan | `SalesReturnDetailReport` | report | FROMTO | selectedBranch= | |
| Penggunaan Uang Muka Penjualan | `SalesInvoiceDownPaymentDetailReport` | report | FROMTO | selectedBranch= | |
| Pembayaran Cicilan | `SalesInvoicePaidInstallmentListReport` | report | FROMTO | — | |
| Cicilan Belum Terbayar | `SalesInvoiceUnpaidInstallmentListReport` | report | ASOF | — | |
| Monitoring HPP | `CogsMonitoringReport` | report | NONE | selectedBranch= sel:ITEM_CATEGORY_ALL | |
| Profitabilitas per Faktur | `ProfitabilityBySalesInvoiceReport` | report | FROMTO | selectedBranch= | |
| Profitabilitas per Barang | `ProfitabilityByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Profitabilitas per Pelanggan | `ProfitabilityByCustomerReport` | crosstab | FROMTO | selectedBranch= | |
| Perubahan Harga Jual Per Barang | `SellingPriceAdjustmentHistoryReport` | report | FROMTO | selectedBranch= | |
| Penyesuaian Harga Jual | `SellingPriceAdjustmentDetailReport` | report | FROMTO | selectedBranch= | |
| Penyesuaian Harga Jual per Kategori | `SellingPriceAdjustmentDetailPerCategoryReport` | crosstab | FROMTO | selectedBranch= | |
| Penyesuaian Diskon Jual | `SellingDiscountAdjustmentDetailReport` | report | FROMTO | selectedBranch= | |
| Penyesuaian Diskon Jual per Kategori | `SellingDiscountAdjustmentDetailPerCategoryReport` | crosstab | FROMTO | selectedBranch= | |
| Barang Paling Laku | `SellingItemFrequencyReport` | report | FROMTO | selectedBranch= sel:ITEM_CATEGORY_ALL | |

## Utang (AP_VENDOR)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Faktur Belum Lunas | `OutstandingPurchaseInvoiceReport` | report | ASOF | selectedBranch= | |
| Faktur Belum Lunas per Pemasok | `OutstandingPurchaseInvoicePerVendorReport` | crosstab | ASOF | selectedBranch= | |
| Umur Utang | `AgingPayableReport` | crosstab | ASOF | selectedBranch= | |
| Buku Besar Pembantu Utang | `APLedgerReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | |
| Histori Utang | `APHistoryReport` | report | FROMTO | selectedBranch= | |
| Rincian Umur Utang | `AgingPayableDetailReport` | report | ASOF | selectedBranch= | |
| Rincian Buku Besar Pembantu Utang | `APLedgerDetailReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | |
| Grafik Umur Utang | `AgingPayableChartReport` | chart | ASOF | selectedBranch= | |
| Pernyataan Utang | `VendorStatementReport` | report | FROMTO | selectedBranch= | |
| Pembayaran Faktur | `PurchaseInvoicePaidReport` | report | FROMTO | selectedBranch= | |
| Pembayaran PPh Pembelian | `PurchaseInvoicePphPaidReport` | report | FROMTO | selectedBranch= | |
| Pembayaran Pembelian | `PurchasePaymentListReport` | report | FROMTO | selectedBranch= | |
| Rincian Pembayaran Pembelian | `PurchasePaymentListDetailReport` | report | FROMTO | selectedBranch= | |
| Utang per Bulan | `VendorPayablePerMonthReport` | report | ASOFYEAR | — | |
| Daftar Pemasok | `VendorListReport` | report | ASOF | selectedBranch= | |

## Pembelian (PURCHASE)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Pembelian per Pemasok | `PurchaseByVendorReport` | crosstab | FROMTO | selectedBranch= | |
| Pembelian per Barang | `PurchaseByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Pembelian per Biaya | `PurchaseByExpenseReport` | crosstab | FROMTO | selectedBranch= | |
| Uang Muka Pembelian | `PurchaseDownPaymentByVendorReport` | report | FROMTO | selectedBranch= | |
| Histori Proses Pembelian | `PurchaseFlowHistoryReport` | report | FROMTO | — | |
| Rincian Pembelian per Pemasok | `PurchaseByVendorDetailReport` | report | FROMTO | selectedBranch= | |
| Rincian Pembelian per Barang | `PurchaseByItemDetailReport` | report | FROMTO | selectedBranch= | |
| Retur Pembelian per Barang | `PurchaseReturnByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Pesanan per Pemasok (Belum Proses) | `PurchaseOrderByVendorReport` | crosstab | FROMTO | selectedBranch= | |
| Pesanan per Barang (Belum Proses) | `PurchaseOrderByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Daftar Pesanan Pembelian | `PurchaseOrderListReport` | report | FROMTO | selectedBranch= | |
| Rincian Pesanan Pembelian | `PurchaseOrderDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Penerimaan Barang | `ReceiveItemListReport` | report | FROMTO | selectedBranch= | |
| Rincian Penerimaan Barang | `ReceiveItemDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Faktur Pembelian | `PurchaseInvoiceListReport` | report | FROMTO | selectedBranch= | |
| Rincian Faktur Pembelian | `PurchaseInvoiceDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Retur Pembelian | `PurchaseReturnListReport` | report | FROMTO | selectedBranch= | |
| Rincian Retur Pembelian | `PurchaseReturnDetailReport` | report | FROMTO | selectedBranch= | |
| Penggunaan Uang Muka Pembelian | `PurchaseInvoiceDownPaymentDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Perintah Pembayaran | `TransferOrderListReport` | report | FROMTO | selectedBranch= | |
| Perubahan Harga Beli Per Barang | `VendorPriceHistoryReport` | report | ASOF | selectedItem= | |

## Persediaan (INVENTORY)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Nilai Persediaan | `InventoryValuationReport` | crosstab | FROMTO | selectedBranch= sel:ITEM_CATEGORY_ALL | |
| Rincian Nilai Persediaan (CSV) | `InventoryValuationDetailDownloadReport` | download | FROMTO | — sel:ITEM_CATEGORY_ALL | |
| Ketersediaan Stok Penjualan | `InventoryAnalysisReport` | report | ASOF | selectedBranch= sel:ITEM_CATEGORY_ALL | |
| Umur Persediaan | `InventoryAgingReport` | crosstab | ASOF | selectedWarehouse=, selectedBranch= sel:ITEM_CATEGORY_ALL | |
| Umur Persediaan per Gudang | `InventoryAgingByWarehouseReport` | crosstab | ASOF | selectedWarehouse=, selectedBranch= sel:ITEM_CATEGORY_ALL | |
| Rincian Nilai Persediaan | `InventoryValuationDetailReport` | report | FROMTO | selectedItem= | |
| Rincian Ketersediaan Stok Penjualan | `InventoryAnalysisDetailReport` | report | ASOF | selectedItem= | |
| Rincian Umur Persediaan | `InventoryAgingDetailReport` | report | ASOF | selectedItem=, selectedWarehouse= | |
| Kartu Stok Persediaan | `InventoryStockCardReport` | report | FROMTO | selectedItem= | |
| Permintaan per Barang (Belum Proses) | `PurchaseRequisitionByItemReport` | crosstab | FROMTO | selectedBranch= | |
| Daftar Permintaan Barang | `PurchaseRequisitionListReport` | report | FROMTO | selectedBranch= | |
| Rincian Permintaan Barang | `PurchaseRequisitionDetailReport` | report | FROMTO | selectedBranch= | |
| Status Pesanan Permintaan Barang | `PurchaseRequisitionOrderStatusReport` | report | FROMTO | selectedBranch= | |
| Barang Grup | `ItemGroupDetailReport` | report | NONE | selectedBranch= | |
| Penyesuaian Stok Barang | `InventoryAdjustmentDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Barang dan Jasa | `ItemListReport` | report | ASOF | selectedBranch= sel:ITEM_CATEGORY_ALL | |
| Umur Nomor Seri/Batch | `SerialNumberAgingDetailReport` | report | ASOF | selectedItem=, selectedWarehouse= | |
| Analisa Nilai Persediaan | `AnalysisInventoryValuationReport` | crosstab | FROMTO | selectedBranch= sel:ITEM_CATEGORY_ALL | |

## Gudang  (WAREHOUSE)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Kuantitas Barang per Gudang | `QuantityItemByWarehouseReport` | crosstab | ASOF | selectedBranch=, selectedWarehouse= sel:ITEM_CATEGORY_ALL | |
| Mutasi per Barang | `ItemMutationByWarehouseReport` | report | FROMTO | selectedItem= | |
| Mutasi per Gudang | `WarehouseMutationByItemReport` | report | FROMTO | selectedWarehouse= | |
| Ringkasan Mutasi Gudang | `WarehouseMutationSummaryReport` | report | FROMTO | selectedWarehouse= | |
| Lembar Penghitungan Stok | `PhysicalInventoryCountSheetReport` | report | ASOF | selectedWarehouse, selectedBranch= | |
| Mutasi Nomor Seri/Produksi | `ReceivedDeliveredSerialNumberReport` | report | FROMTO | selectedItem= | |
| Sisa Umur Per Nomor Produksi | `RemainingAgeSerialNumberDetailReport` | report | ASOF | selectedItem= | |
| Ringkasan Pemindahan Barang | `ItemTransferListReport` | report | FROMTO | — | |
| Pergerakan Stok per Barang | `StockMovementByWarehouseReport` | report | FROMTO | selectedWarehouse | |

## Pekerjaan Pesanan (JOB_ORDER)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Rincian Penambahan Bahan Baku | `MaterialAdjustmentDetailReport` | report | FROMTO | selectedBranch= | |
| Rincian Barang Penyelesaian Pesanan  | `RollOverItemDetailReport` | report | FROMTO | selectedBranch= | |
| Rincian Akun Penyelesaian Pesanan  | `RollOverAccountDetailReport` | report | FROMTO | selectedBranch= | |
| Daftar Pekerjaan Pesanan  | `JobOrderListReport` | report | FROMTO | — | |
| Daftar Penyelesaian Pesanan | `RollOverListReport` | report | FROMTO | — | |
| Daftar Penambahan Bahan Baku | `MaterialAdjustmentListReport` | report | FROMTO | — | |

## Manufaktur (FABRICATION)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Jurnal Perintah Kerja | `WorkOrderJournalReport` | report | NONE | selectedWorkOrder= | |
| Penyesuaian Bahan (Harga Pokok Produksi) | `AdjustmentCOGSManufactureReport` | report | PERIOD | — | |
| Pembelian (Harga Pokok Produksi) | `PurchaseCOGSManufactureReport` | report | PERIOD | — | |

## Aset Tetap (FIXED_ASSET)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Daftar Aset Tetap | `FixedAssetListReport` | report | NONE | — | |
| Aset Tetap per Kategori | `FixedAssetByCategoryReport` | report | ASOF | — | |
| Histori Aset | `FixedAssetHistoryReport` | report | FROMTO | selectedAsset= | |
| Jurnal Aset | `FixedAssetJournalReport` | report | NONE | selectedAsset= | |
| Perbedaan Penyusutan | `DifferentIntermDepreciationReport` | report | ASOFYEAR | selectedAsset= | |
| Histori Lokasi Aset | `AssetLocationHistoryReport` | report | NONE | selectedAsset= | |
| Detail Aset Tetap | `FixedAssetDetailReport` | report | NONE | selectedAsset= | |
| Histori Perubahan Aset | `FixedAssetEditedHistoryReport` | report | FROMTO | selectedAsset= | |
| Daftar Kategori Aset Tetap Pajak | `FiscalFaTypeListReport` | report | NONE | — | |
| Daftar Perubahan Aset Tetap | `FixedAssetEditedListReport` | report | FROMTO | — | |
| Daftar Disposisi Aset Tetap | `FixedAssetDisposedListReport` | report | FROMTO | — | |

## Pajak (TAX_SUPPORT)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Daftar PPN/PPnBM Keluaran | `TaxationOutReport` | report | FROMTO | — | |
| Daftar PPN/PPnBM Masukan | `TaxationInReport` | report | FROMTO | — | |
| Rekonsiliasi PPN Lebih/Kurang Bayar | `TaxationInOutReport` | report | FROMTO | — | |
| Faktur Penjualan SPT Masa PPN | `SalesInvoiceSPTListReport` | report | FROMTO | — | |
| Faktur Pembelian SPT Masa PPN | `PurchaseInvoiceSPTListReport` | report | FROMTO | — | |
| Daftar Bukti Potong PPh Pembelian | `PurchasePaymentPPhReport` | report | FROMTO | — | |
| Daftar Bukti Potong PPh Penjualan | `SalesReceiptPPhReport` | report | FROMTO | — | |

## Pemeriksaan (AUDIT)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Selisih Saldo Akun Persediaan dengan Nilai Barang | `ItemValueToAccountBalanceDifferenceReport` | report | FROMTO | — | |
| Selisih Akun Pembelian belum tertagih | `UnbilledAccountBalanceDifferenceReport` | report | FROMTO | — | |

## Lain-lain (OTHERS)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Daftar Mata Uang | `CurrencyListReport` | report | NONE | — | |
| Daftar FOB | `FreeOnBoardListReport` | report | NONE | — | |
| Daftar Pajak | `TaxListReport` | report | NONE | — | |
| Daftar Pengiriman | `ShipmentListReport` | report | NONE | — | |
| Daftar Karyawan | `SalesmanListReport` | report | NONE | — | |
| Daftar Log Aktifitas | `AuditListReport` | report | FROMTO | — | |
| Daftar Pengguna per Cabang | `UserByBranchListReport` | report | NONE | — | |
| Daftar Akses Grup | `AccessGroupPrivilegeListReport` | report | NONE | — | |
| Daftar Hak Akses per Pengguna | `AccessPrivilegeByUserListReport` | report | NONE | selectedUser= | |
