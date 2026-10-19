# Retur Pembelian

Module: Pembelian. Accurate: Pembelian > Retur Pembelian (`accurate__vendor__purchase-return`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/purchases/returns.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/retur-pembelian.mjs`](../../../../tools/parity/scenarios/retur-pembelian.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: an untaxed purchase invoice from NL-T3 Pemasok A dated 04 Mar 2051, NL-T2 Jasa Konsultasi 2 x 100.000.
2. Return 1 of it on 05 Mar 2051.
3. Edit the return: new description, quantity 2.
4. Read Keseluruhan Jurnal for the day.
5. Save a return without lines: rejected.
6. Delete the return; read the journal and the list again; delete the invoice.

## Inputs
```json
{
 "invoice": {
  "date": "2051-03-04",
  "bill": "NL-P4-PR1-B",
  "description": "NL-P4-PR1 faktur",
  "qty": 2,
  "price": 100000
 },
 "date": "2051-03-05",
 "vendor": "NL-T3-V1",
 "description": "NL-P4-PR1",
 "lines": [
  {
   "item": "NL-T2-S1",
   "qty": 1,
   "price": 100000
  }
 ],
 "edit": {
  "description": "NL-P4-PR1 edit",
  "qty": 2
 },
 "reject": {
  "description": "NL-P4-PR1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | PRT.2051.03.nnnnn | PRT.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","05 Mar 2051","No. Trans #",":","PRT.2051.03.nnnnn"],["Tipe Transaksi",":","Retur Pembelian","Deskripsi",":","NL-P4-PR1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["210101","Hutang Usaha IDR","200.000","0"],["600020","Beban Operasional Lainnya","0","200.000"],["200.000","200.000"]] | [["Tanggal",":","05 Mar 2051","No. Trans #",":","PRT.2051.03.nnnnn"],["Tipe Transaksi",":","Retur Pembelian","Deskripsi",":","NL-P4-PR1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["210101","Hutang Usaha IDR","200.000","0"],["600020","Beban Operasional Lainnya","0","200.000"],["200.000","200.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","returnType":"INVOICE","branch":"Kantor Pusat"} | {"date":"required","returnType":"INVOICE (always against an invoice)","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["receiveItem","toAddress","tax1","tax2","tax4","subTotal","tax1Rate","tax2Rate","tax4Rate","percentTaxable","showRate","reverseInvoice","returnDownPayment","passConfirmNotEnoughStock","passReturnedQuantityGreaterThanReceived","comment","attachments","returnDocumentNumber","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, receive-item returns, down-payment return, shipping and print state are not in the ERP.

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
