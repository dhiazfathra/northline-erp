# Daftar Laporan coverage: Manufaktur Demo vs Retail Demo

Source of truth: Daftar Laporan (`/accurate/report/init-report.do`) read 2026-10-19 from both allowlisted sandboxes,
**Manufaktur Demo** (248 reports) and **Retail Demo** (275 reports).
Spec status comes from [README.md](README.md): verified = done, out of scope (ADR-0010) = done (out of scope), no spec = missing.

ERP module dependency is the module the report reads. The ERP already event-sources Sales, Purchasing, Inventory,
Cash & Bank, Fixed Assets, Tax and Payroll on top of Journal/Period/Account (see the done rows), so "blocked" marks
only modules that do not exist yet. Proposed build order: [ADR-0021](../decisions/0021-retail-report-module-dependencies.md).

Totals: 275 reports, 229 done, 46 missing
(32 blocked, 1 buildable on Journal/Period/Account,
13 on existing modules).

Retail re-check: every done row was verified against Manufaktur Demo fixtures. Retail Demo carries data Manufaktur Demo
lacked (salesmen, departments, branches, job costing). Where a report behaves differently there, its spec gets a
"Retail Demo variation" section; the Manufaktur finding is never overwritten.

| Report | planId | Category | In Manufaktur Demo | In Retail Demo | Spec status | ERP module dependency | Note |
|---|---|---|---|---|---|---|---|
| [Laba/Rugi (Standar)](ProfitLossStandardReport.md) | `ProfitLossStandardReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Neraca (Standar)](BalanceSheetStandardReport.md) | `BalanceSheetStandardReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Laba/Rugi (Multi Periode)](ProfitLossMultiPeriodReport.md) | `ProfitLossMultiPeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Neraca (Multi Periode)](BalanceSheetMultiPeriodReport.md) | `BalanceSheetMultiPeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Laba/Rugi (Multi Year)](ProfitLossMultiYearReport.md) | `ProfitLossMultiYearReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Neraca (Multi Year)](BalanceSheetMultiYearReport.md) | `BalanceSheetMultiYearReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Arus Kas (Tak Langsung)](CashFlowIndirectReport.md) | `CashFlowIndirectReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Proyeksi Ketersediaan Kas](CashAvailabilityChartReport.md) | `CashAvailabilityChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Proyeksi Kas per Bulan](CashProjectionReport.md) | `CashProjectionReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md) | `ProfitLossComparePeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Laba/Rugi (Kuartal)](ProfitLossQuarterReport.md) | `ProfitLossQuarterReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| Laba/Rugi (Perbandingan Anggaran) | `ProfitLossCompareBudgetReport` | Keuangan | Y | Y | missing | Journal/Period/Account | blocked: requires Budget |
| Laba/Rugi Cabang | `ProfitLossByBranchReport` | Keuangan | N | Y | missing | Journal/Period/Account | buildable now (single-branch ledger) |
| [Neraca (Perbandingan Periode)](BalanceSheetComparePeriodReport.md) | `BalanceSheetComparePeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Neraca (Induk Skontro)](BalanceSheetParentScontroReport.md) | `BalanceSheetParentScontroReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Arus Kas (Langsung)](CashFlowDirectReport.md) | `CashFlowDirectReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Rincian Arus Kas (Tak Langsung)](CashFlowDetailIndirectReport.md) | `CashFlowDetailIndirectReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Rasio Keuangan (Per Tahun)](FinancialRatioReport.md) | `FinancialRatioReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Rasio Keuangan (Per Bulan)](FinancialRatioPerMonthReport.md) | `FinancialRatioPerMonthReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Fokus Keuangan](FinancialFocusReport.md) | `FinancialFocusReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Laba Ditahan](RetainedEarningReport.md) | `RetainedEarningReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Perubahan Ekuitas Pemilik](OwnerEquityChangedReport.md) | `OwnerEquityChangedReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Grafik Perbandingan Nilai Akun](AccountValueCompareChartReport.md) | `AccountValueCompareChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Grafik Pendapatan berbanding Biaya](RevenueToExpenseComparisonChartReport.md) | `RevenueToExpenseComparisonChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Grafik Harta Bersih](NetWorthChartReport.md) | `NetWorthChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Grafik Rasio Likuiditas](LiquidityRatioChartReport.md) | `LiquidityRatioChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Grafik Pengembalian Aset](ReturnOnAssetChartReport.md) | `ReturnOnAssetChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Grafik Pengembalian pada Modal](ReturnOnEquityChartReport.md) | `ReturnOnEquityChartReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Arus Kas Multi Period (Langsung)](CashFlowDirectMultiPeriodReport.md) | `CashFlowDirectMultiPeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Arus Kas Multi Period (Tak Langsung)](CashFlowIndirectMultiPeriodReport.md) | `CashFlowIndirectMultiPeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Rincian Arus Kas Multi Period (Tak Langsung)](CashFlowDetailIndirectMultiPeriodReport.md) | `CashFlowDetailIndirectMultiPeriodReport` | Keuangan | Y | Y | done | Journal/Period/Account |  |
| [Keseluruhan Jurnal](AllJournalReport.md) | `AllJournalReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Keseluruhan Jurnal (CSV)](AllJournalDownloadReport.md) | `AllJournalDownloadReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Ringkasan Buku Besar](GeneralLedgerSummaryReport.md) | `GeneralLedgerSummaryReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Histori Buku Besar](GeneralLedgerHistoryReport.md) | `GeneralLedgerHistoryReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Histori Buku Besar (CSV)](GeneralLedgerHistoryDownloadReport.md) | `GeneralLedgerHistoryDownloadReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Rincian Buku Besar](GeneralLedgerDetailReport.md) | `GeneralLedgerDetailReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Rincian Buku Besar (CSV)](GeneralLedgerDetailDownloadReport.md) | `GeneralLedgerDetailDownloadReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Rincian Jurnal Akun](JournalDetailListReport.md) | `JournalDetailListReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Rincian Jurnal Akun (CSV)](JournalDetailListDownloadReport.md) | `JournalDetailListDownloadReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Laba/Rugi Terealisasi](RealizeGainLossReport.md) | `RealizeGainLossReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Laba/Rugi Tidak Terealisasi](UnRealizeGainLossReport.md) | `UnRealizeGainLossReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Neraca Percobaan](TrialBalanceReport.md) | `TrialBalanceReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Jurnal Umum](JournalListReport.md) | `JournalListReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Daftar Akun Perkiraan](GlAccountListReport.md) | `GlAccountListReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Rincian Gaji Karyawan per Bulan](EmployeePaymentByEmployeeReport.md) | `EmployeePaymentByEmployeeReport` | Buku Besar | Y | Y | done (out of scope) | Journal/Period/Account |  |
| [Rincian Gaji Karyawan per Tahun](EmployeePaymentYearlyByEmployeeReport.md) | `EmployeePaymentYearlyByEmployeeReport` | Buku Besar | Y | Y | done (out of scope) | Journal/Period/Account |  |
| [Pajak Penghasilan Karyawan](EmployeePphReport.md) | `EmployeePphReport` | Buku Besar | Y | Y | done (out of scope) | Journal/Period/Account |  |
| [Porsi Gaji Karyawan](EmployeeSalaryProportionReport.md) | `EmployeeSalaryProportionReport` | Buku Besar | Y | Y | done (out of scope) | Journal/Period/Account |  |
| [Gaji Karyawan per Tahun](EmployeeSalaryPerYearReport.md) | `EmployeeSalaryPerYearReport` | Buku Besar | Y | Y | done (out of scope) | Journal/Period/Account |  |
| [Ringkasan Pencatatan Beban](ExpenseAccrualSummaryReport.md) | `ExpenseAccrualSummaryReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| [Rincian Pencatatan Beban](ExpenseAccrualDetailReport.md) | `ExpenseAccrualDetailReport` | Buku Besar | Y | Y | done | Journal/Period/Account |  |
| Laba/Rugi Departemen | `ProfitLossByDepartmentReport` | Pusat Laba & Biaya | N | Y | missing | Department/Project dimension | blocked: requires Department |
| Laba/Rugi Departemen (Perbandingan Anggaran) | `ProfitLossCompareBudgetDepartmentReport` | Pusat Laba & Biaya | N | Y | missing | Department/Project dimension | blocked: requires Budget, Department |
| Laba/Rugi Departemen (Multi Periode) | `ProfitLossDepartmentMultiPeriodReport` | Pusat Laba & Biaya | N | Y | missing | Department/Project dimension | blocked: requires Department |
| Laba/Rugi Departemen (Perbandingan Periode) | `ProfitLossComparePeriodPerDepartmentReport` | Pusat Laba & Biaya | N | Y | missing | Department/Project dimension | blocked: requires Department |
| Laba/Rugi Proyek (Perbandingan Periode) | `ProfitLossComparePeriodPerProjectReport` | Pusat Laba & Biaya | N | Y | missing | Department/Project dimension | blocked: requires Project dimension |
| Analisa Laba/Rugi Departemen | `AnalysisProfitLossDepartmentReport` | Pusat Laba & Biaya | N | Y | missing | Department/Project dimension | blocked: requires Department |
| [Histori Bank](BankBookReport.md) | `BankBookReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Transaksi Bank Terekonsiliasi](ReconciledBankReport.md) | `ReconciledBankReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Transaksi Bank belum Terekonsiliasi](UnreconciledBankReport.md) | `UnreconciledBankReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Ringkasan Pembayaran per Bank](PaymentByBankSummaryReport.md) | `PaymentByBankSummaryReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Ringkasan Penerimaan per Bank](DepositByBankSummaryReport.md) | `DepositByBankSummaryReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Giro Mundur (Belum Jatuh Tempo)](OutstandingChequeReport.md) | `OutstandingChequeReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Arus Kas per Akun](CashFlowbyAccountReport.md) | `CashFlowbyAccountReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Rincian Pembayaran per Bank](PaymentByBankDetailReport.md) | `PaymentByBankDetailReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Rincian Penerimaan per Bank](DepositByBankDetailReport.md) | `DepositByBankDetailReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Daftar Kas](CashBankAccountListReport.md) | `CashBankAccountListReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Rekening Koran](BankStatementReport.md) | `BankStatementReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Ringkasan Daftar Pembayaran](PaymentListReport.md) | `PaymentListReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Ringkasan Daftar Penerimaan](DepositListReport.md) | `DepositListReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Rincian Beban Pembayaran](PaymentLoadReport.md) | `PaymentLoadReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Rekonsiliasi Bank (Jurnal terhadap Rekening Koran)](BankReconcileBookToStatementReport.md) | `BankReconcileBookToStatementReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Rekonsiliasi Bank (Rekening Koran terhadap Jurnal)](BankReconcileStatementToBookReport.md) | `BankReconcileStatementToBookReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Daftar Piutang Karyawan](EmployeeLoanListReport.md) | `EmployeeLoanListReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Angsuran Pinjaman per Karyawan](EmployeeLoanInstallmentByEmployeeReport.md) | `EmployeeLoanInstallmentByEmployeeReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [History Peminjaman per Karyawan](EmployeeLoanHistoryReport.md) | `EmployeeLoanHistoryReport` | Kas & Bank | Y | Y | done | Cash & Bank |  |
| [Faktur Belum Lunas](OutstandingSalesInvoiceReport.md) | `OutstandingSalesInvoiceReport` | Piutang | Y | Y | done | Sales |  |
| [Faktur Belum Lunas per Pelanggan](OutstandingSalesInvoicePerCustomerReport.md) | `OutstandingSalesInvoicePerCustomerReport` | Piutang | Y | Y | done | Sales |  |
| [Umur Piutang](AgingReceivableReport.md) | `AgingReceivableReport` | Piutang | Y | Y | done | Sales |  |
| [Buku Besar Pembantu Piutang](ARLedgerReport.md) | `ARLedgerReport` | Piutang | Y | Y | done | Sales |  |
| [Histori Piutang](ARHistoryReport.md) | `ARHistoryReport` | Piutang | Y | Y | done | Sales |  |
| [Rata-rata Pembayaran Pelanggan](OwingCollectionPerCustomerReport.md) | `OwingCollectionPerCustomerReport` | Piutang | Y | Y | done | Sales |  |
| [Rincian Umur Piutang](AgingReceivableDetailReport.md) | `AgingReceivableDetailReport` | Piutang | Y | Y | done | Sales |  |
| [Grafik Umur Piutang](AgingReceivableChartReport.md) | `AgingReceivableChartReport` | Piutang | Y | Y | done | Sales |  |
| [Rincian Buku Besar Pembantu Piutang](ARLedgerDetailReport.md) | `ARLedgerDetailReport` | Piutang | Y | Y | done | Sales |  |
| [Pernyataan Piutang](CustomerStatementReport.md) | `CustomerStatementReport` | Piutang | Y | Y | done | Sales |  |
| [Grafik Rata-rata Pembayaran Pelanggan](OwingCollectionGraphReport.md) | `OwingCollectionGraphReport` | Piutang | Y | Y | done | Sales |  |
| [Pembayaran Faktur](SalesInvoicePaidReport.md) | `SalesInvoicePaidReport` | Piutang | Y | Y | done | Sales |  |
| [Pembayaran PPh Penjualan](SalesInvoicePphPaidReport.md) | `SalesInvoicePphPaidReport` | Piutang | Y | Y | done (out of scope) | Sales |  |
| [Sisa Kredit Pelanggan](CustomerExistingCreditListReport.md) | `CustomerExistingCreditListReport` | Piutang | Y | Y | done | Sales |  |
| [Penerimaan Penjualan](SalesReceiptListReport.md) | `SalesReceiptListReport` | Piutang | Y | Y | done | Sales |  |
| [Rincian Penerimaan Penjualan](SalesReceiptListDetailReport.md) | `SalesReceiptListDetailReport` | Piutang | Y | Y | done | Sales |  |
| [Daftar Pelanggan](CustomerListReport.md) | `CustomerListReport` | Piutang | Y | Y | done | Sales |  |
| [Limit Piutang Pelanggan](CustomerLimitReport.md) | `CustomerLimitReport` | Piutang | Y | Y | done | Sales |  |
| [Rincian Tukar Faktur](ExchangeInvoiceDetailReport.md) | `ExchangeInvoiceDetailReport` | Piutang | Y | Y | done | Sales |  |
| [Penjualan per Pelanggan](ViewSalesByCustomerReport.md) | `ViewSalesByCustomerReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan per Barang](ViewSalesByItemReport.md) | `ViewSalesByItemReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan per Merek](ViewSalesByBrandReport.md) | `ViewSalesByBrandReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan Barang per Pelanggan](ViewSalesItemByCustomerReport.md) | `ViewSalesItemByCustomerReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan Barang per Gudang](ViewSalesItemByWarehouseReport.md) | `ViewSalesItemByWarehouseReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan Pelanggan per Barang](ViewSalesCustomerByItemReport.md) | `ViewSalesCustomerByItemReport` | Penjualan | Y | Y | done | Sales |  |
| [Histori Proses Penjualan](SalesFlowHistoryReport.md) | `SalesFlowHistoryReport` | Penjualan | Y | Y | done | Sales |  |
| [Rincian Penjualan per Pelanggan](ViewSalesByCustomerDetailReport.md) | `ViewSalesByCustomerDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Rincian Penjualan per Barang](ViewSalesByItemDetailReport.md) | `ViewSalesByItemDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan per Cabang](ViewSalesByBranchReport.md) | `ViewSalesByBranchReport` | Penjualan | Y | Y | done | Sales |  |
| [Penjualan Barang per Cabang](ViewSalesItemByBranchReport.md) | `ViewSalesItemByBranchReport` | Penjualan | Y | Y | done | Sales |  |
| [Retur Penjualan per Barang](SalesReturnByItemReport.md) | `SalesReturnByItemReport` | Penjualan | Y | Y | done | Sales |  |
| [Grafik Penjualan Bulanan](AnnualSalesChartReport.md) | `AnnualSalesChartReport` | Penjualan | Y | Y | done | Sales |  |
| [Porsi Penjualan per Pelanggan](TopSalesCustomerChartReport.md) | `TopSalesCustomerChartReport` | Penjualan | Y | Y | done | Sales |  |
| [Porsi Penjualan per Barang](TopSalesItemChartReport.md) | `TopSalesItemChartReport` | Penjualan | Y | Y | done | Sales |  |
| Penawaran per Pelanggan (Belum Proses) | `SalesQuotationByCustomerReport` | Penjualan | Y | Y | missing | Sales | blocked: requires Sales Quotation |
| Penawaran per Barang (Belum Proses) | `SalesQuotationByItemReport` | Penjualan | Y | Y | missing | Sales | blocked: requires Sales Quotation |
| Pesanan per Pelanggan (Belum Proses) | `SalesOrderByCustomerReport` | Penjualan | Y | Y | missing | Sales | existing module; spec + verify |
| Pesanan per Barang (Belum Proses) | `SalesOrderByItemReport` | Penjualan | Y | Y | missing | Sales | existing module; spec + verify |
| [Uang Muka Penjualan](SalesDownPaymentByCustomerReport.md) | `SalesDownPaymentByCustomerReport` | Penjualan | Y | Y | done | Sales |  |
| [Target Penjualan Barang](ItemSalesTargetReport.md) | `ItemSalesTargetReport` | Penjualan | Y | Y | done | Sales |  |
| [Target Penjualan per Kategori](ItemCategorySalesTargetReport.md) | `ItemCategorySalesTargetReport` | Penjualan | Y | Y | done | Sales |  |
| Target Penjualan Penjual | `SalesmanSalesTargetReport` | Penjualan | N | Y | missing | Sales | blocked: requires Salesman on invoice |
| [Target Penjualan per Bulan](GeneralSalesTargetReport.md) | `GeneralSalesTargetReport` | Penjualan | Y | Y | done | Sales |  |
| Daftar Penawaran Penjualan | `SalesQuotationListReport` | Penjualan | Y | Y | missing | Sales | blocked: requires Sales Quotation |
| Rincian Penawaran Penjualan | `SalesQuotationDetailReport` | Penjualan | Y | Y | missing | Sales | blocked: requires Sales Quotation |
| Daftar Pesanan Penjualan | `SalesOrderListReport` | Penjualan | Y | Y | missing | Sales | existing module; spec + verify |
| Rincian Pesanan Penjualan | `SalesOrderDetailReport` | Penjualan | Y | Y | missing | Sales | existing module; spec + verify |
| [Daftar Pengiriman Pesanan](DeliveryOrderListReport.md) | `DeliveryOrderListReport` | Penjualan | Y | Y | done | Sales |  |
| [Rincian Pengiriman Pesanan](DeliveryOrderDetailReport.md) | `DeliveryOrderDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Status Pengiriman Pesanan](DeliveryOrderHistorySummaryReport.md) | `DeliveryOrderHistorySummaryReport` | Penjualan | Y | Y | done | Sales |  |
| [Daftar Faktur Penjualan](SalesInvoiceListReport.md) | `SalesInvoiceListReport` | Penjualan | Y | Y | done | Sales |  |
| [Rincian Faktur Penjualan](SalesInvoiceDetailReport.md) | `SalesInvoiceDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Grafik Penjualan](SalesInvoiceChartReport.md) | `SalesInvoiceChartReport` | Penjualan | Y | Y | done | Sales |  |
| [Daftar Retur Penjualan](SalesReturnListReport.md) | `SalesReturnListReport` | Penjualan | Y | Y | done | Sales |  |
| [Rincian Retur Penjualan](SalesReturnDetailReport.md) | `SalesReturnDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Penggunaan Uang Muka Penjualan](SalesInvoiceDownPaymentDetailReport.md) | `SalesInvoiceDownPaymentDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Pembayaran Cicilan](SalesInvoicePaidInstallmentListReport.md) | `SalesInvoicePaidInstallmentListReport` | Penjualan | Y | Y | done | Sales |  |
| [Cicilan Belum Terbayar](SalesInvoiceUnpaidInstallmentListReport.md) | `SalesInvoiceUnpaidInstallmentListReport` | Penjualan | Y | Y | done | Sales |  |
| [Monitoring HPP](CogsMonitoringReport.md) | `CogsMonitoringReport` | Penjualan | Y | Y | done (out of scope) | Sales |  |
| [Profitabilitas per Faktur](ProfitabilityBySalesInvoiceReport.md) | `ProfitabilityBySalesInvoiceReport` | Penjualan | Y | Y | done | Sales |  |
| [Profitabilitas per Barang](ProfitabilityByItemReport.md) | `ProfitabilityByItemReport` | Penjualan | Y | Y | done | Sales |  |
| [Profitabilitas per Pelanggan](ProfitabilityByCustomerReport.md) | `ProfitabilityByCustomerReport` | Penjualan | Y | Y | done | Sales |  |
| [Perubahan Harga Jual Per Barang](SellingPriceAdjustmentHistoryReport.md) | `SellingPriceAdjustmentHistoryReport` | Penjualan | Y | Y | done | Sales |  |
| [Penyesuaian Harga Jual](SellingPriceAdjustmentDetailReport.md) | `SellingPriceAdjustmentDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Penyesuaian Harga Jual per Kategori](SellingPriceAdjustmentDetailPerCategoryReport.md) | `SellingPriceAdjustmentDetailPerCategoryReport` | Penjualan | Y | Y | done | Sales |  |
| [Penyesuaian Diskon Jual](SellingDiscountAdjustmentDetailReport.md) | `SellingDiscountAdjustmentDetailReport` | Penjualan | Y | Y | done | Sales |  |
| [Penyesuaian Diskon Jual per Kategori](SellingDiscountAdjustmentDetailPerCategoryReport.md) | `SellingDiscountAdjustmentDetailPerCategoryReport` | Penjualan | Y | Y | done | Sales |  |
| [Barang Paling Laku](SellingItemFrequencyReport.md) | `SellingItemFrequencyReport` | Penjualan | Y | Y | done | Sales |  |
| Faktur Belum Lunas per Penjual | `OutstandingInvoicePerSalesmanReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| Umur Piutang per Penjual | `AgingReceivablePerSalesmanReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| Rincian Umur Piutang per Penjual | `AgingReceivableDetailPerSalesmanReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| Penjualan Barang per Penjual | `SalesSalesmanByItemReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| Faktur Penjualan per Penjual | `SalesInvoiceListBySalesmanReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| Retur Penjualan per Penjual | `SalesReturnListBySalesmanReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| Ringkasan Komisi (Dihitung per Periode) | `SalesmanCommissionByPeriodSummaryReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman commission |
| Ringkasan Komisi (Dihitung per Faktur) | `SalesmanCommissionByInvoiceSummaryReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman commission |
| Rincian Komisi (Dihitung per Faktur) | `SalesmanCommissionByInvoiceDetailReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman commission |
| Rincian Komisi Penjual (Dihitung per Periode) | `SalesmanCommissionByPeriodDetailReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman commission |
| Daftar Komisi Penjual | `SalesmanCommissionListReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman commission |
| Check In per Karyawan | `SalesCheckInPerSalesmanReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman check-in (mobile) |
| Histori Transaksi per Penjual | `TransactionPerSalesmanListReport` | Tenaga Penjual | N | Y | missing | Sales + Salesman | blocked: requires Salesman on invoice |
| [Faktur Belum Lunas](OutstandingPurchaseInvoiceReport.md) | `OutstandingPurchaseInvoiceReport` | Utang | Y | Y | done | Purchasing |  |
| [Faktur Belum Lunas per Pemasok](OutstandingPurchaseInvoicePerVendorReport.md) | `OutstandingPurchaseInvoicePerVendorReport` | Utang | Y | Y | done | Purchasing |  |
| [Umur Utang](AgingPayableReport.md) | `AgingPayableReport` | Utang | Y | Y | done | Purchasing |  |
| [Buku Besar Pembantu Utang](APLedgerReport.md) | `APLedgerReport` | Utang | Y | Y | done | Purchasing |  |
| [Histori Utang](APHistoryReport.md) | `APHistoryReport` | Utang | Y | Y | done | Purchasing |  |
| [Rincian Umur Utang](AgingPayableDetailReport.md) | `AgingPayableDetailReport` | Utang | Y | Y | done | Purchasing |  |
| [Rincian Buku Besar Pembantu Utang](APLedgerDetailReport.md) | `APLedgerDetailReport` | Utang | Y | Y | done | Purchasing |  |
| [Grafik Umur Utang](AgingPayableChartReport.md) | `AgingPayableChartReport` | Utang | Y | Y | done | Purchasing |  |
| [Pernyataan Utang](VendorStatementReport.md) | `VendorStatementReport` | Utang | Y | Y | done | Purchasing |  |
| [Pembayaran Faktur](PurchaseInvoicePaidReport.md) | `PurchaseInvoicePaidReport` | Utang | Y | Y | done | Purchasing |  |
| [Pembayaran PPh Pembelian](PurchaseInvoicePphPaidReport.md) | `PurchaseInvoicePphPaidReport` | Utang | Y | Y | done (out of scope) | Purchasing |  |
| [Pembayaran Pembelian](PurchasePaymentListReport.md) | `PurchasePaymentListReport` | Utang | Y | Y | done | Purchasing |  |
| [Rincian Pembayaran Pembelian](PurchasePaymentListDetailReport.md) | `PurchasePaymentListDetailReport` | Utang | Y | Y | done | Purchasing |  |
| [Utang per Bulan](VendorPayablePerMonthReport.md) | `VendorPayablePerMonthReport` | Utang | Y | Y | done | Purchasing |  |
| [Daftar Pemasok](VendorListReport.md) | `VendorListReport` | Utang | Y | Y | done | Purchasing |  |
| [Pembelian per Pemasok](PurchaseByVendorReport.md) | `PurchaseByVendorReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Pembelian per Barang](PurchaseByItemReport.md) | `PurchaseByItemReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Pembelian per Biaya](PurchaseByExpenseReport.md) | `PurchaseByExpenseReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Uang Muka Pembelian](PurchaseDownPaymentByVendorReport.md) | `PurchaseDownPaymentByVendorReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Histori Proses Pembelian](PurchaseFlowHistoryReport.md) | `PurchaseFlowHistoryReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Rincian Pembelian per Pemasok](PurchaseByVendorDetailReport.md) | `PurchaseByVendorDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Rincian Pembelian per Barang](PurchaseByItemDetailReport.md) | `PurchaseByItemDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Retur Pembelian per Barang](PurchaseReturnByItemReport.md) | `PurchaseReturnByItemReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Pesanan per Pemasok (Belum Proses)](PurchaseOrderByVendorReport.md) | `PurchaseOrderByVendorReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Pesanan per Barang (Belum Proses)](PurchaseOrderByItemReport.md) | `PurchaseOrderByItemReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Daftar Pesanan Pembelian](PurchaseOrderListReport.md) | `PurchaseOrderListReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Rincian Pesanan Pembelian](PurchaseOrderDetailReport.md) | `PurchaseOrderDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Daftar Penerimaan Barang](ReceiveItemListReport.md) | `ReceiveItemListReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Rincian Penerimaan Barang](ReceiveItemDetailReport.md) | `ReceiveItemDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Daftar Faktur Pembelian](PurchaseInvoiceListReport.md) | `PurchaseInvoiceListReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Rincian Faktur Pembelian](PurchaseInvoiceDetailReport.md) | `PurchaseInvoiceDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Daftar Retur Pembelian](PurchaseReturnListReport.md) | `PurchaseReturnListReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Rincian Retur Pembelian](PurchaseReturnDetailReport.md) | `PurchaseReturnDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Penggunaan Uang Muka Pembelian](PurchaseInvoiceDownPaymentDetailReport.md) | `PurchaseInvoiceDownPaymentDetailReport` | Pembelian | Y | Y | done | Purchasing |  |
| [Daftar Perintah Pembayaran](TransferOrderListReport.md) | `TransferOrderListReport` | Pembelian | Y | Y | done (out of scope) | Purchasing |  |
| [Perubahan Harga Beli Per Barang](VendorPriceHistoryReport.md) | `VendorPriceHistoryReport` | Pembelian | Y | Y | done | Purchasing |  |
| Penyesuaian Harga Beli | `VendorPriceAdjustmentDetailReport` | Pembelian | Y | Y | missing | Purchasing | existing module; spec + verify |
| [Nilai Persediaan](InventoryValuationReport.md) | `InventoryValuationReport` | Persediaan | Y | Y | done | Inventory |  |
| [Rincian Nilai Persediaan (CSV)](InventoryValuationDetailDownloadReport.md) | `InventoryValuationDetailDownloadReport` | Persediaan | Y | Y | done | Inventory |  |
| [Ketersediaan Stok Penjualan](InventoryAnalysisReport.md) | `InventoryAnalysisReport` | Persediaan | Y | Y | done | Inventory |  |
| [Umur Persediaan](InventoryAgingReport.md) | `InventoryAgingReport` | Persediaan | Y | Y | done | Inventory |  |
| [Umur Persediaan per Gudang](InventoryAgingByWarehouseReport.md) | `InventoryAgingByWarehouseReport` | Persediaan | Y | Y | done | Inventory |  |
| [Rincian Nilai Persediaan](InventoryValuationDetailReport.md) | `InventoryValuationDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Rincian Ketersediaan Stok Penjualan](InventoryAnalysisDetailReport.md) | `InventoryAnalysisDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Rincian Umur Persediaan](InventoryAgingDetailReport.md) | `InventoryAgingDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Kartu Stok Persediaan](InventoryStockCardReport.md) | `InventoryStockCardReport` | Persediaan | Y | Y | done | Inventory |  |
| [Permintaan per Barang (Belum Proses)](PurchaseRequisitionByItemReport.md) | `PurchaseRequisitionByItemReport` | Persediaan | Y | Y | done | Inventory |  |
| [Daftar Permintaan Barang](PurchaseRequisitionListReport.md) | `PurchaseRequisitionListReport` | Persediaan | Y | Y | done | Inventory |  |
| [Rincian Permintaan Barang](PurchaseRequisitionDetailReport.md) | `PurchaseRequisitionDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Status Pesanan Permintaan Barang](PurchaseRequisitionOrderStatusReport.md) | `PurchaseRequisitionOrderStatusReport` | Persediaan | Y | Y | done | Inventory |  |
| [Barang Grup](ItemGroupDetailReport.md) | `ItemGroupDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Penyesuaian Stok Barang](InventoryAdjustmentDetailReport.md) | `InventoryAdjustmentDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Daftar Barang dan Jasa](ItemListReport.md) | `ItemListReport` | Persediaan | Y | Y | done | Inventory |  |
| [Umur Nomor Seri/Batch](SerialNumberAgingDetailReport.md) | `SerialNumberAgingDetailReport` | Persediaan | Y | Y | done | Inventory |  |
| [Analisa Nilai Persediaan](AnalysisInventoryValuationReport.md) | `AnalysisInventoryValuationReport` | Persediaan | Y | Y | done | Inventory |  |
| [Kuantitas Barang per Gudang](QuantityItemByWarehouseReport.md) | `QuantityItemByWarehouseReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| [Mutasi per Barang](ItemMutationByWarehouseReport.md) | `ItemMutationByWarehouseReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| [Mutasi per Gudang](WarehouseMutationByItemReport.md) | `WarehouseMutationByItemReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| [Ringkasan Mutasi Gudang](WarehouseMutationSummaryReport.md) | `WarehouseMutationSummaryReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| Stok Nomor Seri/Produksi | `SerialNumberStockReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| Stok Nomor Seri/Produksi per Gudang | `SerialNumberStockPerWarehouseReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| Stok Nomor Seri/Produksi per Barang | `SerialNumberStockPerItemReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| [Lembar Penghitungan Stok](PhysicalInventoryCountSheetReport.md) | `PhysicalInventoryCountSheetReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| Rincian Pemindahan Barang | `ItemTransferDetailReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| Barang Diterima Sebagian | `UncompletedItemTransferReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| Daftar Gudang | `WarehouseListReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| [Mutasi Nomor Seri/Produksi](ReceivedDeliveredSerialNumberReport.md) | `ReceivedDeliveredSerialNumberReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| Histori Nomor Seri/Produksi | `SerialNumberMutationReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | existing module; spec + verify |
| [Sisa Umur Per Nomor Produksi](RemainingAgeSerialNumberDetailReport.md) | `RemainingAgeSerialNumberDetailReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| Nomor Produksi Segera Kadaluarsa | `SerialNumberExpiredSoonReport` | Gudang | Y | Y | missing | Inventory (Warehouse) | blocked: requires Serial expiry date |
| [Ringkasan Pemindahan Barang](ItemTransferListReport.md) | `ItemTransferListReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| [Pergerakan Stok per Barang](StockMovementByWarehouseReport.md) | `StockMovementByWarehouseReport` | Gudang | Y | Y | done | Inventory (Warehouse) |  |
| Bahan dan Biaya Pekerjaan per Bulan | `JobCostingByMonthReport` | Pekerjaan Pesanan | N | Y | missing | Job Costing | blocked: requires Job Costing |
| Histori Pekerjaan Pesanan | `JobCostingHistoryDetailReport` | Pekerjaan Pesanan | N | Y | missing | Job Costing | blocked: requires Job Costing |
| Penyelesaian Barang/Biaya per Bulan | `FinishedJobCostByMonth` | Pekerjaan Pesanan | N | Y | missing | Job Costing | blocked: requires Job Costing |
| Rincian Jurnal Pekerjaan Pesanan | `JobCostingJournalDetailReport` | Pekerjaan Pesanan | N | Y | missing | Job Costing | blocked: requires Job Costing |
| [Rincian Penambahan Bahan Baku](MaterialAdjustmentDetailReport.md) | `MaterialAdjustmentDetailReport` | Pekerjaan Pesanan | Y | Y | done (out of scope) | Job Costing |  |
| [Rincian Barang Penyelesaian Pesanan ](RollOverItemDetailReport.md) | `RollOverItemDetailReport` | Pekerjaan Pesanan | Y | Y | done (out of scope) | Job Costing |  |
| [Rincian Akun Penyelesaian Pesanan ](RollOverAccountDetailReport.md) | `RollOverAccountDetailReport` | Pekerjaan Pesanan | Y | Y | done (out of scope) | Job Costing |  |
| [Daftar Pekerjaan Pesanan ](JobOrderListReport.md) | `JobOrderListReport` | Pekerjaan Pesanan | Y | Y | done (out of scope) | Job Costing |  |
| [Daftar Penyelesaian Pesanan](RollOverListReport.md) | `RollOverListReport` | Pekerjaan Pesanan | Y | Y | done (out of scope) | Job Costing |  |
| [Daftar Penambahan Bahan Baku](MaterialAdjustmentListReport.md) | `MaterialAdjustmentListReport` | Pekerjaan Pesanan | Y | Y | done (out of scope) | Job Costing |  |
| [Jurnal Perintah Kerja](WorkOrderJournalReport.md) | `WorkOrderJournalReport` | Manufaktur | Y | Y | done (out of scope) | Manufacturing |  |
| [Penyesuaian Bahan (Harga Pokok Produksi)](AdjustmentCOGSManufactureReport.md) | `AdjustmentCOGSManufactureReport` | Manufaktur | Y | Y | done (out of scope) | Manufacturing |  |
| [Pembelian (Harga Pokok Produksi)](PurchaseCOGSManufactureReport.md) | `PurchaseCOGSManufactureReport` | Manufaktur | Y | Y | done (out of scope) | Manufacturing |  |
| [Daftar Aset Tetap](FixedAssetListReport.md) | `FixedAssetListReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Aset Tetap per Kategori](FixedAssetByCategoryReport.md) | `FixedAssetByCategoryReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Histori Aset](FixedAssetHistoryReport.md) | `FixedAssetHistoryReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Jurnal Aset](FixedAssetJournalReport.md) | `FixedAssetJournalReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Perbedaan Penyusutan](DifferentIntermDepreciationReport.md) | `DifferentIntermDepreciationReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Histori Lokasi Aset](AssetLocationHistoryReport.md) | `AssetLocationHistoryReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Detail Aset Tetap](FixedAssetDetailReport.md) | `FixedAssetDetailReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Histori Perubahan Aset](FixedAssetEditedHistoryReport.md) | `FixedAssetEditedHistoryReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Daftar Kategori Aset Tetap Pajak](FiscalFaTypeListReport.md) | `FiscalFaTypeListReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Daftar Perubahan Aset Tetap](FixedAssetEditedListReport.md) | `FixedAssetEditedListReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Daftar Disposisi Aset Tetap](FixedAssetDisposedListReport.md) | `FixedAssetDisposedListReport` | Aset Tetap | Y | Y | done | Fixed Assets |  |
| [Daftar PPN/PPnBM Keluaran](TaxationOutReport.md) | `TaxationOutReport` | Pajak | Y | Y | done | Tax |  |
| [Daftar PPN/PPnBM Masukan](TaxationInReport.md) | `TaxationInReport` | Pajak | Y | Y | done | Tax |  |
| [Rekonsiliasi PPN Lebih/Kurang Bayar](TaxationInOutReport.md) | `TaxationInOutReport` | Pajak | Y | Y | done | Tax |  |
| [Faktur Penjualan SPT Masa PPN](SalesInvoiceSPTListReport.md) | `SalesInvoiceSPTListReport` | Pajak | Y | Y | done | Tax |  |
| [Faktur Pembelian SPT Masa PPN](PurchaseInvoiceSPTListReport.md) | `PurchaseInvoiceSPTListReport` | Pajak | Y | Y | done | Tax |  |
| [Daftar Bukti Potong PPh Pembelian](PurchasePaymentPPhReport.md) | `PurchasePaymentPPhReport` | Pajak | Y | Y | done (out of scope) | Tax |  |
| [Daftar Bukti Potong PPh Penjualan](SalesReceiptPPhReport.md) | `SalesReceiptPPhReport` | Pajak | Y | Y | done (out of scope) | Tax |  |
| [Selisih Saldo Akun Persediaan dengan Nilai Barang](ItemValueToAccountBalanceDifferenceReport.md) | `ItemValueToAccountBalanceDifferenceReport` | Pemeriksaan | Y | Y | done | Activity log |  |
| Perbedaan Persediaan Terkirim Pemindahan Barang | `DifferenceGoodsTransitItemTransferReport` | Pemeriksaan | Y | Y | missing | Activity log | existing module; spec + verify |
| Laporan Rincian Penyetuju Transaksi | `ApprovalListReport` | Pemeriksaan | N | Y | missing | Activity log | blocked: requires Approval workflow |
| [Selisih Akun Pembelian belum tertagih](UnbilledAccountBalanceDifferenceReport.md) | `UnbilledAccountBalanceDifferenceReport` | Pemeriksaan | Y | Y | done | Activity log |  |
| [Daftar Mata Uang](CurrencyListReport.md) | `CurrencyListReport` | Lain-lain | Y | Y | done | Master data |  |
| [Daftar FOB](FreeOnBoardListReport.md) | `FreeOnBoardListReport` | Lain-lain | Y | Y | done | Master data |  |
| [Daftar Pajak](TaxListReport.md) | `TaxListReport` | Lain-lain | Y | Y | done | Master data |  |
| [Daftar Pengiriman](ShipmentListReport.md) | `ShipmentListReport` | Lain-lain | Y | Y | done | Master data |  |
| [Daftar Karyawan](SalesmanListReport.md) | `SalesmanListReport` | Lain-lain | Y | Y | done | Master data |  |
| Daftar Departemen | `DepartmentListReport` | Lain-lain | N | Y | missing | Master data | blocked: requires Department |
| [Daftar Log Aktifitas](AuditListReport.md) | `AuditListReport` | Lain-lain | Y | Y | done | Master data |  |
| [Daftar Pengguna per Cabang](UserByBranchListReport.md) | `UserByBranchListReport` | Lain-lain | Y | Y | done (out of scope) | Master data |  |
| [Daftar Akses Grup](AccessGroupPrivilegeListReport.md) | `AccessGroupPrivilegeListReport` | Lain-lain | Y | Y | done (out of scope) | Master data |  |
| [Daftar Hak Akses per Pengguna](AccessPrivilegeByUserListReport.md) | `AccessPrivilegeByUserListReport` | Lain-lain | Y | Y | done (out of scope) | Master data |  |
