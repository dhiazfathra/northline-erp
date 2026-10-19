# Penerimaan

Module: Kas & Bank. Accurate: Kas & Bank > Penerimaan (`accurate__cash-bank__other-deposit`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/cash-bank/documents (kind=DEP).

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `935b6d9` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/penerimaan.mjs`](../../../../tools/parity/scenarios/penerimaan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create a Penerimaan from NL-T1 Kas, one line NL-T1-4001 400.000, dated 2051-01-07.
2. Edit it: new description, line 425.000.
3. Read Keseluruhan Jurnal for the day.
4. Save a Penerimaan without lines: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-01-07",
 "bank": "NL-T1-1101",
 "description": "NL-P4-OD1",
 "lines": [
  {
   "account": "NL-T1-4001",
   "amount": 400000,
   "notes": "NL-P4-OD1 pendapatan"
  }
 ],
 "edit": {
  "description": "NL-P4-OD1 edit",
  "amount": 425000
 },
 "reject": {
  "description": "NL-P4-OD1 tanpa rincian",
  "lines": []
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | NL-T1-1101.2051.01.nnnnn | NL-T1-1101.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","07 Jan 2051","No. Trans #",":","NL-T1-1101.2051.01.nnnnn"],["Tipe Transaksi",":","Penerimaan","Deskripsi",":","NL-P4-OD1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1101","NL-T1 Kas","425.000","0"],["NL-T1-4001","NL-T1 Pendapatan","0","425.000"],["425.000","425.000"]] | [["Tanggal",":","07 Jan 2051","No. Trans #",":","NL-T1-1101.2051.01.nnnnn"],["Tipe Transaksi",":","Penerimaan","Deskripsi",":","NL-P4-OD1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1101","NL-T1 Kas","425.000","0"],["NL-T1-4001","NL-T1 Pendapatan","0","425.000"],["425.000","425.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","bank":"none","branch":"Kantor Pusat"} | {"date":"required","bank":"none","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["rate","says","payee","voidCheq","reconciled","reconcileDate","transactionCurrency","comment","attachments","unreconciledProcess","allowPostponement","bankJournalDetail","bankStatement","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, payee and terbilang, foreign currency and rate, SSP numbers, void-cheque, reconciliation and amortization flags are not in the ERP.

See [ADR-0041](../../../decisions/0041-p4-batch-1-screen-divergences.md). A video of the Accurate run (`accurate.webm`) is kept locally, not committed.

## Evidence
- [run.log](run.log)
- create: [Accurate](accurate-create.png), [ERP](erp-create.png)
- edit: [Accurate](accurate-edit.png), [ERP](erp-edit.png)
- reject: [Accurate](accurate-reject.png), [ERP](erp-reject.png)
- delete: [Accurate](accurate-delete.png), [ERP](erp-delete.png)
- journal: [Accurate](accurate-journal.png), [ERP](erp-journal.png)

ERP screenshots render the API request and response: the web doc screens are still mock data (`apps/web/src/api/docs.ts`).
Accurate screenshots mask the header (Data Usaha name, user menu) and any email or IP; the mask is asserted before each capture.
