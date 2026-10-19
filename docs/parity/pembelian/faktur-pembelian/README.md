# Faktur Pembelian

Module: Pembelian. Accurate: Pembelian > Faktur Pembelian (`accurate__vendor__purchase-invoice`), Manufaktur Demo. ERP: POST/PUT/DELETE /api/purchases/invoices.

**Verdict:** accepted divergence (ADR-0041) (defaults, header fields without an ERP counterpart)

Date: 2026-10-19. Commit: `<commit-sha>` (placeholder, filled in at commit; run on `9db4af4` plus the batch's uncommitted fixes).
Script: [`tools/parity/scenarios/faktur-pembelian.mjs`](../../../../tools/parity/scenarios/faktur-pembelian.mjs), runner `tools/parity/run.mjs`.

## Scenario
1. Create an untaxed purchase invoice from NL-T3 Pemasok A, bill NL-P4-PI1: NL-T2 Jasa Konsultasi 2 x 50.000, dated 03 Feb 2051.
2. Edit it: new description, quantity 3.
3. Read Keseluruhan Jurnal for the day.
4. Save an invoice without lines: rejected.
5. Delete it; read the journal and the list again.

## Inputs
```json
{
 "date": "2051-02-03",
 "vendor": "NL-T3-V1",
 "bill": "NL-P4-PI1",
 "description": "NL-P4-PI1",
 "lines": [
  {
   "item": "NL-T2-S1",
   "name": "NL-T2 Jasa Konsultasi",
   "qty": 2,
   "price": 50000
  }
 ],
 "edit": {
  "description": "NL-P4-PI1 edit",
  "qty": 3
 },
 "reject": {
  "bill": "NL-P4-PI1-X",
  "description": "NL-P4-PI1 tanpa rincian"
 }
}
```

## Accurate vs ERP
| Aspect | Accurate | ERP | Same |
|---|---|---|---|
| numbering | PI.2051.02.nnnnn | PI.2051.02.nnnnn | yes |
| number kept on edit | true | true | yes |
| journal after edit | [["Tanggal",":","03 Feb 2051","No. Trans #",":","PI.2051.02.nnnnn"],["Tipe Transaksi",":","Faktur Pembelian","Deskripsi",":","NL-P4-PI1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600020","Beban Operasional Lainnya","150.000","0"],["210101","Hutang Usaha IDR","0","150.000"],["150.000","150.000"]] | [["Tanggal",":","03 Feb 2051","No. Trans #",":","PI.2051.02.nnnnn"],["Tipe Transaksi",":","Faktur Pembelian","Deskripsi",":","NL-P4-PI1 edit"],["Kode Perkiraan","Nama Perkiraan","Debit","Kredit"],["600020","Beban Operasional Lainnya","150.000","0"],["210101","Hutang Usaha IDR","0","150.000"],["150.000","150.000"]] | yes |
| rejected save | false | false | yes |
| validation message | Detail dari transaksi belum diisi! | Detail dari transaksi belum diisi! | yes |
| delete | true | true | yes |
| journal after delete | [] | [] | yes |
| list/search after create | true | true | yes |
| list/search after delete | false | false | yes |
| defaults | {"date":"today","taxable":false,"branch":"Kantor Pusat"} | {"date":"required","taxable":false,"branch":"none (no branch)"} | no |
| header fields without an ERP counterpart | ["_param"] | [] | no |

## Divergences
- **defaults**: D1: the API takes every value explicitly; today's date and the default branch are client defaults, not API defaults.
- **header fields without an ERP counterpart**: D2: attachments, comments, custom fields, shipping (FOB, ship via, address, ship date), the vendor bank account, recurring, opening-balance and amortization flags, project and print state are not in the ERP.

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
