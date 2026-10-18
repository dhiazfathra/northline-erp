# Daftar Log Aktifitas (`AuditListReport`)

Group: Lain-lain. **Status: verified** ([ADR-0019](../decisions/0019-activity-log.md), superseding ADR-0010 for this report).
Capture: [`captures/AuditListReport.json`](captures/AuditListReport.json), run with default parameters over the sandbox
demo data. Fixture: [`fixtures/activity-log-a7.json`](fixtures/activity-log-a7.json) (seed NL-A7, 2026-10-19).
ERP: `auditList` / `loadActivity` in `apps/api/src/reports/activity-log.ts`, `GET /api/reports/activity-log?from&to`,
test `apps/api/test/activity-log.test.ts`.

## Parameters

Date parameter kind: `FROMTO`; request param: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`. The range filters on
the **log** day, not the document date. `init-report-input.do` shows no hidden filters on this plan
(`paramSelectionType: NONE`, `filter: []`). `selectedColumn`:

| Column | Field | Type |
|---|---|---|
| No/Nama Referensi | `audit.description` (drill-down to `accurate__company__audit`) | TEXT |
| Tgl Transaksi | `audit.transDate` | DATE |
| Tipe Tindakan | `auditTypeDetail.operationType` | TEXT |
| Tipe Transaksi | `auditTypeDetail.transactionType` | TEXT |
| Tanggal | `audit.logDate` | DATE |
| Pengguna | `userDetail.createdBy` | TEXT |
| Email | `userDetail.email` | TEXT |
| Alamat IP | `audit.accessIp` | TEXT |

The same rows back the Log Aktifitas module (`/accurate/company/search-audit.do`), which also returns the hidden
`createDate` (log time to the second), `transactionType` code (`JV`, `SI`, `ACC`, ...) and `transactionId`.

## Layout

Title `Daftar Log Aktifitas`, then `Dari dd Mmm yyyy s/d dd Mmm yyyy`, then the header row; one row per log entry.
Dates print `dd Mmm yyyy` with Indonesian months (`Mei`, `Agt`, `Okt`, `Des`; header dates spell August `Agu`).
Tgl Transaksi is blank for master data. Fixture rows keep all 8 cells, with `''` for a blank cell; Pengguna, Email and
Alamat IP hold the placeholders `nl-tester`, `nl-tester@example.test`, `203.0.113.10` on both sides.

Capture gotcha: the HTML (and xlsx) is a Jasper page grid. A record can split across a page break (the tail lands on the
next page as a row without an action cell) and both halves carry hard line breaks where the text wrapped. `report.mjs`
reads the xlsx export, merges split records, restores reference/type text from `search-audit.do`, and replaces the three
identity columns inside the runner; identity text never reaches its caller.

## Rules (sandbox, 2026-10-18/19)

1. **Order**: newest first by the hidden log time. Within one second 80 of 81 tied groups run by id descending; the one
   exception has ids out of time order (pooled id blocks), so the key is the log time at full precision. The time of day
   is not printed; Tanggal is the log day.
2. **Time zone**: Asia/Jakarta. A JV saved at 23:59:48 WIB logs on 18 Okt 2026, one saved at 00:00:12 WIB on 19 Okt.
3. **What logs**: every successful create (`Buat`), edit (`Ubah`) and delete (`Hapus`) of documents and master data,
   including background saves (`bg-save-*`) and the month-end process (`Proses Akhir Bulan`, reference `Januari 2037`,
   Tgl Transaksi the month end). Preference changes log `Preferensi` with reference `-`.
   **Nothing** logs for rejected saves (unbalanced JV, validation errors, a malformed edit), report runs or logins.
   Printing was not exercised.
4. **Edit**: one row per save, not per field. Saving without a real change (account "edit code" to the same number) still
   logs `Ubah`.
5. **Snapshots**: reference and Tgl Transaksi are taken when the row is written. Renumbering and redating a JV or an
   invoice prints the new number/date on that edit row and on the delete row; earlier rows keep the old values.
6. **Delete**: the reference is the number (or name) the record had when deleted.
7. **Reference text**: documents print their number (bank documents: the bank number, e.g. `NL-T1-1101.2037.02.00001`;
   Uang Muka Penjualan: the invoice number). Master data prints the **name**, not the code: account `NL-T1 Beban`
   (no. `NL-T1-6001`), customer `NL-T19 Pelanggan PKP` (no. `NL-T19-C1`), item `NL-T33 Barang Serial` (no. `NL-T33-SN`).
   SPT PPN prints its period code with a blank Tgl Transaksi.
8. **Multi-row saves**: a customer save writes `Kontak` then `Pelanggan` (Pelanggan prints on top); a customer delete
   writes `Pelanggan` then `Kontak`. Creating a cash/bank account also logs `Penomoran` under the account name; an asset
   life edit (`Perubahan Aset Tetap`) also logs `Aset Tetap` `Ubah`. An expense account, an item and an invoice write
   one row each.

Transaction types seen (code → Tipe Transaksi): JV Jurnal Umum, SI Faktur Penjualan, SPY Penerimaan Penjualan, PI Faktur
Pembelian, PPY Pembayaran Pembelian, IA Penyesuaian Persediaan, FAA Aset Tetap, FAD Disposisi Aset Tetap, FAE Perubahan
Aset Tetap, PEU Proses Akhir Bulan, SRT Retur Penjualan, PRT Retur Pembelian, PAY Pembayaran, DEP Penerimaan, SID Uang
Muka Penjualan, PID Uang Muka Pembelian, RI Penerimaan Barang, PO Pesanan Pembelian, PR Permintaan Barang, SO Pesanan
Penjualan, DO Pengiriman Pesanan, IT Pemindahan Barang, EXP Pencatatan Beban, VPA Harga Pemasok, SPA Penyesuaian
Harga/Diskon, EXI Tukar Faktur, EPL Pinjaman Karyawan; masters ACC Akun Perkiraan, ANT Penomoran, ITM Barang & Jasa,
PRL Desain Cetakan, CTC Kontak, CST Pelanggan, VDR Pemasok, PRF Preferensi, ACT Kategori Aset, TAX Pajak, RPT Laporan
Tersimpan, CUR Mata Uang, TRM Syarat Pembayaran, WHS Gudang, EMP Karyawan, ST Target Penjualan, PPN SPT PPN/PPNBM, ICT
Kategori Barang, UOM Satuan Barang (plus manufacturing types, out of scope).

## Seed NL-A7 (fixture)

In this order, each step a separate save: account `NL-A7-11` "NL-A7 Akun" (expense) create, rename to "… diubah",
delete; customer `NL-A7-C1` "NL-A7 Pelanggan" the same; item `NL-A7-I1` "NL-A7 Barang" (service) the same; JV
`NL-A7-JV1` dated 20/04/2038 create, edit description, renumber to `NL-A7-JV2` and redate 21/04/2038, delete; sales
invoice `NL-A7-SI1` (customer NL-T2-C2, item NL-T2-S1) the same, ending as `NL-A7-SI2`. The fixture keeps the report's
NL-A7 rows for 19 Okt 2026 (20 rows). The ERP test replays the seed through the HTTP API and moves the log day onto the
capture day before rendering.

## Open work

- ERP logs only the verified types: Jurnal Umum, Faktur Penjualan, Akun Perkiraan, Pelanggan + Kontak, Barang & Jasa.
  Other documents and masters (receipts, purchases, assets, period end, vendors, preferences, ...) write no row yet.
- Accounts: Penomoran on cash/bank accounts and account-number changes are not modelled (the ERP keys accounts by number).
- Printing not tested in the sandbox.
