# Pencairan Pinjaman

Module: Kas & Bank. Accurate: Kas & Bank > Pencairan Pinjaman (`accurate__cash-bank__employee-loan-disbursement`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/employee-loan-disbursements.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `4604980` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/pencairan-pinjaman.mjs`](../../../../tools/parity/scenarios/pencairan-pinjaman.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Setup: a 300.000 loan to E.00001 dated 13 Jan 2051 (receivable NL-T1-1201).
2. Disburse it from NL-T1 Kas on 14 Jan 2051.
3. Edit the disbursement: new description.
4. Read Keseluruhan Jurnal for the day.
5. Save a disbursement without a loan: rejected.
6. Try to delete the disbursed loan: refused.
7. Delete the disbursement; read the journal and the list again; delete the loan.

## Inputs
```json
{
 "loan": {
  "date": "2051-01-13",
  "start": "2051-02-13",
  "description": "NL-P4-LD1 pinjaman",
  "amount": 300000
 },
 "date": "2051-01-14",
 "bank": "NL-T1-1101",
 "description": "NL-P4-LD1",
 "edit": {
  "description": "NL-P4-LD1 edit"
 },
 "reject": {
  "description": "NL-P4-LD1 tanpa pinjaman"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | ELD.2051.01.nnnnn | ELD.2051.01.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","14 Jan 2051","No. Trans #",":","ELD.2051.01.nnnnn"],["Tipe Transaksi",":","Pencairan Pinjaman","Deskripsi",":","NL-P4-LD1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1201","NL-T1 Peralatan","300.000","0"],["NL-T1-1101","NL-T1 Kas","0","300.000"],["300.000","300.000"]] | [["Tanggal",":","14 Jan 2051","No. Trans #",":","ELD.2051.01.nnnnn"],["Tipe Transaksi",":","Pencairan Pinjaman","Deskripsi",":","NL-P4-LD1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["NL-T1-1201","NL-T1 Peralatan","300.000","0"],["NL-T1-1101","NL-T1 Kas","0","300.000"],["300.000","300.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Nomor Pinjaman harus diisi | Nomor Pinjaman harus diisi | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","bank":"none"} | {"date":"required","bank":"none"} | no |
| header fields without an ERP counterpart | ["bankJournalDetail","attachments"] | [] | no |
| delete disbursed loan refused | {"saved":false,"message":"Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pencairan Pinjaman"} | {"saved":false,"message":"Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pencairan Pinjaman"} | yes |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date is a client default, not an API default.
- **header fields without an ERP counterpart**: D2: attachments are not in the ERP.

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
