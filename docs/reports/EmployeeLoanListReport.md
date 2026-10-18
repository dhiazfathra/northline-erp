# Daftar Piutang Karyawan (`EmployeeLoanListReport`)

Group: Kas & Bank. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox, employee loans enabled), 2026-10-18. Fixture: [`fixtures/employee-loan-t17.json`](fixtures/employee-loan-t17.json) (NL-T17-L1, 1.200.000, no interest). ERP: `apps/api/src/payroll/loans.ts`; test: `apps/api/test/loans.test.ts`. **Verified only for a loan saved without an installment schedule or disbursement** (Accurate builds the schedule client-side; installments, disbursement and payments are not covered yet).

Columns `Nomor #` | `Tanggal` | `Nama Karyawan` | `Angsuran Pokok` | `Angsuran Bunga` | `Total Angsuran` | `Suku Bunga` | `Bunga` | `Terbayar` | `Sisa Angsuran`, grouped by branch (`Kantor Pusat`). Without a schedule the amount cells print nothing; the type prints `Tanpa Bunga` and the rate `0.0%` (dot decimal).
