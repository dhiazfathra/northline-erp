# Rincian Umur Piutang (`AgingReceivableDetailReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Currency heading, then per customer with open invoices: `<name> | Sisa Kredit | : | 0`, header `Nomor #` | `Tanggal` | `Piutang` | buckets (as [Umur Piutang](AgingReceivableReport.md)), one row per open invoice, then a row with the bucket totals only (no Piutang total).
