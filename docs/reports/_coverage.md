# Daftar Laporan coverage: Manufaktur Demo, Retail Demo, Trade Portal Demo, Kontraktor Demo

Source of truth: Daftar Laporan (`/accurate/report/init-report.do`) read 2026-10-19 from both allowlisted sandboxes,
**Manufaktur Demo** (248 reports) and **Retail Demo** (275 reports).
Spec status comes from [README.md](README.md): verified = done, out of scope (ADR-0010) = done (out of scope), spec (Retail Demo) = full spec + fixture from Retail Demo, not built; partial = layout or data not captured (see the spec).

ERP module dependency is the module the report reads. The ERP already event-sources Sales, Purchasing, Inventory,
Cash & Bank, Fixed Assets, Tax and Payroll on top of Journal/Period/Account (see the done rows), so "blocked" marks
only modules that do not exist yet. Proposed build order: [ADR-0021](../decisions/0021-retail-report-module-dependencies.md).

Totals: 275 reports, 275 done. The 46 added in this pass are all verified against Retail Demo fixtures
(ADR-0022 to ADR-0028); SalesCheckInPerSalesmanReport and ApprovalListReport on their empty layout only (see specs).

Retail re-check: every done row was verified against Manufaktur Demo fixtures. Retail Demo carries data Manufaktur Demo
lacked (salesmen, departments, branches, job costing). Where a report behaves differently there, its spec gets a
"Retail Demo variation" section; the Manufaktur finding is never overwritten.

## Trade Portal Demo pass (2026-10-19)

Daftar Laporan read from **Trade Portal Demo** lists 266 reports. Every one is already a row below: no report exists only
in Trade Portal Demo. The 9 rows marked N in that column (department, branch, project and department-budget Laba/Rugi,
`DepartmentListReport`, `CurrencyListReport`) are Retail Demo only. Each Trade Portal report was captured with default
parameters into `captures/trade/` (tagged `dataUsaha: "Trade Portal Demo"`). Capture column: **data** = a page returned (only 35 carry amounts; the demo has no sales, purchase, AR or AP documents, see ADR-0029),
**empty** = layout only (the demo has no such transactions, so it adds nothing over the earlier sandboxes),
**error** = none left: the 4 early failures were parameter-shape problems (ADR-0029 finding 2).
Trade Portal Demo needs every non-boolean parameter sent as an explicit `[]`: `[Semua Cabang]` or an omitted
branch/currency parameter makes Accurate 500. See [ADR-0029](../decisions/0029-trade-portal-demo-divergences.md).
Journal-only re-verification on Trade Portal (NL-TP 2045 journals): Laba/Rugi Standar, Multi Periode, Perbandingan Periode
Neraca Percobaan, Neraca (Standar) and Neraca (Perbandingan Periode), zero diff. Trade-specific pass (NL-TP March 2045 purchases and sale): 10 sales, purchase, aging, outstanding and stock-card
reports zero-diff; 3 cost-dependent reports (Profitabilitas per Barang, Nilai Persediaan, Rincian Nilai Persediaan)
zero-diff with costing method AVERAGE (ADR-0031); still verified under FIFO (default) on Manufaktur Demo.
Data only in Trade Portal: 38 Trade reports carry amounts; 24 have none in the earlier sandboxes' captures. Followed up:
ledger listings, Neraca Multi Periode, Perubahan Ekuitas, Daftar Akun Kas & Bank, Rasio per Bulan and Daftar PPN Keluaran
zero-diff on Trade data; yearly ratio/Fokus/Neraca Multi Year 2045 zero-diff under AVERAGE except a pinned 0,01 ledger-precision gap (ADR-0031); Daftar PPN Masukan/Keluaran and Rekonsiliasi PPN zero-diff over four windows; the
demo's price/discount adjustments and opening stock traced to their documents in the specs.
Module build order proposal: [ADR-0030](../decisions/0030-trade-portal-module-dependencies.md) (for review).

## Kontraktor Demo pass (2026-10-19)

Daftar Laporan read from **Kontraktor Demo** (company PT Solar Energy Indonesia) lists 289 reports. 273 are already rows
below; 16 exist only there (marked "Kontraktor Demo only" at the bottom): 5 project reports under Pusat Laba & Biaya,
`ProjectListReport` (Lain-lain) and the 10-report **Proyek Kontraktor** group (survey, RAB budget plan, material/equipment,
progress, project journal and bank mutation per contractor project). Absent there: `CurrencyListReport`, `ProfitLossByBranchReport`.
"Contractor Projects" is a module the ERP does not have (contractor project with survey, budget plan, material/equipment
usage and progress); those reports get a full spec and fixture and stay blocked. Module dependencies: ADR-0034 (for review).
Kontraktor capture column: **data** / **empty** / **error** as in the Trade Portal pass; **pending** = not yet captured.

| Report | planId | Category | In Manufaktur Demo | In Retail Demo | In Trade Portal Demo | Trade Portal capture | In Kontraktor Demo | Kontraktor capture | Spec status | ERP module dependency | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [Laba/Rugi (Standar)](ProfitLossStandardReport.md) | `ProfitLossStandardReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Neraca (Standar)](BalanceSheetStandardReport.md) | `BalanceSheetStandardReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Laba/Rugi (Multi Periode)](ProfitLossMultiPeriodReport.md) | `ProfitLossMultiPeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Neraca (Multi Periode)](BalanceSheetMultiPeriodReport.md) | `BalanceSheetMultiPeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Laba/Rugi (Multi Year)](ProfitLossMultiYearReport.md) | `ProfitLossMultiYearReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Neraca (Multi Year)](BalanceSheetMultiYearReport.md) | `BalanceSheetMultiYearReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | Trade Portal Demo: verified 2045 under AVERAGE, 0,01 ledger-precision gap pinned (ADR-0031) |
| [Arus Kas (Tak Langsung)](CashFlowIndirectReport.md) | `CashFlowIndirectReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Proyeksi Ketersediaan Kas](CashAvailabilityChartReport.md) | `CashAvailabilityChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Proyeksi Kas per Bulan](CashProjectionReport.md) | `CashProjectionReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md) | `ProfitLossComparePeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Laba/Rugi (Kuartal)](ProfitLossQuarterReport.md) | `ProfitLossQuarterReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Laba/Rugi (Perbandingan Anggaran)](ProfitLossCompareBudgetReport.md) | `ProfitLossCompareBudgetReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Retail Demo; test: `apps/api/test/budget.test.ts`, fixture `fixtures/retail/budget-rb.json` (ADR-0025) |
| [Laba/Rugi Cabang](ProfitLossByBranchReport.md) | `ProfitLossByBranchReport` | Keuangan | N | Y | N | N | — | — | done | Branch dimension | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Neraca (Perbandingan Periode)](BalanceSheetComparePeriodReport.md) | `BalanceSheetComparePeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Neraca (Induk Skontro)](BalanceSheetParentScontroReport.md) | `BalanceSheetParentScontroReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Arus Kas (Langsung)](CashFlowDirectReport.md) | `CashFlowDirectReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Rincian Arus Kas (Tak Langsung)](CashFlowDetailIndirectReport.md) | `CashFlowDetailIndirectReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Rasio Keuangan (Per Tahun)](FinancialRatioReport.md) | `FinancialRatioReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | Trade Portal Demo: verified 2045 under AVERAGE, 0,01 ledger-precision gap pinned (ADR-0031) |
| [Rasio Keuangan (Per Bulan)](FinancialRatioPerMonthReport.md) | `FinancialRatioPerMonthReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Fokus Keuangan](FinancialFocusReport.md) | `FinancialFocusReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | Trade Portal Demo: verified 2045 under AVERAGE, 0,01 ledger-precision gap pinned (ADR-0031) |
| [Laba Ditahan](RetainedEarningReport.md) | `RetainedEarningReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Perubahan Ekuitas Pemilik](OwnerEquityChangedReport.md) | `OwnerEquityChangedReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Grafik Perbandingan Nilai Akun](AccountValueCompareChartReport.md) | `AccountValueCompareChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Grafik Pendapatan berbanding Biaya](RevenueToExpenseComparisonChartReport.md) | `RevenueToExpenseComparisonChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Grafik Harta Bersih](NetWorthChartReport.md) | `NetWorthChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Grafik Rasio Likuiditas](LiquidityRatioChartReport.md) | `LiquidityRatioChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Grafik Pengembalian Aset](ReturnOnAssetChartReport.md) | `ReturnOnAssetChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Grafik Pengembalian pada Modal](ReturnOnEquityChartReport.md) | `ReturnOnEquityChartReport` | Keuangan | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Arus Kas Multi Period (Langsung)](CashFlowDirectMultiPeriodReport.md) | `CashFlowDirectMultiPeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Arus Kas Multi Period (Tak Langsung)](CashFlowIndirectMultiPeriodReport.md) | `CashFlowIndirectMultiPeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Rincian Arus Kas Multi Period (Tak Langsung)](CashFlowDetailIndirectMultiPeriodReport.md) | `CashFlowDetailIndirectMultiPeriodReport` | Keuangan | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Keseluruhan Jurnal](AllJournalReport.md) | `AllJournalReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Keseluruhan Jurnal (CSV)](AllJournalDownloadReport.md) | `AllJournalDownloadReport` | Buku Besar | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Ringkasan Buku Besar](GeneralLedgerSummaryReport.md) | `GeneralLedgerSummaryReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Histori Buku Besar](GeneralLedgerHistoryReport.md) | `GeneralLedgerHistoryReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Histori Buku Besar (CSV)](GeneralLedgerHistoryDownloadReport.md) | `GeneralLedgerHistoryDownloadReport` | Buku Besar | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Rincian Buku Besar](GeneralLedgerDetailReport.md) | `GeneralLedgerDetailReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Rincian Buku Besar (CSV)](GeneralLedgerDetailDownloadReport.md) | `GeneralLedgerDetailDownloadReport` | Buku Besar | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Rincian Jurnal Akun](JournalDetailListReport.md) | `JournalDetailListReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Rincian Jurnal Akun (CSV)](JournalDetailListDownloadReport.md) | `JournalDetailListDownloadReport` | Buku Besar | Y | Y | Y | Y | pending | empty | done | Journal/Period/Account |  |
| [Laba/Rugi Terealisasi](RealizeGainLossReport.md) | `RealizeGainLossReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Laba/Rugi Tidak Terealisasi](UnRealizeGainLossReport.md) | `UnRealizeGainLossReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Neraca Percobaan](TrialBalanceReport.md) | `TrialBalanceReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Jurnal Umum](JournalListReport.md) | `JournalListReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Daftar Akun Perkiraan](GlAccountListReport.md) | `GlAccountListReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account | verified on Trade Portal Demo (ADR-0029) |
| [Rincian Gaji Karyawan per Bulan](EmployeePaymentByEmployeeReport.md) | `EmployeePaymentByEmployeeReport` | Buku Besar | Y | Y | Y | Y | pending | data | done (out of scope) | Journal/Period/Account |  |
| [Rincian Gaji Karyawan per Tahun](EmployeePaymentYearlyByEmployeeReport.md) | `EmployeePaymentYearlyByEmployeeReport` | Buku Besar | Y | Y | Y | Y | pending | data | done (out of scope) | Journal/Period/Account |  |
| [Pajak Penghasilan Karyawan](EmployeePphReport.md) | `EmployeePphReport` | Buku Besar | Y | Y | Y | Y | pending | data | done (out of scope) | Journal/Period/Account |  |
| [Porsi Gaji Karyawan](EmployeeSalaryProportionReport.md) | `EmployeeSalaryProportionReport` | Buku Besar | Y | Y | Y | Y | pending | data | done (out of scope) | Journal/Period/Account |  |
| [Gaji Karyawan per Tahun](EmployeeSalaryPerYearReport.md) | `EmployeeSalaryPerYearReport` | Buku Besar | Y | Y | Y | Y | pending | empty | done (out of scope) | Journal/Period/Account |  |
| [Ringkasan Pencatatan Beban](ExpenseAccrualSummaryReport.md) | `ExpenseAccrualSummaryReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Rincian Pencatatan Beban](ExpenseAccrualDetailReport.md) | `ExpenseAccrualDetailReport` | Buku Besar | Y | Y | Y | Y | pending | data | done | Journal/Period/Account |  |
| [Laba/Rugi Departemen](ProfitLossByDepartmentReport.md) | `ProfitLossByDepartmentReport` | Pusat Laba & Biaya | N | Y | N | Y | pending | — | done | Department/Project dimension | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Laba/Rugi Departemen (Perbandingan Anggaran)](ProfitLossCompareBudgetDepartmentReport.md) | `ProfitLossCompareBudgetDepartmentReport` | Pusat Laba & Biaya | N | Y | N | Y | pending | — | done | Department/Project dimension | verified on Retail Demo; test: `apps/api/test/budget.test.ts`, fixture `fixtures/retail/budget-rb.json` (ADR-0025) |
| [Laba/Rugi Departemen (Multi Periode)](ProfitLossDepartmentMultiPeriodReport.md) | `ProfitLossDepartmentMultiPeriodReport` | Pusat Laba & Biaya | N | Y | N | Y | pending | — | done | Department/Project dimension | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Laba/Rugi Departemen (Perbandingan Periode)](ProfitLossComparePeriodPerDepartmentReport.md) | `ProfitLossComparePeriodPerDepartmentReport` | Pusat Laba & Biaya | N | Y | N | Y | pending | — | done | Department/Project dimension | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Laba/Rugi Proyek (Perbandingan Periode)](ProfitLossComparePeriodPerProjectReport.md) | `ProfitLossComparePeriodPerProjectReport` | Pusat Laba & Biaya | N | Y | N | Y | pending | — | done | Department/Project dimension | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Analisa Laba/Rugi Departemen](AnalysisProfitLossDepartmentReport.md) | `AnalysisProfitLossDepartmentReport` | Pusat Laba & Biaya | N | Y | N | Y | pending | — | done | Department/Project dimension | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Histori Bank](BankBookReport.md) | `BankBookReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Transaksi Bank Terekonsiliasi](ReconciledBankReport.md) | `ReconciledBankReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Transaksi Bank belum Terekonsiliasi](UnreconciledBankReport.md) | `UnreconciledBankReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Ringkasan Pembayaran per Bank](PaymentByBankSummaryReport.md) | `PaymentByBankSummaryReport` | Kas & Bank | Y | Y | Y | Y | pending | empty | done | Cash & Bank |  |
| [Ringkasan Penerimaan per Bank](DepositByBankSummaryReport.md) | `DepositByBankSummaryReport` | Kas & Bank | Y | Y | Y | Y | pending | empty | done | Cash & Bank |  |
| [Giro Mundur (Belum Jatuh Tempo)](OutstandingChequeReport.md) | `OutstandingChequeReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Arus Kas per Akun](CashFlowbyAccountReport.md) | `CashFlowbyAccountReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Rincian Pembayaran per Bank](PaymentByBankDetailReport.md) | `PaymentByBankDetailReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Rincian Penerimaan per Bank](DepositByBankDetailReport.md) | `DepositByBankDetailReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Daftar Kas](CashBankAccountListReport.md) | `CashBankAccountListReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank | verified on Trade Portal Demo (ADR-0029) |
| [Rekening Koran](BankStatementReport.md) | `BankStatementReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Ringkasan Daftar Pembayaran](PaymentListReport.md) | `PaymentListReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Ringkasan Daftar Penerimaan](DepositListReport.md) | `DepositListReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Rincian Beban Pembayaran](PaymentLoadReport.md) | `PaymentLoadReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Rekonsiliasi Bank (Jurnal terhadap Rekening Koran)](BankReconcileBookToStatementReport.md) | `BankReconcileBookToStatementReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Rekonsiliasi Bank (Rekening Koran terhadap Jurnal)](BankReconcileStatementToBookReport.md) | `BankReconcileStatementToBookReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Daftar Piutang Karyawan](EmployeeLoanListReport.md) | `EmployeeLoanListReport` | Kas & Bank | Y | Y | Y | Y | pending | data | done | Cash & Bank |  |
| [Angsuran Pinjaman per Karyawan](EmployeeLoanInstallmentByEmployeeReport.md) | `EmployeeLoanInstallmentByEmployeeReport` | Kas & Bank | Y | Y | Y | Y | pending | empty | done | Cash & Bank |  |
| [History Peminjaman per Karyawan](EmployeeLoanHistoryReport.md) | `EmployeeLoanHistoryReport` | Kas & Bank | Y | Y | Y | Y | pending | empty | done | Cash & Bank |  |
| [Faktur Belum Lunas](OutstandingSalesInvoiceReport.md) | `OutstandingSalesInvoiceReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Faktur Belum Lunas per Pelanggan](OutstandingSalesInvoicePerCustomerReport.md) | `OutstandingSalesInvoicePerCustomerReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales | verified on Trade Portal Demo (ADR-0029) |
| [Umur Piutang](AgingReceivableReport.md) | `AgingReceivableReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales | verified on Trade Portal Demo (ADR-0029) |
| [Buku Besar Pembantu Piutang](ARLedgerReport.md) | `ARLedgerReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Histori Piutang](ARHistoryReport.md) | `ARHistoryReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rata-rata Pembayaran Pelanggan](OwingCollectionPerCustomerReport.md) | `OwingCollectionPerCustomerReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Umur Piutang](AgingReceivableDetailReport.md) | `AgingReceivableDetailReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Grafik Umur Piutang](AgingReceivableChartReport.md) | `AgingReceivableChartReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Buku Besar Pembantu Piutang](ARLedgerDetailReport.md) | `ARLedgerDetailReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Pernyataan Piutang](CustomerStatementReport.md) | `CustomerStatementReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Grafik Rata-rata Pembayaran Pelanggan](OwingCollectionGraphReport.md) | `OwingCollectionGraphReport` | Piutang | Y | Y | Y | Y | pending | empty | done | Sales |  |
| [Pembayaran Faktur](SalesInvoicePaidReport.md) | `SalesInvoicePaidReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Pembayaran PPh Penjualan](SalesInvoicePphPaidReport.md) | `SalesInvoicePphPaidReport` | Piutang | Y | Y | Y | Y | pending | data | done (out of scope) | Sales |  |
| [Sisa Kredit Pelanggan](CustomerExistingCreditListReport.md) | `CustomerExistingCreditListReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penerimaan Penjualan](SalesReceiptListReport.md) | `SalesReceiptListReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Penerimaan Penjualan](SalesReceiptListDetailReport.md) | `SalesReceiptListDetailReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Daftar Pelanggan](CustomerListReport.md) | `CustomerListReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Limit Piutang Pelanggan](CustomerLimitReport.md) | `CustomerLimitReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Tukar Faktur](ExchangeInvoiceDetailReport.md) | `ExchangeInvoiceDetailReport` | Piutang | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penjualan per Pelanggan](ViewSalesByCustomerReport.md) | `ViewSalesByCustomerReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales | verified on Trade Portal Demo (ADR-0029) |
| [Penjualan per Barang](ViewSalesByItemReport.md) | `ViewSalesByItemReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales | verified on Trade Portal Demo (ADR-0029) |
| [Penjualan per Merek](ViewSalesByBrandReport.md) | `ViewSalesByBrandReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penjualan Barang per Pelanggan](ViewSalesItemByCustomerReport.md) | `ViewSalesItemByCustomerReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penjualan Barang per Gudang](ViewSalesItemByWarehouseReport.md) | `ViewSalesItemByWarehouseReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penjualan Pelanggan per Barang](ViewSalesCustomerByItemReport.md) | `ViewSalesCustomerByItemReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Histori Proses Penjualan](SalesFlowHistoryReport.md) | `SalesFlowHistoryReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Penjualan per Pelanggan](ViewSalesByCustomerDetailReport.md) | `ViewSalesByCustomerDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Penjualan per Barang](ViewSalesByItemDetailReport.md) | `ViewSalesByItemDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penjualan per Cabang](ViewSalesByBranchReport.md) | `ViewSalesByBranchReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penjualan Barang per Cabang](ViewSalesItemByBranchReport.md) | `ViewSalesItemByBranchReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Retur Penjualan per Barang](SalesReturnByItemReport.md) | `SalesReturnByItemReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Grafik Penjualan Bulanan](AnnualSalesChartReport.md) | `AnnualSalesChartReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Porsi Penjualan per Pelanggan](TopSalesCustomerChartReport.md) | `TopSalesCustomerChartReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Porsi Penjualan per Barang](TopSalesItemChartReport.md) | `TopSalesItemChartReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penawaran per Pelanggan (Belum Proses)](SalesQuotationByCustomerReport.md) | `SalesQuotationByCustomerReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Penawaran per Barang (Belum Proses)](SalesQuotationByItemReport.md) | `SalesQuotationByItemReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Pesanan per Pelanggan (Belum Proses)](SalesOrderByCustomerReport.md) | `SalesOrderByCustomerReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Pesanan per Barang (Belum Proses)](SalesOrderByItemReport.md) | `SalesOrderByItemReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Uang Muka Penjualan](SalesDownPaymentByCustomerReport.md) | `SalesDownPaymentByCustomerReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Target Penjualan Barang](ItemSalesTargetReport.md) | `ItemSalesTargetReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Target Penjualan per Kategori](ItemCategorySalesTargetReport.md) | `ItemCategorySalesTargetReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Target Penjualan Penjual](SalesmanSalesTargetReport.md) | `SalesmanSalesTargetReport` | Penjualan | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Target Penjualan per Bulan](GeneralSalesTargetReport.md) | `GeneralSalesTargetReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Daftar Penawaran Penjualan](SalesQuotationListReport.md) | `SalesQuotationListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Rincian Penawaran Penjualan](SalesQuotationDetailReport.md) | `SalesQuotationDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Daftar Pesanan Penjualan](SalesOrderListReport.md) | `SalesOrderListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Rincian Pesanan Penjualan](SalesOrderDetailReport.md) | `SalesOrderDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales + Quotation (ADR-0027) | verified on Retail Demo NL-RD fixture |
| [Daftar Pengiriman Pesanan](DeliveryOrderListReport.md) | `DeliveryOrderListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Pengiriman Pesanan](DeliveryOrderDetailReport.md) | `DeliveryOrderDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Status Pengiriman Pesanan](DeliveryOrderHistorySummaryReport.md) | `DeliveryOrderHistorySummaryReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Daftar Faktur Penjualan](SalesInvoiceListReport.md) | `SalesInvoiceListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales | verified on Trade Portal Demo (ADR-0029) |
| [Rincian Faktur Penjualan](SalesInvoiceDetailReport.md) | `SalesInvoiceDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Grafik Penjualan](SalesInvoiceChartReport.md) | `SalesInvoiceChartReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Daftar Retur Penjualan](SalesReturnListReport.md) | `SalesReturnListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Rincian Retur Penjualan](SalesReturnDetailReport.md) | `SalesReturnDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penggunaan Uang Muka Penjualan](SalesInvoiceDownPaymentDetailReport.md) | `SalesInvoiceDownPaymentDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Pembayaran Cicilan](SalesInvoicePaidInstallmentListReport.md) | `SalesInvoicePaidInstallmentListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Cicilan Belum Terbayar](SalesInvoiceUnpaidInstallmentListReport.md) | `SalesInvoiceUnpaidInstallmentListReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Monitoring HPP](CogsMonitoringReport.md) | `CogsMonitoringReport` | Penjualan | Y | Y | Y | Y | pending | empty | done (out of scope) | Sales |  |
| [Profitabilitas per Faktur](ProfitabilityBySalesInvoiceReport.md) | `ProfitabilityBySalesInvoiceReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Profitabilitas per Barang](ProfitabilityByItemReport.md) | `ProfitabilityByItemReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales | Trade Portal Demo: verified with costing method AVERAGE (ADR-0031) |
| [Profitabilitas per Pelanggan](ProfitabilityByCustomerReport.md) | `ProfitabilityByCustomerReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Perubahan Harga Jual Per Barang](SellingPriceAdjustmentHistoryReport.md) | `SellingPriceAdjustmentHistoryReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penyesuaian Harga Jual](SellingPriceAdjustmentDetailReport.md) | `SellingPriceAdjustmentDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penyesuaian Harga Jual per Kategori](SellingPriceAdjustmentDetailPerCategoryReport.md) | `SellingPriceAdjustmentDetailPerCategoryReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penyesuaian Diskon Jual](SellingDiscountAdjustmentDetailReport.md) | `SellingDiscountAdjustmentDetailReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Penyesuaian Diskon Jual per Kategori](SellingDiscountAdjustmentDetailPerCategoryReport.md) | `SellingDiscountAdjustmentDetailPerCategoryReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Barang Paling Laku](SellingItemFrequencyReport.md) | `SellingItemFrequencyReport` | Penjualan | Y | Y | Y | Y | pending | data | done | Sales |  |
| [Faktur Belum Lunas per Penjual](OutstandingInvoicePerSalesmanReport.md) | `OutstandingInvoicePerSalesmanReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Umur Piutang per Penjual](AgingReceivablePerSalesmanReport.md) | `AgingReceivablePerSalesmanReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Rincian Umur Piutang per Penjual](AgingReceivableDetailPerSalesmanReport.md) | `AgingReceivableDetailPerSalesmanReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Penjualan Barang per Penjual](SalesSalesmanByItemReport.md) | `SalesSalesmanByItemReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Faktur Penjualan per Penjual](SalesInvoiceListBySalesmanReport.md) | `SalesInvoiceListBySalesmanReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Retur Penjualan per Penjual](SalesReturnListBySalesmanReport.md) | `SalesReturnListBySalesmanReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Ringkasan Komisi (Dihitung per Periode)](SalesmanCommissionByPeriodSummaryReport.md) | `SalesmanCommissionByPeriodSummaryReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Ringkasan Komisi (Dihitung per Faktur)](SalesmanCommissionByInvoiceSummaryReport.md) | `SalesmanCommissionByInvoiceSummaryReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Rincian Komisi (Dihitung per Faktur)](SalesmanCommissionByInvoiceDetailReport.md) | `SalesmanCommissionByInvoiceDetailReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Rincian Komisi Penjual (Dihitung per Periode)](SalesmanCommissionByPeriodDetailReport.md) | `SalesmanCommissionByPeriodDetailReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Daftar Komisi Penjual](SalesmanCommissionListReport.md) | `SalesmanCommissionListReport` | Tenaga Penjual | N | Y | Y | Y | pending | empty | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Check In per Karyawan](SalesCheckInPerSalesmanReport.md) | `SalesCheckInPerSalesmanReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on layout (check-ins are mobile-only) |
| [Histori Transaksi per Penjual](TransactionPerSalesmanListReport.md) | `TransactionPerSalesmanListReport` | Tenaga Penjual | N | Y | Y | Y | pending | data | done | Sales + Salesman (ADR-0023) | verified on Retail Demo NL-RC fixture |
| [Faktur Belum Lunas](OutstandingPurchaseInvoiceReport.md) | `OutstandingPurchaseInvoiceReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Faktur Belum Lunas per Pemasok](OutstandingPurchaseInvoicePerVendorReport.md) | `OutstandingPurchaseInvoicePerVendorReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing | verified on Trade Portal Demo (ADR-0029) |
| [Umur Utang](AgingPayableReport.md) | `AgingPayableReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing | verified on Trade Portal Demo (ADR-0029) |
| [Buku Besar Pembantu Utang](APLedgerReport.md) | `APLedgerReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Histori Utang](APHistoryReport.md) | `APHistoryReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Umur Utang](AgingPayableDetailReport.md) | `AgingPayableDetailReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Buku Besar Pembantu Utang](APLedgerDetailReport.md) | `APLedgerDetailReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Grafik Umur Utang](AgingPayableChartReport.md) | `AgingPayableChartReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pernyataan Utang](VendorStatementReport.md) | `VendorStatementReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pembayaran Faktur](PurchaseInvoicePaidReport.md) | `PurchaseInvoicePaidReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pembayaran PPh Pembelian](PurchaseInvoicePphPaidReport.md) | `PurchaseInvoicePphPaidReport` | Utang | Y | Y | Y | Y | pending | data | done (out of scope) | Purchasing |  |
| [Pembayaran Pembelian](PurchasePaymentListReport.md) | `PurchasePaymentListReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Pembayaran Pembelian](PurchasePaymentListDetailReport.md) | `PurchasePaymentListDetailReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Utang per Bulan](VendorPayablePerMonthReport.md) | `VendorPayablePerMonthReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Daftar Pemasok](VendorListReport.md) | `VendorListReport` | Utang | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pembelian per Pemasok](PurchaseByVendorReport.md) | `PurchaseByVendorReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pembelian per Barang](PurchaseByItemReport.md) | `PurchaseByItemReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing | verified on Trade Portal Demo (ADR-0029) |
| [Pembelian per Biaya](PurchaseByExpenseReport.md) | `PurchaseByExpenseReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Uang Muka Pembelian](PurchaseDownPaymentByVendorReport.md) | `PurchaseDownPaymentByVendorReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Histori Proses Pembelian](PurchaseFlowHistoryReport.md) | `PurchaseFlowHistoryReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Pembelian per Pemasok](PurchaseByVendorDetailReport.md) | `PurchaseByVendorDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Pembelian per Barang](PurchaseByItemDetailReport.md) | `PurchaseByItemDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Retur Pembelian per Barang](PurchaseReturnByItemReport.md) | `PurchaseReturnByItemReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pesanan per Pemasok (Belum Proses)](PurchaseOrderByVendorReport.md) | `PurchaseOrderByVendorReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Pesanan per Barang (Belum Proses)](PurchaseOrderByItemReport.md) | `PurchaseOrderByItemReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Daftar Pesanan Pembelian](PurchaseOrderListReport.md) | `PurchaseOrderListReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Pesanan Pembelian](PurchaseOrderDetailReport.md) | `PurchaseOrderDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Daftar Penerimaan Barang](ReceiveItemListReport.md) | `ReceiveItemListReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Penerimaan Barang](ReceiveItemDetailReport.md) | `ReceiveItemDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Daftar Faktur Pembelian](PurchaseInvoiceListReport.md) | `PurchaseInvoiceListReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing | verified on Trade Portal Demo (ADR-0029) |
| [Rincian Faktur Pembelian](PurchaseInvoiceDetailReport.md) | `PurchaseInvoiceDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Daftar Retur Pembelian](PurchaseReturnListReport.md) | `PurchaseReturnListReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Rincian Retur Pembelian](PurchaseReturnDetailReport.md) | `PurchaseReturnDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Penggunaan Uang Muka Pembelian](PurchaseInvoiceDownPaymentDetailReport.md) | `PurchaseInvoiceDownPaymentDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Daftar Perintah Pembayaran](TransferOrderListReport.md) | `TransferOrderListReport` | Pembelian | Y | Y | Y | Y | pending | data | done (out of scope) | Purchasing |  |
| [Perubahan Harga Beli Per Barang](VendorPriceHistoryReport.md) | `VendorPriceHistoryReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing |  |
| [Penyesuaian Harga Beli](VendorPriceAdjustmentDetailReport.md) | `VendorPriceAdjustmentDetailReport` | Pembelian | Y | Y | Y | Y | pending | data | done | Purchasing | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Nilai Persediaan](InventoryValuationReport.md) | `InventoryValuationReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory | Trade Portal Demo: verified with costing method AVERAGE (ADR-0031) |
| [Rincian Nilai Persediaan (CSV)](InventoryValuationDetailDownloadReport.md) | `InventoryValuationDetailDownloadReport` | Persediaan | Y | Y | Y | Y | pending | empty | done | Inventory |  |
| [Ketersediaan Stok Penjualan](InventoryAnalysisReport.md) | `InventoryAnalysisReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Umur Persediaan](InventoryAgingReport.md) | `InventoryAgingReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Umur Persediaan per Gudang](InventoryAgingByWarehouseReport.md) | `InventoryAgingByWarehouseReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Rincian Nilai Persediaan](InventoryValuationDetailReport.md) | `InventoryValuationDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory | Trade Portal Demo: verified with costing method AVERAGE (ADR-0031) |
| [Rincian Ketersediaan Stok Penjualan](InventoryAnalysisDetailReport.md) | `InventoryAnalysisDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Rincian Umur Persediaan](InventoryAgingDetailReport.md) | `InventoryAgingDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Kartu Stok Persediaan](InventoryStockCardReport.md) | `InventoryStockCardReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory | verified on Trade Portal Demo (ADR-0029) |
| [Permintaan per Barang (Belum Proses)](PurchaseRequisitionByItemReport.md) | `PurchaseRequisitionByItemReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Daftar Permintaan Barang](PurchaseRequisitionListReport.md) | `PurchaseRequisitionListReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Rincian Permintaan Barang](PurchaseRequisitionDetailReport.md) | `PurchaseRequisitionDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Status Pesanan Permintaan Barang](PurchaseRequisitionOrderStatusReport.md) | `PurchaseRequisitionOrderStatusReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Barang Grup](ItemGroupDetailReport.md) | `ItemGroupDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Penyesuaian Stok Barang](InventoryAdjustmentDetailReport.md) | `InventoryAdjustmentDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Daftar Barang dan Jasa](ItemListReport.md) | `ItemListReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Umur Nomor Seri/Batch](SerialNumberAgingDetailReport.md) | `SerialNumberAgingDetailReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Analisa Nilai Persediaan](AnalysisInventoryValuationReport.md) | `AnalysisInventoryValuationReport` | Persediaan | Y | Y | Y | Y | pending | data | done | Inventory |  |
| [Kuantitas Barang per Gudang](QuantityItemByWarehouseReport.md) | `QuantityItemByWarehouseReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Mutasi per Barang](ItemMutationByWarehouseReport.md) | `ItemMutationByWarehouseReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Mutasi per Gudang](WarehouseMutationByItemReport.md) | `WarehouseMutationByItemReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Ringkasan Mutasi Gudang](WarehouseMutationSummaryReport.md) | `WarehouseMutationSummaryReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Stok Nomor Seri/Produksi](SerialNumberStockReport.md) | `SerialNumberStockReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Stok Nomor Seri/Produksi per Gudang](SerialNumberStockPerWarehouseReport.md) | `SerialNumberStockPerWarehouseReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Stok Nomor Seri/Produksi per Barang](SerialNumberStockPerItemReport.md) | `SerialNumberStockPerItemReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Lembar Penghitungan Stok](PhysicalInventoryCountSheetReport.md) | `PhysicalInventoryCountSheetReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Rincian Pemindahan Barang](ItemTransferDetailReport.md) | `ItemTransferDetailReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Barang Diterima Sebagian](UncompletedItemTransferReport.md) | `UncompletedItemTransferReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Daftar Gudang](WarehouseListReport.md) | `WarehouseListReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Mutasi Nomor Seri/Produksi](ReceivedDeliveredSerialNumberReport.md) | `ReceivedDeliveredSerialNumberReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Histori Nomor Seri/Produksi](SerialNumberMutationReport.md) | `SerialNumberMutationReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Sisa Umur Per Nomor Produksi](RemainingAgeSerialNumberDetailReport.md) | `RemainingAgeSerialNumberDetailReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Nomor Produksi Segera Kadaluarsa](SerialNumberExpiredSoonReport.md) | `SerialNumberExpiredSoonReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Ringkasan Pemindahan Barang](ItemTransferListReport.md) | `ItemTransferListReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Pergerakan Stok per Barang](StockMovementByWarehouseReport.md) | `StockMovementByWarehouseReport` | Gudang | Y | Y | Y | Y | pending | data | done | Inventory (Warehouse) |  |
| [Bahan dan Biaya Pekerjaan per Bulan](JobCostingByMonthReport.md) | `JobCostingByMonthReport` | Pekerjaan Pesanan | N | Y | Y | Y | pending | data | done | Job Costing | verified on Retail Demo 2047 seed; test: `apps/api/test/job-costing.test.ts`, fixture `fixtures/retail/jobcosting-rg.json` (ADR-0026) |
| [Histori Pekerjaan Pesanan](JobCostingHistoryDetailReport.md) | `JobCostingHistoryDetailReport` | Pekerjaan Pesanan | N | Y | Y | Y | pending | data | done | Job Costing | verified on Retail Demo 2047 seed; test: `apps/api/test/job-costing.test.ts`, fixture `fixtures/retail/jobcosting-rg.json` (ADR-0026) |
| [Penyelesaian Barang/Biaya per Bulan](FinishedJobCostByMonth.md) | `FinishedJobCostByMonth` | Pekerjaan Pesanan | N | Y | Y | Y | pending | data | done | Job Costing | verified on Retail Demo 2047 seed; test: `apps/api/test/job-costing.test.ts`, fixture `fixtures/retail/jobcosting-rg.json` (ADR-0026) |
| [Rincian Jurnal Pekerjaan Pesanan](JobCostingJournalDetailReport.md) | `JobCostingJournalDetailReport` | Pekerjaan Pesanan | N | Y | Y | Y | pending | data | done | Job Costing | verified on Retail Demo 2047 seed; test: `apps/api/test/job-costing.test.ts`, fixture `fixtures/retail/jobcosting-rg.json` (ADR-0026) |
| [Rincian Penambahan Bahan Baku](MaterialAdjustmentDetailReport.md) | `MaterialAdjustmentDetailReport` | Pekerjaan Pesanan | Y | Y | Y | Y | pending | data | done (out of scope) | Job Costing (out of scope, ADR-0010) |  |
| [Rincian Barang Penyelesaian Pesanan ](RollOverItemDetailReport.md) | `RollOverItemDetailReport` | Pekerjaan Pesanan | Y | Y | Y | Y | pending | data | done (out of scope) | Job Costing (out of scope, ADR-0010) |  |
| [Rincian Akun Penyelesaian Pesanan ](RollOverAccountDetailReport.md) | `RollOverAccountDetailReport` | Pekerjaan Pesanan | Y | Y | Y | Y | pending | data | done (out of scope) | Job Costing (out of scope, ADR-0010) |  |
| [Daftar Pekerjaan Pesanan ](JobOrderListReport.md) | `JobOrderListReport` | Pekerjaan Pesanan | Y | Y | Y | Y | pending | data | done (out of scope) | Job Costing (out of scope, ADR-0010) |  |
| [Daftar Penyelesaian Pesanan](RollOverListReport.md) | `RollOverListReport` | Pekerjaan Pesanan | Y | Y | Y | Y | pending | data | done (out of scope) | Job Costing (out of scope, ADR-0010) |  |
| [Daftar Penambahan Bahan Baku](MaterialAdjustmentListReport.md) | `MaterialAdjustmentListReport` | Pekerjaan Pesanan | Y | Y | Y | Y | pending | data | done (out of scope) | Job Costing (out of scope, ADR-0010) |  |
| [Jurnal Perintah Kerja](WorkOrderJournalReport.md) | `WorkOrderJournalReport` | Manufaktur | Y | Y | Y | Y | pending | data | done (out of scope) | Manufacturing |  |
| [Penyesuaian Bahan (Harga Pokok Produksi)](AdjustmentCOGSManufactureReport.md) | `AdjustmentCOGSManufactureReport` | Manufaktur | Y | Y | Y | Y | pending | data | done (out of scope) | Manufacturing |  |
| [Pembelian (Harga Pokok Produksi)](PurchaseCOGSManufactureReport.md) | `PurchaseCOGSManufactureReport` | Manufaktur | Y | Y | Y | Y | pending | data | done (out of scope) | Manufacturing |  |
| [Daftar Aset Tetap](FixedAssetListReport.md) | `FixedAssetListReport` | Aset Tetap | Y | Y | Y | Y | pending | empty | done | Fixed Assets |  |
| [Aset Tetap per Kategori](FixedAssetByCategoryReport.md) | `FixedAssetByCategoryReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Histori Aset](FixedAssetHistoryReport.md) | `FixedAssetHistoryReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Jurnal Aset](FixedAssetJournalReport.md) | `FixedAssetJournalReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Perbedaan Penyusutan](DifferentIntermDepreciationReport.md) | `DifferentIntermDepreciationReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Histori Lokasi Aset](AssetLocationHistoryReport.md) | `AssetLocationHistoryReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Detail Aset Tetap](FixedAssetDetailReport.md) | `FixedAssetDetailReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Histori Perubahan Aset](FixedAssetEditedHistoryReport.md) | `FixedAssetEditedHistoryReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Daftar Kategori Aset Tetap Pajak](FiscalFaTypeListReport.md) | `FiscalFaTypeListReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Daftar Perubahan Aset Tetap](FixedAssetEditedListReport.md) | `FixedAssetEditedListReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Daftar Disposisi Aset Tetap](FixedAssetDisposedListReport.md) | `FixedAssetDisposedListReport` | Aset Tetap | Y | Y | Y | Y | pending | data | done | Fixed Assets |  |
| [Daftar PPN/PPnBM Keluaran](TaxationOutReport.md) | `TaxationOutReport` | Pajak | Y | Y | Y | Y | pending | data | done | Tax | verified on Trade Portal Demo (ADR-0029) |
| [Daftar PPN/PPnBM Masukan](TaxationInReport.md) | `TaxationInReport` | Pajak | Y | Y | Y | Y | pending | data | done | Tax | verified on Trade Portal Demo (ADR-0029) |
| [Rekonsiliasi PPN Lebih/Kurang Bayar](TaxationInOutReport.md) | `TaxationInOutReport` | Pajak | Y | Y | Y | Y | pending | data | done | Tax | verified on Trade Portal Demo (ADR-0029) |
| [Faktur Penjualan SPT Masa PPN](SalesInvoiceSPTListReport.md) | `SalesInvoiceSPTListReport` | Pajak | Y | Y | Y | Y | pending | data | done | Tax |  |
| [Faktur Pembelian SPT Masa PPN](PurchaseInvoiceSPTListReport.md) | `PurchaseInvoiceSPTListReport` | Pajak | Y | Y | Y | Y | pending | data | done | Tax |  |
| [Daftar Bukti Potong PPh Pembelian](PurchasePaymentPPhReport.md) | `PurchasePaymentPPhReport` | Pajak | Y | Y | Y | Y | pending | data | done (out of scope) | Tax |  |
| [Daftar Bukti Potong PPh Penjualan](SalesReceiptPPhReport.md) | `SalesReceiptPPhReport` | Pajak | Y | Y | Y | Y | pending | data | done (out of scope) | Tax |  |
| [Selisih Saldo Akun Persediaan dengan Nilai Barang](ItemValueToAccountBalanceDifferenceReport.md) | `ItemValueToAccountBalanceDifferenceReport` | Pemeriksaan | Y | Y | Y | Y | pending | data | done | Activity log |  |
| [Perbedaan Persediaan Terkirim Pemindahan Barang](DifferenceGoodsTransitItemTransferReport.md) | `DifferenceGoodsTransitItemTransferReport` | Pemeriksaan | Y | Y | Y | Y | pending | data | done | Activity log | verified on Retail Demo 2045 seed (fixtures/retail/inventory-re.json, ADR-0024) |
| [Laporan Rincian Penyetuju Transaksi](ApprovalListReport.md) | `ApprovalListReport` | Pemeriksaan | N | Y | Y | Y | pending | data | done | Approval workflow | verified on Retail Demo (empty layout only: one-user sandbox auto-approves); test: `apps/api/test/approvals.test.ts`, fixture `fixtures/retail/approval-rf.json` (ADR-0028) |
| [Selisih Akun Pembelian belum tertagih](UnbilledAccountBalanceDifferenceReport.md) | `UnbilledAccountBalanceDifferenceReport` | Pemeriksaan | Y | Y | Y | Y | pending | data | done | Activity log |  |
| [Daftar Mata Uang](CurrencyListReport.md) | `CurrencyListReport` | Lain-lain | Y | Y | N | N | — | — | done | Master data |  |
| [Daftar FOB](FreeOnBoardListReport.md) | `FreeOnBoardListReport` | Lain-lain | Y | Y | Y | Y | pending | data | done | Master data |  |
| [Daftar Pajak](TaxListReport.md) | `TaxListReport` | Lain-lain | Y | Y | Y | Y | pending | data | done | Master data |  |
| [Daftar Pengiriman](ShipmentListReport.md) | `ShipmentListReport` | Lain-lain | Y | Y | Y | Y | pending | empty | done | Master data |  |
| [Daftar Karyawan](SalesmanListReport.md) | `SalesmanListReport` | Lain-lain | Y | Y | Y | Y | pending | empty | done | Master data |  |
| [Daftar Departemen](DepartmentListReport.md) | `DepartmentListReport` | Lain-lain | N | Y | N | Y | pending | — | done | Master data | verified on Retail Demo; test: `apps/api/test/dimensions.test.ts`, fixture `fixtures/retail/dimensions-ra.json` (ADR-0022) |
| [Daftar Log Aktifitas](AuditListReport.md) | `AuditListReport` | Lain-lain | Y | Y | Y | Y | pending | data | done | Master data |  |
| [Daftar Pengguna per Cabang](UserByBranchListReport.md) | `UserByBranchListReport` | Lain-lain | Y | Y | Y | Y | pending | data | done (out of scope) | Master data |  |
| [Daftar Akses Grup](AccessGroupPrivilegeListReport.md) | `AccessGroupPrivilegeListReport` | Lain-lain | Y | Y | Y | Y | pending | data | done (out of scope) | Master data |  |
| [Daftar Hak Akses per Pengguna](AccessPrivilegeByUserListReport.md) | `AccessPrivilegeByUserListReport` | Lain-lain | Y | Y | Y | Y | pending | data | done (out of scope) | Master data |  |
| [Laba/Rugi Proyek](ProfitLossByProjectReport.md) | `ProfitLossByProjectReport` | Pusat Laba & Biaya | N | N | N | — | Y | pending | missing | Department/Project dimension | Kontraktor Demo only |
| [Laba/Rugi Proyek (Perbandingan Anggaran)](ProfitLossCompareBudgetProjectReport.md) | `ProfitLossCompareBudgetProjectReport` | Pusat Laba & Biaya | N | N | N | — | Y | pending | missing | Department/Project dimension | Kontraktor Demo only |
| [Laba/Rugi Proyek (Multi Periode)](ProfitLossProjectMultiPeriodReport.md) | `ProfitLossProjectMultiPeriodReport` | Pusat Laba & Biaya | N | N | N | — | Y | pending | missing | Department/Project dimension | Kontraktor Demo only |
| [Analisa Laba/Rugi Proyek](AnalysisProfitLossProjectReport.md) | `AnalysisProfitLossProjectReport` | Pusat Laba & Biaya | N | N | N | — | Y | pending | missing | Department/Project dimension | Kontraktor Demo only |
| [Laba/Rugi Proyek Kontraktor](ProfitLossByProjectContractorReport.md) | `ProfitLossByProjectContractorReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Progres Proyek ](ProjectContractorProgressReport.md) | `ProjectContractorProgressReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Daftar Proyek Kontraktor](ProjectContractorListReport.md) | `ProjectContractorListReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Daftar Survei Proyek](SurveyListReport.md) | `SurveyListReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Daftar Anggaran](ContractorBudgetPlanReport.md) | `ContractorBudgetPlanReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Daftar Bahan Baku Terpakai](MaterialEquipmentReport.md) | `MaterialEquipmentReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Rincian Survei Proyek](ContractorSurveyDetailReport.md) | `ContractorSurveyDetailReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Rincian Bahan Baku Terpakai](MaterialEquipmentDetailReport.md) | `MaterialEquipmentDetailReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Anggaran & Realisasi Proyek ](ProjectBudgetComparisonReport.md) | `ProjectBudgetComparisonReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Jurnal Proyek Dalam Proses](ProjectContractorJournalReport.md) | `ProjectContractorJournalReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Mutasi Bank per Proyek](BankMutationByProjectContractorReport.md) | `BankMutationByProjectContractorReport` | Proyek Kontraktor | N | N | N | — | Y | pending | missing (blocked: requires Contractor Projects) | Contractor Projects | Kontraktor Demo only |
| [Daftar Proyek](ProjectListReport.md) | `ProjectListReport` | Lain-lain | N | N | N | — | Y | pending | missing | Master data | Kontraktor Demo only |
