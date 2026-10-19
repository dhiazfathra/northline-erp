# Penerimaan Penjualan

Module: Penjualan. Accurate: Penjualan > Penerimaan Penjualan (`accurate__customer__sales-receipt`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/sales/receipts.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `9db4af4` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/penerimaan-penjualan.mjs`](../../../../tools/parity/scenarios/penerimaan-penjualan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: an untaxed invoice to NL-T2 Pelanggan A dated 04 Feb 2051, NL-T2 Jasa Konsultasi 1 x 300.000.
2. Receive 300.000 on it into NL-T1 Kas on 05 Feb 2051.
3. Edit the receipt: new description, 250.000.
4. Read Keseluruhan Jurnal for the day.
5. Save a receipt without invoices: rejected.
6. Delete the receipt; read the journal and the list again; delete the invoice.

## Inputs
```json
{
 "invoice": {
  "date": "2051-02-04",
  "description": "NL-P4-SR1 faktur",
  "qty": 1,
  "price": 300000
 },
 "date": "2051-02-05",
 "bank": "NL-T1-1101",
 "customer": "NL-T2-C1",
 "description": "NL-P4-SR1",
 "amount": 300000,
 "edit": {
  "description": "NL-P4-SR1 edit",
  "amount": 250000
 },
 "reject": {
  "description": "NL-P4-SR1 tanpa faktur"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | NL-T1-1101.2051.02.nnnnn | NL-T1-1101.2051.02.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","05 Feb 2051","No. Trans #",":","NL-T1-1101.2051.02.nnnnn"],["Tipe Transaksi",":","Penerimaan Penjualan","Deskripsi",":","NL-P4-SR1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1101","NL-T1 Kas","250.000","0"],["110301","Piutang Usaha IDR","0","250.000"],["250.000","250.000"]] | [["Tanggal",":","05 Feb 2051","No. Trans #",":","NL-T1-1101.2051.02.nnnnn"],["Tipe Transaksi",":","Penerimaan Penjualan","Deskripsi",":","NL-P4-SR1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1101","NL-T1 Kas","250.000","0"],["110301","Piutang Usaha IDR","0","250.000"],["250.000","250.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","bank":"none","paymentMethod":"CASH_OTHER","branch":"Kantor Pusat"} | {"date":"required","bank":"required","paymentMethod":"cash unless a cheque is sent","branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["equivalentAmount","overPay","voidCheq","useCredit","returnOverpay","fiscalPayment","reconciled","reconcileDate","comment","djpRate","existingCredit","attachments","uniqueNumberPayment","cashierEmployeeName","bankJournalDetail","unreconciledProcess","bankStatement","external","epaymentAmount","epaymentCode","epaymentType","epaymentStatus","epaymentStatusName","custom fields (charField1-10, numericField1-10, dateField1-2)"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date, the payment method and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, void-cheque, reconciliation, fiscal-payment, credit and overpay-return flags, cashier and e-payment state are not in the ERP.

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
