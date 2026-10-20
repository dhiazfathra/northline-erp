# Transfer Bank

Module: Kas & Bank. Accurate: Kas & Bank > Transfer Bank (`accurate__cash-bank__bank-transfer`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/cash-bank/transfers.

**Verdict:** accepted divergence (ADR-0041, ADR-0045) (defaults, header fields without an ERP counterpart)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `af4c5ca` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/transfer-bank.mjs`](../../../../tools/parity/scenarios/transfer-bank.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Transfer 100.000 from NL-T1 Kas to Kas Kecil, dated 17 Jan 2051.
2. Edit it: new description, 125.000.
3. Read Keseluruhan Jurnal for the day.
4. Save a transfer without a destination bank: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-01-17",
 "from": "NL-T1-1101",
 "to": "110101",
 "amount": 100000,
 "description": "NL-P4-BT1",
 "edit": {
  "description": "NL-P4-BT1 edit",
  "amount": 125000
 },
 "reject": {
  "description": "NL-P4-BT1 tanpa tujuan"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | BT.2051.01.nnnnn | BT.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| edit | saved | saved | yes |
| journal after edit | [["Tanggal",":","17 Jan 2051","No. Trans #",":","BT.2051.01.nnnnn"],["Tipe Transaksi",":","Transfer Bank","Deskripsi",":","NL-P4-BT1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110101","Kas Kecil","125.000","0"],["NL-T1-1101","NL-T1 Kas","0","125.000"],["125.000","125.000"]] | [["Tanggal",":","17 Jan 2051","No. Trans #",":","BT.2051.01.nnnnn"],["Tipe Transaksi",":","Transfer Bank","Deskripsi",":","NL-P4-BT1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110101","Kas Kecil","125.000","0"],["NL-T1-1101","NL-T1 Kas","0","125.000"],["125.000","125.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Ke Kas/Bank harus diisi | Ke Kas/Bank harus diisi | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","rate":1} | {"date":"required","rate":1} | no |
| header fields without an ERP counterpart | ["fromBankRate","toBankRate","differenceAccount","fromBankSays","toBankSays","fromReconciled","toReconciled","differenceAmountDescription","cashOutAmount","cashInAmount","transactionCurrency","unreconciledProcess","comment","attachments","fromBankJournalDetail","toBankJournalDetail","fromReconcileDate","toReconcileDate","bankStatement","purchasePayment","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the rate 1 are client defaults.
- **header fields without an ERP counterpart**: D2: attachments, custom fields, the difference account and exchange rates (foreign-currency transfers) are not in the ERP.

See [ADR-0041](../../../decisions/0041-p4-batch-1-screen-divergences.md) and [ADR-0045](../../../decisions/0045-p4-tier1-closure.md). A video of the Accurate run (`accurate.webm`) is kept locally, not committed.

## Evidence
- [run.log](run.log)
- create: [Accurate](accurate-create.png), [ERP](erp-create.png)
- edit: [Accurate](accurate-edit.png), [ERP](erp-edit.png)
- reject: [Accurate](accurate-reject.png), [ERP](erp-reject.png)
- delete: [Accurate](accurate-delete.png), [ERP](erp-delete.png)
- journal: [Accurate](accurate-journal.png), [ERP](erp-journal.png)

ERP screenshots render the API request and response: the web doc screens are still mock data (`apps/web/src/api/docs.ts`).
Accurate screenshots mask the header (Data Usaha name, user menu), any email or IP and the version/session tag; the mask is asserted before each capture.
