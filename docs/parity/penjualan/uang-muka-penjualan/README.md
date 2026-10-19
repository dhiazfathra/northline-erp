# Uang Muka Penjualan

Module: Penjualan. Accurate: Penjualan > Uang Muka Penjualan (`accurate__customer__sales-downpayment`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/sales/down-payments.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/uang-muka-penjualan.mjs`](../../../../tools/parity/scenarios/uang-muka-penjualan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create an untaxed down payment from NL-T2 Pelanggan A, 500.000 to 210102, dated 10 Jan 2051.
2. Edit it: new description, 550.000.
3. Read Keseluruhan Jurnal for the day.
4. Save a down payment of 0: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-01-10",
 "customer": "NL-T2-C1",
 "dpAccount": "210102",
 "description": "NL-P4-DP1",
 "amount": 500000,
 "edit": {
  "description": "NL-P4-DP1 edit",
  "amount": 550000
 },
 "reject": {
  "description": "NL-P4-DP1 nol",
  "amount": 0
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | SI.2051.01.nnnnn | SI.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","10 Jan 2051","No. Trans #",":","SI.2051.01.nnnnn"],["Tipe Transaksi",":","Uang Muka Penjualan","Deskripsi",":","NL-P4-DP1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110301","Piutang Usaha IDR","550.000","0"],["210102","Uang Muka Penjualan IDR","0","550.000"],["550.000","550.000"]] | [["Tanggal",":","10 Jan 2051","No. Trans #",":","SI.2051.01.nnnnn"],["Tipe Transaksi",":","Uang Muka Penjualan","Deskripsi",":","NL-P4-DP1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110301","Piutang Usaha IDR","550.000","0"],["210102","Uang Muka Penjualan IDR","0","550.000"],["550.000","550.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Uang muka harus lebih besar dari nol | Uang muka harus lebih besar dari nol | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","taxable":false,"branch":"Kantor Pusat"} | {"date":"required","taxable":false,"branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["poNumber","rate","fiscalRate","fob","paymentTerm","shipment","toAddress","tax1","tax2","dpTax3","taxable","inclusiveTax","subTotal","cashDiscPercent","cashDiscount","tax1Rate","tax2Rate","percentTaxable","transactionCurrency","openingBalance","comment","attachments","taxReceipt","taxReturn","taxOwing","exchangeInvoice","exchangeInvoiceNumber","invoiceDp","downPaymentUsed","availableDownPayment","orderDownPayment","usedProjectContractor","customerHasProjectContractor","projectContractor","projectAmount","visibleRemainingProjectAmount","remainingProjectAmount","contactInfo","retailWpType","retailWpNumber","retailWpName","retailIdTku","taxDate","taxNumber","documentCode","taxType","documentTransaction","notesIdTax","taxNumberType","outstanding","efakturPdfFilePath","taxAutoNumber","vaNumber","vaNumberObject","subCompObject","subComp","defaultVA","setting","external","epaymentType","epaymentAmount","epaymentStatus","epaymentStatusName","paymentName","expiredDate","epaymentCode","epaymentSetting","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, PO number, shipping, taxes on the down payment, sales-order link and retail buyer identity are not in the ERP.

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
