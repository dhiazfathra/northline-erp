# Pembayaran Angsuran

Module: Kas & Bank. Accurate: Kas & Bank > Pembayaran Angsuran (`accurate__cash-bank__employee-loan-installment`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/employee-loan-installments.

**Verdict:** accepted divergence (ADR-0041, ADR-0045) (create/edit/delete on 2051 data, list/search after delete)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `af4c5ca` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pembayaran-angsuran.mjs`](../../../../tools/parity/scenarios/pembayaran-angsuran.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: a 300.000 loan to E.00001 dated 13 Jan 2051, disbursed 14 Jan 2051.
2. Accurate: open a new form, look the loan up (empty: no installment is due by today).
3. ERP: pay 100.000 of it on 15 Mar 2051; edit to 120.000; save without a loan rejected; delete; journal and list; delete the disbursement and the loan.

## Inputs
```json
{
 "loan": {
  "date": "2051-01-13",
  "start": "2051-02-13",
  "description": "NL-P4-LI1 pinjaman",
  "amount": 300000
 },
 "disbursed": "2051-01-14",
 "date": "2051-03-15",
 "bank": "NL-T1-1101",
 "amount": 100000,
 "description": "NL-P4-LI1",
 "edit": {
  "amount": 120000
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| create/edit/delete on 2051 data | not possible: the loan lookup lists installments due by today's server date; 0 rows for keywords [0,0,0,0] | numbering ELI.2051.03.00001, edit saved, reject "Nomor Pinjaman harus diisi", delete true, journal after edit [["Tanggal",":","15 Mar 2051","No. Trans #",":","ELI.2051.03.00001"],["Tipe Transaksi",":","Pembayaran Angsuran","Deskripsi",":","NL-P4-LI1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1101","NL-T1 Kas","120.000","0"],["NL-T1-1201","NL-T1 Peralatan","0","120.000"],["120.000","120.000"]] | no |
| list/search after delete | n/a | false | no |

## Divergences
- **create/edit/delete on 2051 data**: D6: the Accurate form can only be filled with installments due by today; a 2051 loan has none, and posting a 2026 loan is outside the 2051 sandbox rule. The ERP behaves as Pelunasan Pinjaman (Dr bank / Cr Piutang Karyawan) with the amount paid; unverified against Accurate (ADR-0045).
- **list/search after delete**: D6: see above.

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
