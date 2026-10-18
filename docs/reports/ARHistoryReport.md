# Histori Piutang (`ARHistoryReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json) (invoices I1–I3, receipts R1–R2, Apr–Jun 2033). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`. Params: `startDate`, `endDate`, `selectedBranch` unless noted.

Columns `Nomor #` | `Tanggal` | `Deskripsi` | `Nilai`, under a currency heading. Per active customer (by name): name row, `Saldo Piutang per <day before startDate>` with the opening, one row per document (invoice +total, receipt −amount; description = document description), then the closing balance. Last row: sum of closings.
