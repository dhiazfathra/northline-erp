# Pencatatan Gaji

Module: Buku Besar. Accurate: Buku Besar > Pencatatan Gaji (`accurate__cash-bank__employee-payment`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/payroll/runs.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `9db4af4` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pencatatan-gaji.mjs`](../../../../tools/parity/scenarios/pencatatan-gaji.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create a monthly payroll for Februari 2051 dated 28 Feb 2051: NL-PY50-E1 (TK0) Gaji Pokok 10.000.000, Tunjangan Transportasi 1.000.000 (PPh 21 TER 330.000).
2. Edit it: new description, Gaji Pokok 12.000.000 (PPh 650.000).
3. Read Keseluruhan Jurnal for the day.
4. Save a payroll without employees: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-02-28",
 "year": 2051,
 "month": 2,
 "employee": "NL-PY50-E1",
 "description": "NL-P4-EPY1",
 "fees": {
  "Gaji Pokok": 10000000,
  "Tunjangan Transportasi": 1000000
 },
 "payableAccount": "210206",
 "pphAccount": "210205",
 "feeAccounts": {
  "Gaji Pokok": "600004",
  "Tunjangan Transportasi": "600006"
 },
 "edit": {
  "description": "NL-P4-EPY1 edit",
  "fees": {
   "Gaji Pokok": 12000000,
   "Tunjangan Transportasi": 1000000
  }
 },
 "reject": {
  "description": "NL-P4-EPY1 tanpa karyawan"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | EPY.2051.02.nnnnn | EPY.2051.02.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","28 Feb 2051","No. Trans #",":","EPY.2051.02.nnnnn"],["Tipe Transaksi",":","Pencatatan Gaji","Deskripsi",":","NL-P4-EPY1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600004","Beban Gaji, Upah & Honorer","12.000.000","0"],["600006","Beban Transportasi Karyawan","1.000.000","0"],["210205","Hutang PPh 21","0","650.000"],["210206","Hutang Gaji Karyawan","0","12.350.000"],["13.000.000","13.000.000"]] | [["Tanggal",":","28 Feb 2051","No. Trans #",":","EPY.2051.02.nnnnn"],["Tipe Transaksi",":","Pencatatan Gaji","Deskripsi",":","NL-P4-EPY1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600004","Beban Gaji, Upah & Honorer","12.000.000","0"],["600006","Beban Transportasi Karyawan","1.000.000","0"],["210205","Hutang PPh 21","0","650.000"],["210206","Hutang Gaji Karyawan","0","12.350.000"],["13.000.000","13.000.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","period":"this month","type":"MONTHLY","payableAccount":302,"pphAccount":301,"branch":"Kantor Pusat"} | {"date":"required","period":"required","type":"monthly (the only type)","payableAccount":"required for the journal","pphAccount":"required for the journal","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["_param"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date, this month as the period, the payable and PPh accounts and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, terbilang, the pension/health due dates and accounts and the excess-PPh-to-allowance option are not in the ERP.

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
