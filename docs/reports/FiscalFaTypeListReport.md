# Daftar Kategori Aset Tetap Pajak (`FiscalFaTypeListReport`)

Group: Aset Tetap. Verified against [`captures/FiscalFaTypeListReport.json`](captures/FiscalFaTypeListReport.json) with the sandbox master data as input ([`fixtures/master-lists.json`](fixtures/master-lists.json)). ERP: `apps/api/src/master/lists.ts`; test: `apps/api/test/master-lists.test.ts`.

Columns `Nama` | `Tarif Penyusutan (%)` | `Perkiraan Umur (tahun)` | `Metode Penyusutan`. The rate is derived: 100 ÷ life (garis lurus) or 200 ÷ life (saldo menurun), decimal comma (`12,5 %`); non-depreciating categories print `0 %`, `0 Tahun`, `Tidak Terdepresiasi`.
