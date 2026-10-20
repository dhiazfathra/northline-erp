# Proses Akhir Bulan

Module: Perusahaan. Accurate: Perusahaan > Proses Akhir Bulan (`accurate__company__period-end`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/period-ends.

**Verdict:** accepted divergence (ADR-0042, ADR-0045)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `9db4af4` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/proses-akhir-bulan.mjs`](../../../../tools/parity/scenarios/proses-akhir-bulan.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Run Proses Akhir Bulan for Februari 2051 (28 Feb 2051) with the form's options (gain/loss, depreciation, manufacture).
2. Edit it: new description.
3. Read Keseluruhan Jurnal for the day.
4. Save one without a month: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-02-28",
 "year": 2051,
 "month": 2,
 "period": "2051-02",
 "description": "NL-P4-PE1",
 "edit": {
  "description": "NL-P4-PE1 edit"
 },
 "reject": {
  "description": "NL-P4-PE1 tanpa bulan"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | Februari 2051 | Februari 2051 | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","28 Feb 2051","No. Trans #",":","Februari 2051"],["Tipe Transaksi",":","Proses Akhir Bulan","Deskripsi",":","Proses Akhir Bulan (Februari, 2051)"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["110303","Piutang Usaha USD","0","3.080.000"],["110303","Piutang Usaha USD","3.200.000","0"],["720202","Laba/Rugi Belum Terealisasi USD","0","120.000"],["ZZ-R01-1201","ZZ-R01-Bank USD Uji","0","1.540.000"],["ZZ-R01-1201","ZZ-R01-Bank USD Uji","1.600.000","0"],["720202","Laba/Rugi Belum Terealisasi USD","0","60.000"],["ZZ-R03-1202","ZZ-R03-Bank USD Uji 2","0","1.540.000"],["ZZ-R03-1202","ZZ-R03-Bank USD Uji 2","1.600.000","0"],["720202","Laba/Rugi Belum Terealisasi USD","0","60.000"],["6.400.000","6.400.000"]] | [["Tanggal",":","28 Feb 2051","No. Trans #",":","Februari 2051"],["Tipe Transaksi",":","Proses Akhir Bulan (Penyusutan)","Deskripsi",":","Proses Akhir Bulan (Februari, 2051)"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600024","Beban Penyusutan Inventaris Kantor","1.216.666,66","0"],["12000604","Akumulasi Penyusutan Inventaris Kantor","0","1.216.666,66"],["1.216.666,66","1.216.666,66"]] | no |
| rejected save | false | false | yes |
| validation message | Bulan harus diisi | Bulan harus diisi | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","month":"0","modules":"ALL_MODULE","gainLoss":true,"depreciation":true,"manufacture":true} | {"date":"last day of the period","month":"required","modules":"all","gainLoss":"not run","depreciation":true,"manufacture":"not run"} | no |
| header fields without an ERP counterpart | ["modulesTypeName","gainLoss","manufacture","journalUnRealize","journalDepreciation","journalManufacture"] | [] | no |

## Stopped
Accurate's run for Februari 2051 posts only the unrealized gain/loss revaluation (Piutang Usaha USD and two USD banks against 720202) and no depreciation; the ERP posts depreciation only (fixed-asset-t5's asset, its next unrun month). Revaluation inside Proses Akhir Bulan needs foreign bank accounts (not modelled, ADR-0012) and would add journals to every seeded period end (2034, fixed-asset-t5), whose general-ledger reports are `done`: the stop rule applies. Create, edit (same number), delete, the rejected save ("Bulan harus diisi") and list/search match. See ADR-0042.

## Divergences
- **journal after edit**: not accepted
- **defaults**: D1: the API takes every value explicitly; today's date and the current month are client defaults, not API defaults.
- **header fields without an ERP counterpart**: not accepted

See [ADR-0041](../../../decisions/0041-p4-batch-1-screen-divergences.md) and [ADR-0042](../../../decisions/0042-p4-batch-2-screen-divergences.md). A video of the Accurate run (`accurate.webm`) is kept locally, not committed.

## Evidence
- [run.log](run.log)
- create: [Accurate](accurate-create.png), [ERP](erp-create.png)
- edit: [Accurate](accurate-edit.png), [ERP](erp-edit.png)
- reject: [Accurate](accurate-reject.png), [ERP](erp-reject.png)
- delete: [Accurate](accurate-delete.png), [ERP](erp-delete.png)
- journal: [Accurate](accurate-journal.png), [ERP](erp-journal.png)

ERP screenshots render the API request and response: the web doc screens are still mock data (`apps/web/src/api/docs.ts`).
Accurate screenshots mask the header (Data Usaha name, user menu), any email or IP and the version/session tag; the mask is asserted before each capture.
