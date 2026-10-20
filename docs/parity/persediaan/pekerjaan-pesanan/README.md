# Pekerjaan Pesanan

Module: Persediaan. Accurate: Persediaan > Pekerjaan Pesanan (`accurate__inventory__job-order`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/job-costing/job-orders.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/job-order.mjs`](../../../../tools/parity/scenarios/job-order.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create a job order dated 14 Mar 2051: 1 NL-T4 Barang A from Utama and 10.000 NL-P4 Ongkos Kerja on 600001, WIP 110403.
2. Edit it: new description, quantity 2.
3. Read Keseluruhan Jurnal for the day.
4. Save a job order without materials or expenses: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-03-14",
 "wipAccount": "110403",
 "description": "NL-P4-JC1",
 "materials": [
  {
   "item": "NL-T4-B1",
   "qty": 1
  }
 ],
 "expenses": [
  {
   "account": "600001",
   "name": "NL-P4 Ongkos Kerja",
   "amount": 10000
  }
 ],
 "edit": {
  "description": "NL-P4-JC1 edit",
  "qty": 2
 },
 "reject": {
  "description": "NL-P4-JC1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | JC.2051.03.nnnnn | JC.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","14 Mar 2051","No. Trans #",":","JC.2051.03.nnnnn"],["Tipe Transaksi",":","Pekerjaan Pesanan","Deskripsi",":","NL-P4-JC1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110403","Persediaan Dalam Proses","39.200","0"],["110401","Persediaan Barang Jadi","0","29.200"],["600001","Beban Iklan","0","10.000"],["39.200","39.200"]] | [["Tanggal",":","14 Mar 2051","No. Trans #",":","JC.2051.03.nnnnn"],["Tipe Transaksi",":","Pekerjaan Pesanan","Deskripsi",":","NL-P4-JC1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110403","Persediaan Dalam Proses","39.200","0"],["110401","Persediaan Barang Jadi","0","29.200"],["600001","Beban Iklan","0","10.000"],["39.200","39.200"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","jobAccount":null,"branch":"Kantor Pusat"} | {"date":"required","jobAccount":"required (wipAccount)","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["differenceAccount","department","project","allExpensePaid","passConfirmNotEnoughStock","transactionCurrency","currency","comment","attachments","manualClosed","closeReason","rollOver","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: see the list; attachments, comments, custom fields, department, project, the difference account and close state are not in the ERP.

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
