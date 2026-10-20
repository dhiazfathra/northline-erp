# Penyelesaian Pesanan

Module: Persediaan. Accurate: Persediaan > Penyelesaian Pesanan (`accurate__inventory__roll-over`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/job-costing/roll-overs.

**Verdict:** accepted divergence (ADR-0041, ADR-0044) (journal after edit, defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/penyelesaian-pesanan.mjs`](../../../../tools/parity/scenarios/penyelesaian-pesanan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: a job order dated 17 Mar 2051 taking 1 NL-T4 Barang A plus 10.000 NL-P4 Ongkos Kerja, WIP 110403.
2. Finish it to account 600002 Beban Komisi (100%) on 18 Mar 2051.
3. Edit it: new description.
4. Read Keseluruhan Jurnal for the day.
5. Save a roll-over into NL-T4 Barang A, one of the job's materials: rejected.
6. Delete it; read the journal and the list again; delete the job order.

## Inputs
```json
{
 "job": {
  "date": "2051-03-17",
  "description": "NL-P4-RO1 pekerjaan",
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
  ]
 },
 "date": "2051-03-18",
 "description": "NL-P4-RO1",
 "accounts": [
  {
   "account": "600002",
   "name": "NL-P4 Biaya Selesai",
   "portion": 100
  }
 ],
 "edit": {
  "description": "NL-P4-RO1 edit"
 },
 "reject": {
  "description": "NL-P4-RO1 ke bahan baku",
  "lines": [
   {
    "item": "NL-T4-B1",
    "qty": 1,
    "portion": 100
   }
  ]
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | RO.2051.03.nnnnn | RO.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","18 Mar 2051","No. Trans #",":","RO.2051.03.nnnnn"],["Tipe Transaksi",":","Penyelesaian Pesanan","Deskripsi",":","NL-P4-RO1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600002","Beban Komisi","24.600","0"],["510102","Selisih Biaya Produksi","0","0"],["110403","Persediaan Dalam Proses","0","24.600"],["24.600","24.600"]] | [["Tanggal",":","18 Mar 2051","No. Trans #",":","RO.2051.03.nnnnn"],["Tipe Transaksi",":","Penyelesaian Pesanan","Deskripsi",":","NL-P4-RO1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600002","Beban Komisi","24.600","0"],["110403","Persediaan Dalam Proses","0","24.600"],["24.600","24.600"]] | no |
| rejected save | false | false | yes |
| validation message | NL-T4 Barang A adalah termasuk dalam bahan baku. Tidak bisa di selesaikan ke barang tersebut.; Penyelesaian ke Barang "NL-T4 Barang A" tidak benar. Barang ini merupakan barang yang terdapat pada rincian barang pekerjaan pesanan | NL-T4 Barang A adalah termasuk dalam bahan baku. Tidak bisa di selesaikan ke barang tersebut.; Penyelesaian ke Barang "NL-T4 Barang A" tidak benar. Barang ini merupakan barang yang terdapat pada rincian barang pekerjaan pesanan | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","rollOverType":"ITEM","branch":"Kantor Pusat"} | {"date":"required","rollOverType":"ITEM (lines given)","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["transactionCurrency","currency","comment","attachments","forceApproved","forceRejected"] | [] | no |

## Divergences
- **journal after edit**: ADR-0044 D3: Accurate adds a zero line on the job's difference account (510102 Selisih Biaya Produksi, 0/0); the ERP has no difference account. Amounts and every other line match.
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: see the list; attachments, comments and approval state are not in the ERP.

See [ADR-0041](../../../decisions/0041-p4-batch-1-screen-divergences.md) and [ADR-0044](../../../decisions/0044-p4-batch-4-screen-divergences.md). A video of the Accurate run (`accurate.webm`) is kept locally, not committed.

## Evidence
- [run.log](run.log)
- create: [Accurate](accurate-create.png), [ERP](erp-create.png)
- edit: [Accurate](accurate-edit.png), [ERP](erp-edit.png)
- reject: [Accurate](accurate-reject.png), [ERP](erp-reject.png)
- delete: [Accurate](accurate-delete.png), [ERP](erp-delete.png)
- journal: [Accurate](accurate-journal.png), [ERP](erp-journal.png)

ERP screenshots render the API request and response: the web doc screens are still mock data (`apps/web/src/api/docs.ts`).
Accurate screenshots mask the header (Data Usaha name, user menu), any email or IP and the version/session tag; the mask is asserted before each capture.
