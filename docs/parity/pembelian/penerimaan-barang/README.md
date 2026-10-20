# Penerimaan Barang

Module: Pembelian. Accurate: Pembelian > Penerimaan Barang (`accurate__vendor__receive-item`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/purchases/receive-items.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/penerimaan-barang.mjs`](../../../../tools/parity/scenarios/penerimaan-barang.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Receive 2 NL-T4 Barang A at 15.000 into Utama from NL-T3 Pemasok A, no purchase order, dated 11 Mar 2051.
2. Edit it: new description, quantity 3.
3. Read Keseluruhan Jurnal for the day.
4. Save a receipt without lines: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-03-11",
 "vendor": "NL-T3-V1",
 "receiveNumber": "NL-P4-RI1-R",
 "description": "NL-P4-RI1",
 "lines": [
  {
   "item": "NL-T4-B1",
   "qty": 2,
   "price": 15000
  }
 ],
 "edit": {
  "description": "NL-P4-RI1 edit",
  "qty": 3
 },
 "reject": {
  "description": "NL-P4-RI1 tanpa rincian",
  "receiveNumber": "NL-P4-RI1-X"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | RI.2051.03.nnnnn | RI.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","11 Mar 2051","No. Trans #",":","RI.2051.03.nnnnn"],["Tipe Transaksi",":","Penerimaan Barang","Deskripsi",":","NL-P4-RI1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110401","Persediaan Barang Jadi","45.000","0"],["210203","Hutang Pembelian Belum Ditagih","0","45.000"],["45.000","45.000"]] | [["Tanggal",":","11 Mar 2051","No. Trans #",":","RI.2051.03.nnnnn"],["Tipe Transaksi",":","Penerimaan Barang","Deskripsi",":","NL-P4-RI1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110401","Persediaan Barang Jadi","45.000","0"],["210203","Hutang Pembelian Belum Ditagih","0","45.000"],["45.000","45.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","branch":"Kantor Pusat"} | {"date":"required","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["currency","fob","rate","shipment","toAddress","downPayments","tax1","tax2","tax4","taxable","inclusiveTax","cashDiscPercent","cashDiscount","tax1Rate","tax2Rate","tax4Rate","percentTaxable","orderDownPayment","passReceivedQuantityGreaterThanOrdered","comment","attachments","transactionCurrency","projectContractor","masterProject","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: see the list; attachments, comments, custom fields, currency, shipping, taxes and print state are not in the ERP.

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
