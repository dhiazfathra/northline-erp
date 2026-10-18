# Arus Kas (Langsung) (`CashFlowDirectReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-flow.json`](fixtures/cash-flow.json). ERP: `apps/api/src/reports/cash-flow.ts`; test: `apps/api/test/cash-flow.test.ts`.

Params as [Arus Kas (Tak Langsung)](CashFlowIndirectReport.md).

1. Only journals with at least one CASH_BANK line count. Each **non-cash** line of such a journal contributes −(D − C) to its
   account. Accruals without cash never appear (fixture J6: Beban shows `-1.250.000,5`, not the 2.250.000,5 expensed).
2. Layout, account rows by name under each heading:
   - Aktifitas Operasi: `Kas dari Penjualan` (value = ACCOUNT_RECEIVABLE lines) followed by revenue/other-income accounts;
     `Kas untuk Pembelian` (value = ACCOUNT_PAYABLE lines) followed by COGS/expense accounts;
     `Laba(Rugi) Operasi sebelum berubah di Operasi Aset dan Liabilitas` = those four groups.
   - Berkurang(Bertambah) pada Operasi Aset (inventory, other current assets) and … Liabilitas (other current liabilities), each with a Total.
   - Total Kas bersih … Aktivitas Operasi; Aktifitas Investasi (fixed/other assets); Aktifitas Pendanaan (equity, long-term liabilities).
   - Kas bersih … Period ini; Kas & Setara Kas di Awal / Akhir period.

Unverified: the AR/AP placement in "Kas dari Penjualan"/"Kas untuk Pembelian" (no sales or purchase invoices seeded yet), and
journals with several cash lines.
