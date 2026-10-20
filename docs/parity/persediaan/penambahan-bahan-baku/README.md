# Penambahan Bahan Baku

Module: Persediaan. Accurate: Persediaan > Penambahan Bahan Baku (`accurate__inventory__material-adjustment`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/job-costing/material-adjustments.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/penambahan-bahan-baku.mjs`](../../../../tools/parity/scenarios/penambahan-bahan-baku.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: a job order dated 15 Mar 2051 taking 1 NL-T4 Barang A, WIP 110403.
2. Take 1 more NL-T4 Barang A into it (Ambil Barang) on 16 Mar 2051.
3. Edit it: new description, quantity 2.
4. Read Keseluruhan Jurnal for the day.
5. Save an adjustment without lines: rejected.
6. Delete it; read the journal and the list again; delete the job order.

## Inputs
```json
{
 "job": {
  "date": "2051-03-15",
  "description": "NL-P4-MA1 pekerjaan",
  "materials": [
   {
    "item": "NL-T4-B1",
    "qty": 1
   }
  ]
 },
 "date": "2051-03-16",
 "type": "ITEM_PICK",
 "description": "NL-P4-MA1",
 "lines": [
  {
   "item": "NL-T4-B1",
   "qty": 1
  }
 ],
 "edit": {
  "description": "NL-P4-MA1 edit",
  "qty": 2
 },
 "reject": {
  "description": "NL-P4-MA1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | MA.2051.03.nnnnn | MA.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","16 Mar 2051","No. Trans #",":","MA.2051.03.nnnnn"],["Tipe Transaksi",":","Penambahan Bahan Baku","Deskripsi",":","NL-P4-MA1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110403","Persediaan Dalam Proses","29.200","0"],["110401","Persediaan Barang Jadi","0","29.200"],["29.200","29.200"]] | [["Tanggal",":","16 Mar 2051","No. Trans #",":","MA.2051.03.nnnnn"],["Tipe Transaksi",":","Penambahan Bahan Baku","Deskripsi",":","NL-P4-MA1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110403","Persediaan Dalam Proses","29.200","0"],["110401","Persediaan Barang Jadi","0","29.200"],["29.200","29.200"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","type":"ITEM_PICK","branch":"Kantor Pusat"} | {"date":"required","type":"required","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["allExpensePaid","pickAdjustment","department","project","transactionCurrency","currency","comment","attachments"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date, the type and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: see the list; attachments, comments, department, project and the pick-adjustment link are not in the ERP.

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
