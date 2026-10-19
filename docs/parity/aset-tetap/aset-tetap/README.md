# Aset Tetap

Module: Aset Tetap. Accurate: Aset Tetap > Aset Tetap (`accurate__fixed-asset__fixed-asset`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/fixed-assets.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/aset-tetap.mjs`](../../../../tools/parity/scenarios/aset-tetap.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create an asset NL-P4-FA1 (ZZ-R03-Elektronik C, Inventaris Kantor, 24 months straight line), one expenditure 2.400.000 against NL-T1-3001, dated 09 Mar 2051.
2. Edit it: new description, expenditure 3.000.000.
3. Read Keseluruhan Jurnal for the day.
4. Save an asset without expenditure: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-03-09",
 "description": "NL-P4-FA1",
 "amount": 2400000,
 "lifeMonths": 24,
 "category": "ZZ-R03-Elektronik C",
 "edit": {
  "description": "NL-P4-FA1 edit",
  "amount": 3000000
 },
 "reject": {
  "description": "NL-P4-FA1 tanpa pengeluaran"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | FAA.2051.03.nnnnn | FAA.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","09 Mar 2051","No. Trans #",":","FAA.2051.03.nnnnn"],["Tipe Transaksi",":","Aset Tetap","Deskripsi",":","NL-P4-FA1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["120005","Inventaris Kantor","3.000.000","0"],["NL-T1-3001","NL-T1 Modal","0","3.000.000"],["3.000.000","3.000.000"]] | [["Tanggal",":","09 Mar 2051","No. Trans #",":","FAA.2051.03.nnnnn"],["Tipe Transaksi",":","Aset Tetap","Deskripsi",":","NL-P4-FA1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["120005","Inventaris Kantor","3.000.000","0"],["NL-T1-3001","NL-T1 Modal","0","3.000.000"],["3.000.000","3.000.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","usageDate":"today","method":"STRAIGHTLINE","quantity":1,"branch":"Kantor Pusat"} | {"date":"required","usageDate":"the acquisition date","method":"STRAIGHTLINE","quantity":"one asset per record","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["notes","depreciationMethodName","lastJournalDate","depreciationAmount","bookValue","residu","quantity","quantityAvailable","depreciationRate","department","fiscalFa","intangible","canEdited","comment","attachments","transactionCurrency","location","assetBranchName","purchaseNumber","purchase","receiveItemNumber","receiveItem"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date, the usage date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, quantity, residual value, location, intangible flag, tax-depreciation detail and the purchase-invoice link are not in the ERP.

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
