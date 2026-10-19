# Jurnal Umum

Module: Buku Besar. Accurate: Buku Besar > Jurnal Umum (`accurate__general-ledger__journal-voucher`), Manufaktur Demo. ERP: POST /api/ledger/commands (PostJournal, EditJournal, DeleteJournal).

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `935b6d9` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/jurnal-umum.mjs`](../../../../tools/parity/scenarios/jurnal-umum.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create a two-line journal (Dr NL-T1 Beban / Cr NL-T1 Utang Lain 150.000) dated 05 Jan 2051.
2. Edit it: new description, both lines 175.000.
3. Read Keseluruhan Jurnal for the day.
4. Save an unbalanced journal (Dr 100.000 / Cr 50.000): rejected.
5. Delete the journal; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-01-05",
 "description": "NL-P4-JV1",
 "lines": [
  {
   "account": "NL-T1-6001",
   "side": "DEBIT",
   "amount": 150000,
   "memo": "NL-P4-JV1 beban"
  },
  {
   "account": "NL-T1-2101",
   "side": "CREDIT",
   "amount": 150000,
   "memo": "NL-P4-JV1 utang"
  }
 ],
 "edit": {
  "description": "NL-P4-JV1 edit",
  "amount": 175000
 },
 "reject": {
  "description": "NL-P4-JV1 tidak seimbang",
  "lines": [
   {
    "account": "NL-T1-6001",
    "side": "DEBIT",
    "amount": 100000
   },
   {
    "account": "NL-T1-2101",
    "side": "CREDIT",
    "amount": 50000
   }
  ]
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | JV.2051.01.nnnnn | JV.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","05 Jan 2051","No. Trans #",":","JV.2051.01.nnnnn"],["Tipe Transaksi",":","Jurnal Umum","Deskripsi",":","NL-P4-JV1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-6001","NL-T1 Beban","175.000","0"],["NL-T1-2101","NL-T1 Utang Lain","0","175.000"],["175.000","175.000"]] | [["Tanggal",":","05 Jan 2051","No. Trans #",":","JV.2051.01.nnnnn"],["Tipe Transaksi",":","Jurnal Umum","Deskripsi",":","NL-P4-JV1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-6001","NL-T1 Beban","175.000","0"],["NL-T1-2101","NL-T1 Utang Lain","0","175.000"],["175.000","175.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Jurnal yang anda masukkan tidak seimbang antara debit dengan kredit | Jurnal yang anda masukkan tidak seimbang antara debit dengan kredit | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","branch":"Kantor Pusat"} | {"date":"required","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["transactionCurrency","comment","attachments","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields and foreign-currency journals are not in the ERP.

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
