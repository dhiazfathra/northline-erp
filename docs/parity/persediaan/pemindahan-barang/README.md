# Pemindahan Barang

Module: Persediaan. Accurate: Persediaan > Pemindahan Barang (`accurate__inventory__item-transfer`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/inventory/transfers.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pemindahan-barang.mjs`](../../../../tools/parity/scenarios/pemindahan-barang.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Send 1 NL-T4 Barang A from Utama to NL-Gudang B (Kirim Barang), dated 13 Mar 2051.
2. Edit it: new description, quantity 2.
3. Read Keseluruhan Jurnal for the day and Ringkasan Mutasi Gudang (Utama, Transit) for NL-T4-B1.
4. Save a transfer without lines: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-03-13",
 "warehouse": "Utama",
 "referenceWarehouse": "NL-Gudang B",
 "description": "NL-P4-IT1",
 "lines": [
  {
   "item": "NL-T4-B1",
   "qty": 1
  }
 ],
 "edit": {
  "description": "NL-P4-IT1 edit",
  "qty": 2
 },
 "reject": {
  "description": "NL-P4-IT1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | IT.2051.03.nnnnn | IT.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [] | [] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","direction":"TRANSFER_OUT","transit":"Transit (AOL System)","branch":"Kantor Pusat"} | {"date":"required","direction":"required","transit":"Transit (AOL System)","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["differenceItemTransferAccount","comment","attachments","itemTransferOutStatus","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |
| warehouse mutation after edit (Utama, Transit) | [["Nama Barang Barang & Jasa","Saldo Awal","Masuk","Keluar","Saldo Akhir"],["Transit (AOL System)"],["NL-T4 Barang A","0","2","0","2"],["0","2","0","2"],["Utama"],["NL-T4 Barang A","18","0","2","16"],["18","0","2","16"]] | [["Nama Barang Barang & Jasa","Saldo Awal","Masuk","Keluar","Saldo Akhir"],["Transit (AOL System)"],["NL-T4 Barang A","0","2","0","2"],["0","2","0","2"],["Utama"],["NL-T4 Barang A","18","0","2","16"],["18","0","2","16"]] | yes |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date, the direction and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: see the list; attachments, comments, custom fields, the difference account and print state are not in the ERP.

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
