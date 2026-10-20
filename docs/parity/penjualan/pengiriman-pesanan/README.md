# Pengiriman Pesanan

Module: Penjualan. Accurate: Penjualan > Pengiriman Pesanan (`accurate__customer__delivery-order`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/sales/deliveries.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pengiriman-pesanan.mjs`](../../../../tools/parity/scenarios/pengiriman-pesanan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Deliver 1 NL-T4 Barang A from Utama to NL-T2 Pelanggan A, no sales order, dated 10 Mar 2051.
2. Edit it: new description, quantity 2.
3. Read Keseluruhan Jurnal for the day.
4. Save a delivery without lines: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-03-10",
 "customer": "NL-T2-C1",
 "description": "NL-P4-DO1",
 "lines": [
  {
   "item": "NL-T4-B1",
   "qty": 1
  }
 ],
 "edit": {
  "description": "NL-P4-DO1 edit",
  "qty": 2
 },
 "reject": {
  "description": "NL-P4-DO1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | DO.2051.03.nnnnn | DO.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","10 Mar 2051","No. Trans #",":","DO.2051.03.nnnnn"],["Tipe Transaksi",":","Pengiriman Pesanan","Deskripsi",":","NL-P4-DO1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110402","Persediaan Terkirim","29.200","0"],["110401","Persediaan Barang Jadi","0","29.200"],["29.200","29.200"]] | [["Tanggal",":","10 Mar 2051","No. Trans #",":","DO.2051.03.nnnnn"],["Tipe Transaksi",":","Pengiriman Pesanan","Deskripsi",":","NL-P4-DO1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110402","Persediaan Terkirim","29.200","0"],["110401","Persediaan Barang Jadi","0","29.200"],["29.200","29.200"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","branch":"Kantor Pusat"} | {"date":"required","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["poNumber","currency","rate","fob","shipment","toAddress","tax1","tax2","tax4","taxable","inclusiveTax","cashDiscPercent","cashDiscount","tax1Rate","tax2Rate","tax4Rate","percentTaxable","downPayments","transactionCurrency","comment","attachments","deliveryPacking","deliveryPackingNumber","onlineOrder","contactInfo","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, PO number, currency, shipping, taxes, packing, online order, contact and print state are not in the ERP.

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
