# Rincian Gaji Karyawan per Bulan (`EmployeePaymentByEmployeeReport`)

Group: Buku Besar. **Status: verified** on Manufaktur Demo, 2050 seed (P3.6; [ADR-0039](../decisions/0039-out-of-scope-reports-reopened.md) reopened it).
Capture: [`captures/EmployeePaymentByEmployeeReport.json`](captures/EmployeePaymentByEmployeeReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `PERIOD`; request param used: `{"periodMonth":"10","periodYear":2026,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `crosstab`. Header lines: "Per Oktober 2026", "Cabang : [Semua Cabang]".


## Seeding (2026-10-19, P3.6)

Manufaktur Demo, 2050 seed: placeholder employees NL-PY50-E1 (TK0), E2 (K1), E3 (K3), and Pencatatan Gaji
(`accurate__cash-bank__employee-payment`) EPY.2050.01.00001, 02.00001, 03.00001 and 12.00001. Line amounts come from
Accurate's own `calculate-employee-payment.do` and were saved with `save-employee-payment.do`. Fixture:
[`fixtures/payroll-m50.json`](fixtures/payroll-m50.json); ERP: `apps/api/src/payroll/payroll.ts`; test: `apps/api/test/payroll.test.ts`.

PPh 21: from January to November it is TER (PP 58/2023, A = TK0/TK1/K0, B = TK2/TK3/K1/K2, C = K3) on gross less Pengurangan Gaji,
rounded to the rupiah. December recomputes the year: gross less biaya jabatan (5%, capped at 6.000.000) less the employee's
Iuran Pensiun, minus PTKP, then floored to the thousand and taxed by Pasal 17. The difference from January to November is
withheld; a negative one shows as Kelebihan Pajak. The tables were checked against the endpoint in 375 bracket probes and
the annual rules in 11 December probes (nothing saved).

Crosstab: one column per measure that is non-zero in the month, sorted by code unit (each fee by name, `Gaji dibayarkan`, `Pajak Penghasilan` signed, `Kelebihan Pajak`). Rows are employees by name under Kantor Pusat / Bulanan, then `Total Karyawan` and `Total Cabang`. An empty month prints only the header. ERP: `GET /api/reports/payroll/monthly?year&month`.
