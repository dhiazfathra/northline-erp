# Disposisi Aset Tetap

Module: Aset Tetap. Accurate: Aset Tetap > Disposisi Aset Tetap (`accurate__fixed-asset__fixed-asset-disposed`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/fixed-assets/disposals.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/disposisi-aset-tetap.mjs`](../../../../tools/parity/scenarios/disposisi-aset-tetap.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: an asset NL-P4-FAD1 aset, 2.400.000 against NL-T1-3001, 24 months, dated 12 Mar 2051.
2. Dispose of it unsold on 13 Mar 2051 against 720006 Laba/Rugi Disposisi Aset.
3. Edit the disposal: new description, sold for 1.000.000 into NL-T1 Kas.
4. Read Keseluruhan Jurnal for the day.
5. Save a disposal without an asset: rejected.
6. Delete the disposal; read the journal and the list again; delete the asset.

## Inputs
```json
{
 "asset": {
  "date": "2051-03-12",
  "description": "NL-P4-FAD1 aset",
  "amount": 2400000,
  "lifeMonths": 24
 },
 "date": "2051-03-13",
 "description": "NL-P4-FAD1",
 "gainLossAccount": "720006",
 "edit": {
  "description": "NL-P4-FAD1 edit",
  "price": 1000000,
  "sellingAccount": "NL-T1-1101"
 },
 "reject": {
  "description": "NL-P4-FAD1 tanpa aset"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | FAD.2051.03.nnnnn | FAD.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","13 Mar 2051","No. Trans #",":","FAD.2051.03.nnnnn"],["Tipe Transaksi",":","Disposisi Aset Tetap","Deskripsi",":","NL-P4-FAD1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["720006","Laba/Rugi Disposisi Aset","2.400.000","0"],["120005","Inventaris Kantor","0","2.400.000"],["NL-T1-1101","NL-T1 Kas","1.000.000","0"],["720006","Laba/Rugi Disposisi Aset","0","1.000.000"],["3.400.000","3.400.000"]] | [["Tanggal",":","13 Mar 2051","No. Trans #",":","FAD.2051.03.nnnnn"],["Tipe Transaksi",":","Disposisi Aset Tetap","Deskripsi",":","NL-P4-FAD1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["720006","Laba/Rugi Disposisi Aset","2.400.000","0"],["120005","Inventaris Kantor","0","2.400.000"],["NL-T1-1101","NL-T1 Kas","1.000.000","0"],["720006","Laba/Rugi Disposisi Aset","0","1.000.000"],["3.400.000","3.400.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Aset harus diisi | Aset harus diisi | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","sold":false,"quantity":0} | {"date":"required","sold":false,"quantity":"whole asset"} | no |
| header fields without an ERP counterpart | ["comment","attachments","location","lastDepreciationDate","lastBookValue","lastQuantity","canEdited","reconciled","reconcileDate"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date is a client default, not an API default.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields and partial (quantity) disposal are not in the ERP.

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
