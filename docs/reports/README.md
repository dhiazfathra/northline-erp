# Accurate Daftar Laporan — catalog

Captured 2026-10-18 from Accurate Online v1.0.1#4970 (sandbox Data Usaha) via `/accurate/report/init-report.do`.
Spec column: **verified** = zero-diff ERP test against an Accurate fixture; **spec** = parameters/layout captured, not yet verified; **out of scope** = spec kept, not part of the accounting module (ADR-0010). Unlabeled charts count as verified through their backing table report (ADR-0011).
This is the acceptance-spec index: each report gets its own `docs/reports/<planId>.md` once reverse-engineered.

Param date kinds: FROMTO (date range), ASOF (single date), PERIOD/PERIODFROMTO (month/year), ASOFYEAR, COMPAREFROMTO, DATECOMPARE, YEARTODATE, NONE.

## Keuangan (FINANCIAL_STATMENT)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Laba/Rugi (Standar) | `ProfitLossStandardReport` | financialstatement | FROMTO | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](ProfitLossStandardReport.md) |
| Neraca (Standar) | `BalanceSheetStandardReport` | financialstatement | ASOF | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](BalanceSheetStandardReport.md) |
| Laba/Rugi (Multi Periode) | `ProfitLossMultiPeriodReport` | financialstatement | PERIODFROMTO | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](ProfitLossMultiPeriodReport.md) |
| Neraca (Multi Periode) | `BalanceSheetMultiPeriodReport` | financialstatement | PERIODFROMTO | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](BalanceSheetMultiPeriodReport.md) |
| Laba/Rugi (Multi Year) | `ProfitLossMultiYearReport` | financialstatement | ASOFYEAR | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](ProfitLossMultiYearReport.md) |
| Neraca (Multi Year) | `BalanceSheetMultiYearReport` | financialstatement | ASOFYEAR | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](BalanceSheetMultiYearReport.md) |
| Arus Kas (Tak Langsung) | `CashFlowIndirectReport` | report | PERIODFROMTO | selectedBranch= | [verified](CashFlowIndirectReport.md) |
| Proyeksi Ketersediaan Kas | `CashAvailabilityChartReport` | chart | FROMTO | — | [verified](CashAvailabilityChartReport.md) |
| Proyeksi Kas per Bulan | `CashProjectionReport` | report | NONE | — | [verified](CashProjectionReport.md) |
| Laba/Rugi (Perbandingan Periode) | `ProfitLossComparePeriodReport` | financialstatement | COMPAREFROMTO | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](ProfitLossComparePeriodReport.md) |
| Laba/Rugi (Kuartal) | `ProfitLossQuarterReport` | financialstatement | ASOFYEAR | selectedBranch=, selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](ProfitLossQuarterReport.md) |
| Neraca (Perbandingan Periode) | `BalanceSheetComparePeriodReport` | financialstatement | DATECOMPARE | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](BalanceSheetComparePeriodReport.md) |
| Neraca (Induk Skontro) | `BalanceSheetParentScontroReport` | financialstatement | ASOF | selectedCurrency=, showTotal=false, showParentAccount=true, showChildAccount=true, showZeroBalance=false, showParentAccountBalance=true | [verified](BalanceSheetParentScontroReport.md) |
| Arus Kas (Langsung) | `CashFlowDirectReport` | report | PERIODFROMTO | selectedBranch= | [verified](CashFlowDirectReport.md) |
| Rincian Arus Kas (Tak Langsung) | `CashFlowDetailIndirectReport` | report | PERIODFROMTO | showZeroBalance=false | [verified](CashFlowDetailIndirectReport.md) |
| Rasio Keuangan (Per Tahun) | `FinancialRatioReport` | report | ASOFYEAR | — | [verified](FinancialRatioReport.md) |
| Rasio Keuangan (Per Bulan) | `FinancialRatioPerMonthReport` | report | PERIOD | — | [verified](FinancialRatioPerMonthReport.md) |
| Fokus Keuangan | `FinancialFocusReport` | report | ASOFYEAR | — | [verified](FinancialFocusReport.md) |
| Laba Ditahan | `RetainedEarningReport` | report | ASOFYEAR | — | [verified](RetainedEarningReport.md) |
| Perubahan Ekuitas Pemilik | `OwnerEquityChangedReport` | report | FROMTO | — | [verified](OwnerEquityChangedReport.md) |
| Grafik Perbandingan Nilai Akun | `AccountValueCompareChartReport` | chart | FROMTO | — | [verified](AccountValueCompareChartReport.md) |
| Grafik Pendapatan berbanding Biaya | `RevenueToExpenseComparisonChartReport` | chart | FROMTO | — | [verified](RevenueToExpenseComparisonChartReport.md) |
| Grafik Harta Bersih | `NetWorthChartReport` | chart | PERIODFROMTO | — | [verified](NetWorthChartReport.md) |
| Grafik Rasio Likuiditas | `LiquidityRatioChartReport` | chart | PERIODFROMTO | — | [verified](LiquidityRatioChartReport.md) |
| Grafik Pengembalian Aset | `ReturnOnAssetChartReport` | chart | PERIODFROMTO | — | [verified](ReturnOnAssetChartReport.md) |
| Grafik Pengembalian pada Modal | `ReturnOnEquityChartReport` | chart | PERIODFROMTO | — | [verified](ReturnOnEquityChartReport.md) |
| Arus Kas Multi Period (Langsung) | `CashFlowDirectMultiPeriodReport` | report | PERIODFROMTO | — | [verified](CashFlowDirectMultiPeriodReport.md) |
| Arus Kas Multi Period (Tak Langsung) | `CashFlowIndirectMultiPeriodReport` | report | PERIODFROMTO | — | [verified](CashFlowIndirectMultiPeriodReport.md) |
| Rincian Arus Kas Multi Period (Tak Langsung) | `CashFlowDetailIndirectMultiPeriodReport` | report | PERIODFROMTO | showZeroBalance=false | [verified](CashFlowDetailIndirectMultiPeriodReport.md) |

## Buku Besar (GENERAL_LEDGER)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Keseluruhan Jurnal | `AllJournalReport` | report | FROMTO | selectedBranch= | [verified](AllJournalReport.md) |
| Keseluruhan Jurnal (CSV) | `AllJournalDownloadReport` | download | FROMTO | selectedBranch= | [verified](AllJournalDownloadReport.md) |
| Ringkasan Buku Besar | `GeneralLedgerSummaryReport` | report | FROMTO | showZeroBalance=false | [verified](GeneralLedgerSummaryReport.md) |
| Histori Buku Besar | `GeneralLedgerHistoryReport` | report | FROMTO | selectedBranch= | [verified](GeneralLedgerHistoryReport.md) |
| Histori Buku Besar (CSV) | `GeneralLedgerHistoryDownloadReport` | download | FROMTO | selectedBranch= | [verified](GeneralLedgerHistoryDownloadReport.md) |
| Rincian Buku Besar | `GeneralLedgerDetailReport` | report | FROMTO | showOnlyHasTransaction=true | [verified](GeneralLedgerDetailReport.md) |
| Rincian Buku Besar (CSV) | `GeneralLedgerDetailDownloadReport` | download | FROMTO | showOnlyHasTransaction=true | [verified](GeneralLedgerDetailDownloadReport.md) |
| Rincian Jurnal Akun | `JournalDetailListReport` | report | FROMTO | selectedBranch= | [verified](JournalDetailListReport.md) |
| Rincian Jurnal Akun (CSV) | `JournalDetailListDownloadReport` | download | FROMTO | selectedBranch= | [verified](JournalDetailListDownloadReport.md) |
| Laba/Rugi Terealisasi | `RealizeGainLossReport` | report | FROMTO | — | [verified](RealizeGainLossReport.md) |
| Laba/Rugi Tidak Terealisasi | `UnRealizeGainLossReport` | report | PERIODFROMTO | — | [verified](UnRealizeGainLossReport.md) |
| Neraca Percobaan | `TrialBalanceReport` | report | FROMTO | showZeroBalance=false, showParentAccount=true | [verified](TrialBalanceReport.md) |
| Jurnal Umum | `JournalListReport` | report | FROMTO | selectedBranch= | [verified](JournalListReport.md) |
| Daftar Akun Perkiraan | `GlAccountListReport` | report | ASOF | — | [verified](GlAccountListReport.md) |
| Rincian Gaji Karyawan per Bulan | `EmployeePaymentByEmployeeReport` | crosstab | PERIOD | selectedBranch= | [out of scope](EmployeePaymentByEmployeeReport.md) |
| Rincian Gaji Karyawan per Tahun | `EmployeePaymentYearlyByEmployeeReport` | crosstab | ASOFYEAR | selectedBranch= | [out of scope](EmployeePaymentYearlyByEmployeeReport.md) |
| Pajak Penghasilan Karyawan | `EmployeePphReport` | crosstab | ASOFYEAR | selectedBranch= | [out of scope](EmployeePphReport.md) |
| Porsi Gaji Karyawan | `EmployeeSalaryProportionReport` | chart | ASOFYEAR | selectedBranch= | [out of scope](EmployeeSalaryProportionReport.md) |
| Gaji Karyawan per Tahun | `EmployeeSalaryPerYearReport` | chart | NONE | selectedBranch= | [out of scope](EmployeeSalaryPerYearReport.md) |
| Ringkasan Pencatatan Beban | `ExpenseAccrualSummaryReport` | report | FROMTO | selectedBranch= | [verified](ExpenseAccrualSummaryReport.md) |
| Rincian Pencatatan Beban | `ExpenseAccrualDetailReport` | report | FROMTO | selectedBranch= | [verified](ExpenseAccrualDetailReport.md) |

## Kas & Bank (CASH_BANK)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Histori Bank | `BankBookReport` | report | FROMTO | selectedBank= | [verified](BankBookReport.md) |
| Transaksi Bank Terekonsiliasi | `ReconciledBankReport` | report | FROMTO | selectedBank= | [verified](ReconciledBankReport.md) |
| Transaksi Bank belum Terekonsiliasi | `UnreconciledBankReport` | report | FROMTO | selectedBank= | [verified](UnreconciledBankReport.md) |
| Ringkasan Pembayaran per Bank | `PaymentByBankSummaryReport` | crosstab | FROMTO | selectedBank= | [verified](PaymentByBankSummaryReport.md) |
| Ringkasan Penerimaan per Bank | `DepositByBankSummaryReport` | crosstab | FROMTO | selectedBank= | [verified](DepositByBankSummaryReport.md) |
| Giro Mundur (Belum Jatuh Tempo) | `OutstandingChequeReport` | report | ASOF | selectedBank= | [verified](OutstandingChequeReport.md) |
| Arus Kas per Akun | `CashFlowbyAccountReport` | report | FROMTO | selectedBank= | [verified](CashFlowbyAccountReport.md) |
| Rincian Pembayaran per Bank | `PaymentByBankDetailReport` | report | FROMTO | selectedBank= | [verified](PaymentByBankDetailReport.md) |
| Rincian Penerimaan per Bank | `DepositByBankDetailReport` | report | FROMTO | selectedBank= | [verified](DepositByBankDetailReport.md) |
| Daftar Kas | `CashBankAccountListReport` | report | ASOF | — | [verified](CashBankAccountListReport.md) |
| Rekening Koran | `BankStatementReport` | report | FROMTO | selectedBank= | [verified](BankStatementReport.md) |
| Ringkasan Daftar Pembayaran | `PaymentListReport` | report | FROMTO | selectedBranch= | [verified](PaymentListReport.md) |
| Ringkasan Daftar Penerimaan | `DepositListReport` | report | FROMTO | selectedBranch= | [verified](DepositListReport.md) |
| Rincian Beban Pembayaran | `PaymentLoadReport` | report | FROMTO | selectedBank= | [verified](PaymentLoadReport.md) |
| Rekonsiliasi Bank (Jurnal terhadap Rekening Koran) | `BankReconcileBookToStatementReport` | report | FROMTO | selectedBank= | [verified](BankReconcileBookToStatementReport.md) |
| Rekonsiliasi Bank (Rekening Koran terhadap Jurnal) | `BankReconcileStatementToBookReport` | report | FROMTO | selectedBank= | [verified](BankReconcileStatementToBookReport.md) |
| Daftar Piutang Karyawan | `EmployeeLoanListReport` | report | NONE | selectedBranch= | [verified](EmployeeLoanListReport.md) |
| Angsuran Pinjaman per Karyawan | `EmployeeLoanInstallmentByEmployeeReport` | report | NONE | selectedEmployeeLoan= | [verified](EmployeeLoanInstallmentByEmployeeReport.md) |
| History Peminjaman per Karyawan | `EmployeeLoanHistoryReport` | report | NONE | selectedEmployeeLoan= | [verified](EmployeeLoanHistoryReport.md) |

## Piutang (AR_CUSTOMER)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Faktur Belum Lunas | `OutstandingSalesInvoiceReport` | report | ASOF | selectedBranch= | [verified](OutstandingSalesInvoiceReport.md) |
| Faktur Belum Lunas per Pelanggan | `OutstandingSalesInvoicePerCustomerReport` | crosstab | ASOF | selectedBranch= | [verified](OutstandingSalesInvoicePerCustomerReport.md) |
| Umur Piutang | `AgingReceivableReport` | crosstab | ASOF | selectedBranch= | [verified](AgingReceivableReport.md) |
| Buku Besar Pembantu Piutang | `ARLedgerReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | [verified](ARLedgerReport.md) |
| Histori Piutang | `ARHistoryReport` | report | FROMTO | selectedBranch= | [verified](ARHistoryReport.md) |
| Rata-rata Pembayaran Pelanggan | `OwingCollectionPerCustomerReport` | report | FROMTO | selectedBranch= | [verified](OwingCollectionPerCustomerReport.md) |
| Rincian Umur Piutang | `AgingReceivableDetailReport` | report | ASOF | selectedBranch= | [verified](AgingReceivableDetailReport.md) |
| Grafik Umur Piutang | `AgingReceivableChartReport` | chart | ASOF | selectedBranch= | [verified](AgingReceivableChartReport.md) |
| Rincian Buku Besar Pembantu Piutang | `ARLedgerDetailReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | [verified](ARLedgerDetailReport.md) |
| Pernyataan Piutang | `CustomerStatementReport` | report | FROMTO | selectedBranch= | [verified](CustomerStatementReport.md) |
| Grafik Rata-rata Pembayaran Pelanggan | `OwingCollectionGraphReport` | chart | FROMTO | — | [verified](OwingCollectionGraphReport.md) |
| Pembayaran Faktur | `SalesInvoicePaidReport` | report | FROMTO | selectedBranch= | [verified](SalesInvoicePaidReport.md) |
| Pembayaran PPh Penjualan | `SalesInvoicePphPaidReport` | report | FROMTO | selectedBranch= | [out of scope](SalesInvoicePphPaidReport.md) |
| Sisa Kredit Pelanggan | `CustomerExistingCreditListReport` | crosstab | ASOF | selectedBranch= | [verified](CustomerExistingCreditListReport.md) |
| Penerimaan Penjualan | `SalesReceiptListReport` | report | FROMTO | selectedBranch= | [verified](SalesReceiptListReport.md) |
| Rincian Penerimaan Penjualan | `SalesReceiptListDetailReport` | report | FROMTO | selectedBranch= | [verified](SalesReceiptListDetailReport.md) |
| Daftar Pelanggan | `CustomerListReport` | report | ASOF | selectedBranch= | [verified](CustomerListReport.md) |
| Limit Piutang Pelanggan | `CustomerLimitReport` | report | NONE | selectedBranch= | [verified](CustomerLimitReport.md) |
| Rincian Tukar Faktur | `ExchangeInvoiceDetailReport` | report | FROMTO | selectedBranch= | [verified](ExchangeInvoiceDetailReport.md) |

## Penjualan (SALES)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Penjualan per Pelanggan | `ViewSalesByCustomerReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesByCustomerReport.md) |
| Penjualan per Barang | `ViewSalesByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesByItemReport.md) |
| Penjualan per Merek | `ViewSalesByBrandReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesByBrandReport.md) |
| Penjualan Barang per Pelanggan | `ViewSalesItemByCustomerReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesItemByCustomerReport.md) |
| Penjualan Barang per Gudang | `ViewSalesItemByWarehouseReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesItemByWarehouseReport.md) |
| Penjualan Pelanggan per Barang | `ViewSalesCustomerByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesCustomerByItemReport.md) |
| Histori Proses Penjualan | `SalesFlowHistoryReport` | report | FROMTO | — | [verified](SalesFlowHistoryReport.md) |
| Rincian Penjualan per Pelanggan | `ViewSalesByCustomerDetailReport` | report | FROMTO | selectedBranch= | [verified](ViewSalesByCustomerDetailReport.md) |
| Rincian Penjualan per Barang | `ViewSalesByItemDetailReport` | report | FROMTO | selectedBranch= | [verified](ViewSalesByItemDetailReport.md) |
| Penjualan per Cabang | `ViewSalesByBranchReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesByBranchReport.md) |
| Penjualan Barang per Cabang | `ViewSalesItemByBranchReport` | crosstab | FROMTO | selectedBranch= | [verified](ViewSalesItemByBranchReport.md) |
| Retur Penjualan per Barang | `SalesReturnByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](SalesReturnByItemReport.md) |
| Grafik Penjualan Bulanan | `AnnualSalesChartReport` | chart | FROMTO | selectedBranch= | [verified](AnnualSalesChartReport.md) |
| Porsi Penjualan per Pelanggan | `TopSalesCustomerChartReport` | chart | FROMTO | selectedBranch= | [verified](TopSalesCustomerChartReport.md) |
| Porsi Penjualan per Barang | `TopSalesItemChartReport` | chart | FROMTO | selectedBranch= | [verified](TopSalesItemChartReport.md) |
| Uang Muka Penjualan | `SalesDownPaymentByCustomerReport` | report | FROMTO | selectedBranch= | [verified](SalesDownPaymentByCustomerReport.md) |
| Target Penjualan Barang | `ItemSalesTargetReport` | report | ASOFYEAR | selectedBranch= | [verified](ItemSalesTargetReport.md) |
| Target Penjualan per Kategori | `ItemCategorySalesTargetReport` | report | ASOFYEAR | selectedBranch= | [verified](ItemCategorySalesTargetReport.md) |
| Target Penjualan per Bulan | `GeneralSalesTargetReport` | report | ASOFYEAR | selectedBranch= | [verified](GeneralSalesTargetReport.md) |
| Daftar Pengiriman Pesanan | `DeliveryOrderListReport` | report | FROMTO | selectedBranch= | [verified](DeliveryOrderListReport.md) |
| Rincian Pengiriman Pesanan | `DeliveryOrderDetailReport` | report | FROMTO | selectedBranch= | [verified](DeliveryOrderDetailReport.md) |
| Status Pengiriman Pesanan | `DeliveryOrderHistorySummaryReport` | report | FROMTO | selectedBranch= | [verified](DeliveryOrderHistorySummaryReport.md) |
| Daftar Faktur Penjualan | `SalesInvoiceListReport` | report | FROMTO | selectedBranch= | [verified](SalesInvoiceListReport.md) |
| Rincian Faktur Penjualan | `SalesInvoiceDetailReport` | report | FROMTO | selectedBranch= | [verified](SalesInvoiceDetailReport.md) |
| Grafik Penjualan | `SalesInvoiceChartReport` | chart | YEARTODATE | selectedBranch= | [verified](SalesInvoiceChartReport.md) |
| Daftar Retur Penjualan | `SalesReturnListReport` | report | FROMTO | selectedBranch= | [verified](SalesReturnListReport.md) |
| Rincian Retur Penjualan | `SalesReturnDetailReport` | report | FROMTO | selectedBranch= | [verified](SalesReturnDetailReport.md) |
| Penggunaan Uang Muka Penjualan | `SalesInvoiceDownPaymentDetailReport` | report | FROMTO | selectedBranch= | [verified](SalesInvoiceDownPaymentDetailReport.md) |
| Pembayaran Cicilan | `SalesInvoicePaidInstallmentListReport` | report | FROMTO | — | [verified](SalesInvoicePaidInstallmentListReport.md) |
| Cicilan Belum Terbayar | `SalesInvoiceUnpaidInstallmentListReport` | report | ASOF | — | [verified](SalesInvoiceUnpaidInstallmentListReport.md) |
| Monitoring HPP | `CogsMonitoringReport` | report | NONE | selectedBranch= sel:ITEM_CATEGORY_ALL | [out of scope](CogsMonitoringReport.md) |
| Profitabilitas per Faktur | `ProfitabilityBySalesInvoiceReport` | report | FROMTO | selectedBranch= | [verified](ProfitabilityBySalesInvoiceReport.md) |
| Profitabilitas per Barang | `ProfitabilityByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](ProfitabilityByItemReport.md) |
| Profitabilitas per Pelanggan | `ProfitabilityByCustomerReport` | crosstab | FROMTO | selectedBranch= | [verified](ProfitabilityByCustomerReport.md) |
| Perubahan Harga Jual Per Barang | `SellingPriceAdjustmentHistoryReport` | report | FROMTO | selectedBranch= | [verified](SellingPriceAdjustmentHistoryReport.md) |
| Penyesuaian Harga Jual | `SellingPriceAdjustmentDetailReport` | report | FROMTO | selectedBranch= | [verified](SellingPriceAdjustmentDetailReport.md) |
| Penyesuaian Harga Jual per Kategori | `SellingPriceAdjustmentDetailPerCategoryReport` | crosstab | FROMTO | selectedBranch= | [verified](SellingPriceAdjustmentDetailPerCategoryReport.md) |
| Penyesuaian Diskon Jual | `SellingDiscountAdjustmentDetailReport` | report | FROMTO | selectedBranch= | [verified](SellingDiscountAdjustmentDetailReport.md) |
| Penyesuaian Diskon Jual per Kategori | `SellingDiscountAdjustmentDetailPerCategoryReport` | crosstab | FROMTO | selectedBranch= | [verified](SellingDiscountAdjustmentDetailPerCategoryReport.md) |
| Barang Paling Laku | `SellingItemFrequencyReport` | report | FROMTO | selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](SellingItemFrequencyReport.md) |

## Utang (AP_VENDOR)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Faktur Belum Lunas | `OutstandingPurchaseInvoiceReport` | report | ASOF | selectedBranch= | [verified](OutstandingPurchaseInvoiceReport.md) |
| Faktur Belum Lunas per Pemasok | `OutstandingPurchaseInvoicePerVendorReport` | crosstab | ASOF | selectedBranch= | [verified](OutstandingPurchaseInvoicePerVendorReport.md) |
| Umur Utang | `AgingPayableReport` | crosstab | ASOF | selectedBranch= | [verified](AgingPayableReport.md) |
| Buku Besar Pembantu Utang | `APLedgerReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | [verified](APLedgerReport.md) |
| Histori Utang | `APHistoryReport` | report | FROMTO | selectedBranch= | [verified](APHistoryReport.md) |
| Rincian Umur Utang | `AgingPayableDetailReport` | report | ASOF | selectedBranch= | [verified](AgingPayableDetailReport.md) |
| Rincian Buku Besar Pembantu Utang | `APLedgerDetailReport` | report | FROMTO | selectedBranch=, showOnlyHasTransaction=true | [verified](APLedgerDetailReport.md) |
| Grafik Umur Utang | `AgingPayableChartReport` | chart | ASOF | selectedBranch= | [verified](AgingPayableChartReport.md) |
| Pernyataan Utang | `VendorStatementReport` | report | FROMTO | selectedBranch= | [verified](VendorStatementReport.md) |
| Pembayaran Faktur | `PurchaseInvoicePaidReport` | report | FROMTO | selectedBranch= | [verified](PurchaseInvoicePaidReport.md) |
| Pembayaran PPh Pembelian | `PurchaseInvoicePphPaidReport` | report | FROMTO | selectedBranch= | [out of scope](PurchaseInvoicePphPaidReport.md) |
| Pembayaran Pembelian | `PurchasePaymentListReport` | report | FROMTO | selectedBranch= | [verified](PurchasePaymentListReport.md) |
| Rincian Pembayaran Pembelian | `PurchasePaymentListDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchasePaymentListDetailReport.md) |
| Utang per Bulan | `VendorPayablePerMonthReport` | report | ASOFYEAR | — | [verified](VendorPayablePerMonthReport.md) |
| Daftar Pemasok | `VendorListReport` | report | ASOF | selectedBranch= | [verified](VendorListReport.md) |

## Pembelian (PURCHASE)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Pembelian per Pemasok | `PurchaseByVendorReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseByVendorReport.md) |
| Pembelian per Barang | `PurchaseByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseByItemReport.md) |
| Pembelian per Biaya | `PurchaseByExpenseReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseByExpenseReport.md) |
| Uang Muka Pembelian | `PurchaseDownPaymentByVendorReport` | report | FROMTO | selectedBranch= | [verified](PurchaseDownPaymentByVendorReport.md) |
| Histori Proses Pembelian | `PurchaseFlowHistoryReport` | report | FROMTO | — | [verified](PurchaseFlowHistoryReport.md) |
| Rincian Pembelian per Pemasok | `PurchaseByVendorDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseByVendorDetailReport.md) |
| Rincian Pembelian per Barang | `PurchaseByItemDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseByItemDetailReport.md) |
| Retur Pembelian per Barang | `PurchaseReturnByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseReturnByItemReport.md) |
| Pesanan per Pemasok (Belum Proses) | `PurchaseOrderByVendorReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseOrderByVendorReport.md) |
| Pesanan per Barang (Belum Proses) | `PurchaseOrderByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseOrderByItemReport.md) |
| Daftar Pesanan Pembelian | `PurchaseOrderListReport` | report | FROMTO | selectedBranch= | [verified](PurchaseOrderListReport.md) |
| Rincian Pesanan Pembelian | `PurchaseOrderDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseOrderDetailReport.md) |
| Daftar Penerimaan Barang | `ReceiveItemListReport` | report | FROMTO | selectedBranch= | [verified](ReceiveItemListReport.md) |
| Rincian Penerimaan Barang | `ReceiveItemDetailReport` | report | FROMTO | selectedBranch= | [verified](ReceiveItemDetailReport.md) |
| Daftar Faktur Pembelian | `PurchaseInvoiceListReport` | report | FROMTO | selectedBranch= | [verified](PurchaseInvoiceListReport.md) |
| Rincian Faktur Pembelian | `PurchaseInvoiceDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseInvoiceDetailReport.md) |
| Daftar Retur Pembelian | `PurchaseReturnListReport` | report | FROMTO | selectedBranch= | [verified](PurchaseReturnListReport.md) |
| Rincian Retur Pembelian | `PurchaseReturnDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseReturnDetailReport.md) |
| Penggunaan Uang Muka Pembelian | `PurchaseInvoiceDownPaymentDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseInvoiceDownPaymentDetailReport.md) |
| Daftar Perintah Pembayaran | `TransferOrderListReport` | report | FROMTO | selectedBranch= | [out of scope](TransferOrderListReport.md) |
| Perubahan Harga Beli Per Barang | `VendorPriceHistoryReport` | report | ASOF | selectedItem= | [verified](VendorPriceHistoryReport.md) |

## Persediaan (INVENTORY)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Nilai Persediaan | `InventoryValuationReport` | crosstab | FROMTO | selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](InventoryValuationReport.md) |
| Rincian Nilai Persediaan (CSV) | `InventoryValuationDetailDownloadReport` | download | FROMTO | — sel:ITEM_CATEGORY_ALL | [verified](InventoryValuationDetailDownloadReport.md) |
| Ketersediaan Stok Penjualan | `InventoryAnalysisReport` | report | ASOF | selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](InventoryAnalysisReport.md) |
| Umur Persediaan | `InventoryAgingReport` | crosstab | ASOF | selectedWarehouse=, selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](InventoryAgingReport.md) |
| Umur Persediaan per Gudang | `InventoryAgingByWarehouseReport` | crosstab | ASOF | selectedWarehouse=, selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](InventoryAgingByWarehouseReport.md) |
| Rincian Nilai Persediaan | `InventoryValuationDetailReport` | report | FROMTO | selectedItem= | [verified](InventoryValuationDetailReport.md) |
| Rincian Ketersediaan Stok Penjualan | `InventoryAnalysisDetailReport` | report | ASOF | selectedItem= | [verified](InventoryAnalysisDetailReport.md) |
| Rincian Umur Persediaan | `InventoryAgingDetailReport` | report | ASOF | selectedItem=, selectedWarehouse= | [verified](InventoryAgingDetailReport.md) |
| Kartu Stok Persediaan | `InventoryStockCardReport` | report | FROMTO | selectedItem= | [verified](InventoryStockCardReport.md) |
| Permintaan per Barang (Belum Proses) | `PurchaseRequisitionByItemReport` | crosstab | FROMTO | selectedBranch= | [verified](PurchaseRequisitionByItemReport.md) |
| Daftar Permintaan Barang | `PurchaseRequisitionListReport` | report | FROMTO | selectedBranch= | [verified](PurchaseRequisitionListReport.md) |
| Rincian Permintaan Barang | `PurchaseRequisitionDetailReport` | report | FROMTO | selectedBranch= | [verified](PurchaseRequisitionDetailReport.md) |
| Status Pesanan Permintaan Barang | `PurchaseRequisitionOrderStatusReport` | report | FROMTO | selectedBranch= | [verified](PurchaseRequisitionOrderStatusReport.md) |
| Barang Grup | `ItemGroupDetailReport` | report | NONE | selectedBranch= | [verified](ItemGroupDetailReport.md) |
| Penyesuaian Stok Barang | `InventoryAdjustmentDetailReport` | report | FROMTO | selectedBranch= | [verified](InventoryAdjustmentDetailReport.md) |
| Daftar Barang dan Jasa | `ItemListReport` | report | ASOF | selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](ItemListReport.md) |
| Umur Nomor Seri/Batch | `SerialNumberAgingDetailReport` | report | ASOF | selectedItem=, selectedWarehouse= | [verified](SerialNumberAgingDetailReport.md) |
| Analisa Nilai Persediaan | `AnalysisInventoryValuationReport` | crosstab | FROMTO | selectedBranch= sel:ITEM_CATEGORY_ALL | [verified](AnalysisInventoryValuationReport.md) |

## Gudang  (WAREHOUSE)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Kuantitas Barang per Gudang | `QuantityItemByWarehouseReport` | crosstab | ASOF | selectedBranch=, selectedWarehouse= sel:ITEM_CATEGORY_ALL | [verified](QuantityItemByWarehouseReport.md) |
| Mutasi per Barang | `ItemMutationByWarehouseReport` | report | FROMTO | selectedItem= | [verified](ItemMutationByWarehouseReport.md) |
| Mutasi per Gudang | `WarehouseMutationByItemReport` | report | FROMTO | selectedWarehouse= | [verified](WarehouseMutationByItemReport.md) |
| Ringkasan Mutasi Gudang | `WarehouseMutationSummaryReport` | report | FROMTO | selectedWarehouse= | [verified](WarehouseMutationSummaryReport.md) |
| Lembar Penghitungan Stok | `PhysicalInventoryCountSheetReport` | report | ASOF | selectedWarehouse, selectedBranch= | [verified](PhysicalInventoryCountSheetReport.md) |
| Mutasi Nomor Seri/Produksi | `ReceivedDeliveredSerialNumberReport` | report | FROMTO | selectedItem= | [verified](ReceivedDeliveredSerialNumberReport.md) |
| Sisa Umur Per Nomor Produksi | `RemainingAgeSerialNumberDetailReport` | report | ASOF | selectedItem= | [verified](RemainingAgeSerialNumberDetailReport.md) |
| Ringkasan Pemindahan Barang | `ItemTransferListReport` | report | FROMTO | — | [verified](ItemTransferListReport.md) |
| Pergerakan Stok per Barang | `StockMovementByWarehouseReport` | report | FROMTO | selectedWarehouse | [verified](StockMovementByWarehouseReport.md) |

## Pekerjaan Pesanan (JOB_ORDER)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Rincian Penambahan Bahan Baku | `MaterialAdjustmentDetailReport` | report | FROMTO | selectedBranch= | [out of scope](MaterialAdjustmentDetailReport.md) |
| Rincian Barang Penyelesaian Pesanan  | `RollOverItemDetailReport` | report | FROMTO | selectedBranch= | [out of scope](RollOverItemDetailReport.md) |
| Rincian Akun Penyelesaian Pesanan  | `RollOverAccountDetailReport` | report | FROMTO | selectedBranch= | [out of scope](RollOverAccountDetailReport.md) |
| Daftar Pekerjaan Pesanan  | `JobOrderListReport` | report | FROMTO | — | [out of scope](JobOrderListReport.md) |
| Daftar Penyelesaian Pesanan | `RollOverListReport` | report | FROMTO | — | [out of scope](RollOverListReport.md) |
| Daftar Penambahan Bahan Baku | `MaterialAdjustmentListReport` | report | FROMTO | — | [out of scope](MaterialAdjustmentListReport.md) |

## Manufaktur (FABRICATION)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Jurnal Perintah Kerja | `WorkOrderJournalReport` | report | NONE | selectedWorkOrder= | [out of scope](WorkOrderJournalReport.md) |
| Penyesuaian Bahan (Harga Pokok Produksi) | `AdjustmentCOGSManufactureReport` | report | PERIOD | — | [out of scope](AdjustmentCOGSManufactureReport.md) |
| Pembelian (Harga Pokok Produksi) | `PurchaseCOGSManufactureReport` | report | PERIOD | — | [out of scope](PurchaseCOGSManufactureReport.md) |

## Aset Tetap (FIXED_ASSET)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Daftar Aset Tetap | `FixedAssetListReport` | report | NONE | — | [verified](FixedAssetListReport.md) |
| Aset Tetap per Kategori | `FixedAssetByCategoryReport` | report | ASOF | — | [verified](FixedAssetByCategoryReport.md) |
| Histori Aset | `FixedAssetHistoryReport` | report | FROMTO | selectedAsset= | [verified](FixedAssetHistoryReport.md) |
| Jurnal Aset | `FixedAssetJournalReport` | report | NONE | selectedAsset= | [verified](FixedAssetJournalReport.md) |
| Perbedaan Penyusutan | `DifferentIntermDepreciationReport` | report | ASOFYEAR | selectedAsset= | [verified](DifferentIntermDepreciationReport.md) |
| Histori Lokasi Aset | `AssetLocationHistoryReport` | report | NONE | selectedAsset= | [verified](AssetLocationHistoryReport.md) |
| Detail Aset Tetap | `FixedAssetDetailReport` | report | NONE | selectedAsset= | [verified](FixedAssetDetailReport.md) |
| Histori Perubahan Aset | `FixedAssetEditedHistoryReport` | report | FROMTO | selectedAsset= | [verified](FixedAssetEditedHistoryReport.md) |
| Daftar Kategori Aset Tetap Pajak | `FiscalFaTypeListReport` | report | NONE | — | [verified](FiscalFaTypeListReport.md) |
| Daftar Perubahan Aset Tetap | `FixedAssetEditedListReport` | report | FROMTO | — | [verified](FixedAssetEditedListReport.md) |
| Daftar Disposisi Aset Tetap | `FixedAssetDisposedListReport` | report | FROMTO | — | [verified](FixedAssetDisposedListReport.md) |

## Pajak (TAX_SUPPORT)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Daftar PPN/PPnBM Keluaran | `TaxationOutReport` | report | FROMTO | — | [verified](TaxationOutReport.md) |
| Daftar PPN/PPnBM Masukan | `TaxationInReport` | report | FROMTO | — | [verified](TaxationInReport.md) |
| Rekonsiliasi PPN Lebih/Kurang Bayar | `TaxationInOutReport` | report | FROMTO | — | [verified](TaxationInOutReport.md) |
| Faktur Penjualan SPT Masa PPN | `SalesInvoiceSPTListReport` | report | FROMTO | — | [verified](SalesInvoiceSPTListReport.md) |
| Faktur Pembelian SPT Masa PPN | `PurchaseInvoiceSPTListReport` | report | FROMTO | — | [verified](PurchaseInvoiceSPTListReport.md) |
| Daftar Bukti Potong PPh Pembelian | `PurchasePaymentPPhReport` | report | FROMTO | — | [out of scope](PurchasePaymentPPhReport.md) |
| Daftar Bukti Potong PPh Penjualan | `SalesReceiptPPhReport` | report | FROMTO | — | [out of scope](SalesReceiptPPhReport.md) |

## Pemeriksaan (AUDIT)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Selisih Saldo Akun Persediaan dengan Nilai Barang | `ItemValueToAccountBalanceDifferenceReport` | report | FROMTO | — | [verified](ItemValueToAccountBalanceDifferenceReport.md) |
| Selisih Akun Pembelian belum tertagih | `UnbilledAccountBalanceDifferenceReport` | report | FROMTO | — | [verified](UnbilledAccountBalanceDifferenceReport.md) |

## Lain-lain (OTHERS)

| Report | planId | View | Date param | Extra params | Spec |
|---|---|---|---|---|---|
| Daftar Mata Uang | `CurrencyListReport` | report | NONE | — | [verified](CurrencyListReport.md) |
| Daftar FOB | `FreeOnBoardListReport` | report | NONE | — | [verified](FreeOnBoardListReport.md) |
| Daftar Pajak | `TaxListReport` | report | NONE | — | [verified](TaxListReport.md) |
| Daftar Pengiriman | `ShipmentListReport` | report | NONE | — | [verified](ShipmentListReport.md) |
| Daftar Karyawan | `SalesmanListReport` | report | NONE | — | [verified](SalesmanListReport.md) |
| Daftar Log Aktifitas | `AuditListReport` | report | FROMTO | — | [out of scope](AuditListReport.md) |
| Daftar Pengguna per Cabang | `UserByBranchListReport` | report | NONE | — | [out of scope](UserByBranchListReport.md) |
| Daftar Akses Grup | `AccessGroupPrivilegeListReport` | report | NONE | — | [out of scope](AccessGroupPrivilegeListReport.md) |
| Daftar Hak Akses per Pengguna | `AccessPrivilegeByUserListReport` | report | NONE | selectedUser= | [out of scope](AccessPrivilegeByUserListReport.md) |
