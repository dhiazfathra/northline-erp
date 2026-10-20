# Uang Muka Pembelian

Module: Pembelian. Accurate: Pembelian > Uang Muka Pembelian (`accurate__vendor__purchase-downpayment`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/purchases/down-payments.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `0937628` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/uang-muka-pembelian.mjs`](../../../../tools/parity/scenarios/uang-muka-pembelian.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create an untaxed down payment to NL-T3 Pemasok A, 300.000 to 110302, bill NL-P4-PDP1, dated 12 Mar 2051.
2. Edit it: new description, 330.000.
3. Read Keseluruhan Jurnal for the day.
4. Save a down payment of 0: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-03-12",
 "vendor": "NL-T3-V1",
 "bill": "NL-P4-PDP1",
 "dpAccount": "110302",
 "description": "NL-P4-PDP1",
 "amount": 300000,
 "edit": {
  "description": "NL-P4-PDP1 edit",
  "amount": 330000
 },
 "reject": {
  "description": "NL-P4-PDP1 nol",
  "bill": "NL-P4-PDP1-X",
  "amount": 0
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | PI.2051.03.nnnnn | PI.2051.03.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","12 Mar 2051","No. Trans #",":","PI.2051.03.nnnnn"],["Tipe Transaksi",":","Uang Muka Pembelian","Deskripsi",":","NL-P4-PDP1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110302","Uang Muka Pembelian IDR","330.000","0"],["210101","Hutang Usaha IDR","0","330.000"],["330.000","330.000"]] | [["Tanggal",":","12 Mar 2051","No. Trans #",":","PI.2051.03.nnnnn"],["Tipe Transaksi",":","Uang Muka Pembelian","Deskripsi",":","NL-P4-PDP1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110302","Uang Muka Pembelian IDR","330.000","0"],["210101","Hutang Usaha IDR","0","330.000"],["330.000","330.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Uang muka harus lebih besar dari nol | Uang muka harus lebih besar dari nol | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","taxable":false,"branch":"Kantor Pusat"} | {"date":"required","taxable":false,"branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["poNumber","vendorBankAccount","rate","fiscalRate","fob","paymentTerm","shipment","toAddress","tax1","tax2","dpTax3","taxable","inclusiveTax","subTotal","cashDiscPercent","cashDiscount","tax1Rate","tax2Rate","percentTaxable","transactionCurrency","openingBalance","comment","attachments","taxPayment","taxReturn","taxOwing","invoiceDp","downPaymentUsed","availableDownPayment","orderDownPayment","taxDate","taxNumber","documentCode","vendorTaxType","documentTransaction","passConfirmOverDownPayment","outstanding","useBillNumber","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: see the list; attachments, comments, custom fields, PO number, shipping, payment term, taxes on the down payment and print state are not in the ERP.

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
