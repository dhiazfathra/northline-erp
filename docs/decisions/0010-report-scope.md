# ADR-0010: Payroll, job orders, manufacturing and access reports are out of scope

## Status
Superseded by [ADR-0039](0039-out-of-scope-reports-reopened.md) for the 23 reports it covered.
Accepted; superseded for `AuditListReport` by [ADR-0019](0019-activity-log.md)

## Date
2026-10-18

## Context
The acceptance spec is every report in Accurate's Daftar Laporan. 18 of the 229 belong to modules outside the ERP's
accounting module, or cannot be reproduced in the sandbox:
- payroll: `EmployeePaymentByEmployeeReport`, `EmployeePaymentYearlyByEmployeeReport`, `EmployeePphReport`, `EmployeeSalaryProportionReport`, `EmployeeSalaryPerYearReport`
- job orders: `MaterialAdjustmentDetailReport`, `RollOverItemDetailReport`, `RollOverAccountDetailReport`, `JobOrderListReport`, `RollOverListReport`, `MaterialAdjustmentListReport`
- manufacturing: `WorkOrderJournalReport`, `AdjustmentCOGSManufactureReport`, `PurchaseCOGSManufactureReport`
- activity log / users / access: `AuditListReport`, `UserByBranchListReport`, `AccessGroupPrivilegeListReport`, `AccessPrivilegeByUserListReport`

Manufacturing would not stay enabled in the sandbox (likely a paid add-on). The activity log and access reports
describe Accurate's own users and privileges, not accounting data. Payroll and job orders are separate modules with
their own domain (PPh 21, salary components, work-in-process).

## Decision
These 18 reports are out of scope for the accounting module. Their captured specs (`docs/reports/<planId>.md`,
`captures/<planId>.json`) stay as reference; the index marks them **out of scope**. Verification targets the other 211.

## Alternatives Considered
- **Model payroll now**: PPh 21 and salary proportions are a project of their own; deferring keeps the accounting
  module focused. The employee loan reports (Piutang Karyawan) remain in scope and are already verified.
- **Attempt everything**: manufacturing needs a paid plan, and access reports would require real users and privileges
  in the sandbox, with no accounting value.

## Consequences
- Revisit when payroll, job-order or manufacturing modules are planned; the specs are the starting point.
