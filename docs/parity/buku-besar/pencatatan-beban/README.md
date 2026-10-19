# Pencatatan Beban

Module: Buku Besar. Accurate: Buku Besar > Pencatatan Beban (`accurate__general-ledger__expense-accrual`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/expense-accruals.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `9db4af4` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pencatatan-beban.mjs`](../../../../tools/parity/scenarios/pencatatan-beban.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create an expense accrual dated 02 Feb 2051, due 02 Mar 2051, payable 210206: one line 600011 Beban Listrik 120.000.
2. Edit it: new description, line 135.000.
3. Read Keseluruhan Jurnal for the day.
4. Save an accrual without lines: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-02-02",
 "dueDate": "2051-03-02",
 "payableAccount": "210206",
 "description": "NL-P4-EA1",
 "lines": [
  {
   "account": "600011",
   "amount": 120000
  }
 ],
 "edit": {
  "description": "NL-P4-EA1 edit",
  "amount": 135000
 },
 "reject": {
  "description": "NL-P4-EA1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | EXP.2051.02.nnnnn | EXP.2051.02.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","02 Feb 2051","No. Trans #",":","EXP.2051.02.nnnnn"],["Tipe Transaksi",":","Pencatatan Beban","Deskripsi",":","NL-P4-EA1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600011","Beban Listrik","135.000","0"],["210206","Hutang Gaji Karyawan","0","135.000"],["135.000","135.000"]] | [["Tanggal",":","02 Feb 2051","No. Trans #",":","EXP.2051.02.nnnnn"],["Tipe Transaksi",":","Pencatatan Beban","Deskripsi",":","NL-P4-EA1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600011","Beban Listrik","135.000","0"],["210206","Hutang Gaji Karyawan","0","135.000"],["135.000","135.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi!; Ada yang salah dengan data yang dimasukkan. Total nilai harus lebih besar dari nol. | Detail dari transaksi belum diisi!; Ada yang salah dengan data yang dimasukkan. Total nilai harus lebih besar dari nol. | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","dueDate":"today","payableAccount":"none","branch":"Kantor Pusat"} | {"date":"required","dueDate":"required","payableAccount":"required","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["transactionCurrency","comment","attachments","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date (transaction and due date), the payable account and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields and foreign currency are not in the ERP.

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
