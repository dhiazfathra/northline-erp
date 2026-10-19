# Perubahan Aset Tetap

Module: Aset Tetap. Accurate: Aset Tetap > Perubahan Aset Tetap (`accurate__fixed-asset__fixed-asset-edited`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/fixed-assets/edits.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/perubahan-aset-tetap.mjs`](../../../../tools/parity/scenarios/perubahan-aset-tetap.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: an asset NL-P4-FAE1 aset, 2.400.000 against NL-T1-3001, 24 months, dated 10 Mar 2051.
2. Change its useful life to 36 months on 11 Mar 2051.
3. Edit the change: new description, 48 months.
4. Read Keseluruhan Jurnal for the day (no journal).
5. Save a change without an asset: rejected.
6. Delete the change; read the journal and the list again; delete the asset.

## Inputs
```json
{
 "asset": {
  "date": "2051-03-10",
  "description": "NL-P4-FAE1 aset",
  "amount": 2400000,
  "lifeMonths": 24
 },
 "date": "2051-03-11",
 "description": "NL-P4-FAE1",
 "lifeMonths": 36,
 "edit": {
  "description": "NL-P4-FAE1 edit",
  "lifeMonths": 48
 },
 "reject": {
  "description": "NL-P4-FAE1 tanpa aset"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | FAE.2051.03.nnnnn | FAE.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [] | [] | yes |
| rejected save | false | false | yes |
| validation message | Aset harus diisi | Aset harus diisi | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","editedType":"EDITED","newMethod":"NONDEPREFA"} | {"date":"required","editedType":"EDITED (useful life only)","newMethod":"unchanged (straight line)"} | no |
| header fields without an ERP counterpart | ["lastDepreciationDate","lastBookValue","newAssetCost","newResidu","revaluationAmount","comment","attachments","gainLossAccount","acmDepreciationAccount","assetAccount","department","branch","depreciationAccount","fiscalFaType","transactionCurrency","newDepreciationMethod","depreciationMethodName","originalEstimatedLifeYear","originalEstimatedLifeMonth","canEdited","newFiscalFa","newIntangible"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date is a client default, not an API default.
- **header fields without an ERP counterpart**: D2: attachments, comments, cost/method/account/branch/quantity revaluation (the change models useful life only, ADR-0037 shortcut) are not in the ERP.

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
