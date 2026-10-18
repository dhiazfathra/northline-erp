-- Limit Piutang (docs/reports/CustomerLimitReport.md): customers with a limit appear in the report.
ALTER TABLE customers ADD COLUMN credit_limit bigint;
