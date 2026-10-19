# Pinjaman Karyawan

Module: Buku Besar. Accurate: Buku Besar > Pinjaman Karyawan (`accurate__cash-bank__employee-loan`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/employee-loans.

**Verdict:** stopped: Accurate edit shape not found after 3 attempts (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pinjaman-karyawan.mjs`](../../../../tools/parity/scenarios/pinjaman-karyawan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create a 300.000 interest-free loan to E.00001 Karyawan Produksi (receivable NL-T1-1201), dated 12 Jan 2051.
2. Edit it: new description, 360.000.
3. Read Keseluruhan Jurnal for the day (a loan posts nothing until it is disbursed).
4. Save a loan without an employee: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-01-12",
 "start": "2051-02-12",
 "employee": "E.00001",
 "description": "NL-P4-L1",
 "amount": 300000,
 "receivableAccount": "NL-T1-1201",
 "edit": {
  "description": "NL-P4-L1 edit",
  "amount": 360000
 },
 "reject": {
  "description": "NL-P4-L1 tanpa karyawan"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | EPL.2051.01.nnnnn | EPL.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [] | [] | yes |
| rejected save | false | false | yes |
| validation message | Karyawan harus diisi | Karyawan harus diisi | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","installmentType":"NOINTEREST","interestRate":0} | {"date":"required","installmentType":"none (no schedule)","interestRate":0} | no |
| header fields without an ERP counterpart | ["currency","interestAmount","installmentType","loanStatus","loanStatusName","loanDuration","startDateInstallment","bankAccount","bankAccountName","bankName","bankCode","employeeBank","attachments","otherContactName","otherContactPhone","otherDescription","employeeSalary","employeeLatestSalary","interestAccount","penaltyAccount","reverseInterestIncomeAccount","interestIncomeAccount","employeeFee","useEmployeeFee"] | [] | no |

## Stopped
Stop rule (docs/goals/full-parity-v2.md): the edit's form shape was not found in 3 attempts. The form's wire with a new amount and description, and with the description alone, is refused ("Karyawan ... Masih Memiliki Pinjaman Yang Belum Lunas", the loan counted against itself); the form's own Simpan on the reopened loan stops at "Nama Bank harus diisi" (the bank-name lookup does not resolve the text the wire saved). Create, the rejected save, delete and the list compare as below; on the Accurate side "number kept on edit" and "journal after edit" show the unedited loan. See ADR-0041.

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date is a client default, not an API default.
- **header fields without an ERP counterpart**: D3: the ERP loan has no installment schedule (duration, start date, installment type), interest or penalty accounts, employee bank details or employee fee yet (ADR-0041).

See [ADR-0041](../../../decisions/0041-p4-batch-1-screen-divergences.md). A video of the Accurate run (`accurate.webm`) is kept locally, not committed.

## Evidence
- [run.log](run.log)
- create: [Accurate](accurate-create.png), [ERP](erp-create.png)
- edit: [Accurate](accurate-edit.png), [ERP](erp-edit.png)
- reject: [Accurate](accurate-reject.png), [ERP](erp-reject.png)
- delete: [Accurate](accurate-delete.png), [ERP](erp-delete.png)
- journal: [Accurate](accurate-journal.png), [ERP](erp-journal.png)

ERP screenshots render the API request and response: the web doc screens are still mock data (`apps/web/src/api/docs.ts`).
Accurate screenshots mask the header (Data Usaha name, user menu), any email or IP and the version/session tag; the mask is asserted before each capture.
