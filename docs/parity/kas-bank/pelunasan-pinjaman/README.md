# Pelunasan Pinjaman

Module: Kas & Bank. Accurate: Kas & Bank > Pelunasan Pinjaman (`accurate__cash-bank__employee-loan-settlement`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/employee-loan-settlements.

**Verdict:** accepted divergence (ADR-0041, ADR-0045) (journal after edit, validation message, defaults, header fields without an ERP counterpart)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `af4c5ca` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pelunasan-pinjaman.mjs`](../../../../tools/parity/scenarios/pelunasan-pinjaman.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: a 300.000 loan to E.00001 dated 13 Jan 2051, disbursed from NL-T1 Kas on 14 Jan 2051.
2. Settle it from NL-T1 Kas on 15 Jan 2051 (the whole balance).
3. Edit the settlement: pay 100.000 in cash (the rest of the balance stays on the penalty income account).
4. Read Keseluruhan Jurnal for the day.
5. Save a settlement without a loan: rejected.
6. Try to delete the settled loan: refused.
7. Delete the settlement; read the journal and the list again; delete the disbursement and the loan.

## Inputs
```json
{
 "loan": {
  "date": "2051-01-13",
  "start": "2051-02-13",
  "description": "NL-P4-LS1 pinjaman",
  "amount": 300000
 },
 "disbursed": "2051-01-14",
 "date": "2051-01-15",
 "bank": "NL-T1-1101",
 "description": "NL-P4-LS1",
 "edit": {
  "amount": 100000
 },
 "reject": {
  "date": "2051-01-15"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | ELS.2051.01.nnnnn | ELS.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| edit | Sisa Angsuran & Penalty tidak boleh kurang dari Jumlah Pokok Dibayarkan | Sisa Angsuran & Penalty tidak boleh kurang dari Jumlah Pokok Dibayarkan | yes |
| journal after edit | [["Tanggal"],["Tipe Transaksi"],[":"],[":"],["15 Jan 2051"],["Pelunasan Pinjaman"],["No. Trans #"],["Deskripsi"],[":"],[":"],["ELS.2051.01.nnnnn"],["Pelunasan Pinjaman EPL.2051.01.nnnnn"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1101","NL-T1 Kas","0","0"],["NL-T1-1201","NL-T1 Peralatan","0","300.000"],["NL-T1-4001","NL-T1 Pendapatan","300.000","0"],["300.000","300.000"]] | [["Tanggal",":","15 Jan 2051","No. Trans #",":","ELS.2051.01.nnnnn"],["Tipe Transaksi",":","Pelunasan Pinjaman","Deskripsi",":","Pelunasan Pinjaman EPL.2051.01.nnnnn"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1201","NL-T1 Peralatan","0","300.000"],["NL-T1-4001","NL-T1 Pendapatan","300.000","0"],["300.000","300.000"]] | no |
| rejected save | false | false | yes |
| validation message | Upsss... Telah terjadi permasalahan pada saat pemrosesan aktivitas Anda. Permasalahan ini sudah kami terima secara otomatis, dan akan segera ditelusuri oleh tim terkait. Kami mohon maaf atas ketidaknyamanan yang terjadi.  Kode Referensi: ersen-369-3bb40f528ef5ddf5092ba8faafee8b3e | Nomor Pinjaman harus diisi | no |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","bank":"none","penalty":0} | {"date":"required","bank":"none","penalty":0} | no |
| header fields without an ERP counterpart | ["loanAmount","paidInstallment","remainingLoan","installmentPenalty","settlementPenaltyAmount","bankJournalDetail","attachments"] | [] | no |
| delete settled loan refused | {"saved":false,"message":"Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pencairan Pinjaman"} | {"saved":false,"message":"Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pencairan Pinjaman"} | yes |

## Divergences
- **journal after edit**: D4: Accurate prints a 0/0 line on the cash/bank account when the cash paid is 0; the ERP posts no zero line. Every other line and amount matches.
- **validation message**: D5: Accurate's client check says "Nomor Pinjaman harus diisi" (the ERP's text); a raw wire without a loan gets a generic server error page.
- **defaults**: D1: the API takes every value explicitly; today's date is a client default, not an API default.
- **header fields without an ERP counterpart**: D2: attachments and the settlement penalty (settlementPenaltyAmount, the loan's penalty income account) are not in the ERP settlement.

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
