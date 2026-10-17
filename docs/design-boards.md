# Design boards (claude.ai/design project `31b518e2…`)

Transcribed from `Flow Boards.dc.html` and `Changes Board.dc.html`. These describe what the
(truncated) v30 script implemented. `spec` = backed by a spec file; `proposal` = designer's inference.

## Flow boards (fixture walkthroughs, each ends on the report that proves it)

### S0 · Manual journal to trial balance
1. Jurnal Umum · Data Baru — JV.2026.10.00001 setoran modal: Dr 1101 Bank Uji 10,000,000 / Cr 3001 Modal Uji 10,000,000
2. Jurnal Umum — JV.00002 bayar sewa: Dr 6001 / Cr 1101 2,000,000 · JV.00003 pendapatan jasa: Dr 1101 / Cr 4001 5,000,000
3. Jurnal Umum · error — unbalanced probe P1 blocked: Debit 1,000,000 / Kredit 900,000 → "tidak seimbang"
4. Jurnal Umum — JV.00004 multi-line, totals 1,500,000 / 1,500,000: Dr 6001 1,000,000 · Dr 1102 500,000 · Cr 1101 1,500,000
5. Neraca Percobaan (S0 alone): 1101 Debit 11,500,000 · 6001 Debit 3,000,000 · 3001 Kredit 10,000,000 · 4001 Kredit 5,000,000

### S1 · Order to cash with PPN
1. Penyesuaian Persediaan IA.2026.10.00002 · Barang A 5 @ 120,000: Dr 110401 600,000 / Cr 300001 600,000
2. Faktur Penjualan SI.2026.10.00001 · 5 × 200,000, diskon 10%: Sub Total 900,000 · Diskon (45,000) · PPN 11% 94,050 · Total 949,050
3. SI journal (revenue gross, discounts on own accounts): Dr 110301 Piutang 949,050 · Dr 400004 100,000 / Dr 440101 45,000 · Cr 400001 1,000,000 / Cr 210201 94,050 · Dr 510101 / Cr 110401 600,000
4. Penerimaan Penjualan 1101.2026.10.00001 settles SI.00001: Bayar 949,050 → Lunas
5. Laba/Rugi (Standar) S1 share: Penjualan 1,000,000 · Diskon Penjualan (100,000) · Diskon Penjualan IDR (45,000) · Beban Pokok Penjualan 600,000

### S3 · Inventory buy > sell > COGS (FIFO)
1. Penyesuaian Persediaan IA.2026.10.00001 · Barang B 5 @ 120,000: Dr 110401 / Cr 300001 600,000
2. Faktur Pembelian PI.2026.10.00002 · 5 @ 150,000: Dr 110401 / Cr 210101 Utang 750,000 → Belum Lunas
3. Faktur Penjualan SI.2026.10.00002 · 7 @ 200,000, no tax code: Dr 110301 / Cr 400001 1,400,000 · COGS 5 × 120,000 + 2 × 150,000 = 900,000
4. Barang & Jasa remaining layer: Barang B 3 @ 150,000 · 110401 Saldo 450,000
5. Laba/Rugi + TB (S0+S1+S3): BPP 1,500,000 · Laba Kotor 5,755,000 · Laba Bersih 2,755,000 · TB 19,444,050 = 19,444,050

### S4 · Sales down payment applied to invoice
1. Uang Muka Penjualan SI.2026.10.00003 (tax inclusive): DPP 1,000,000 · PPN 110,000 · Dr 110301 / Cr 210102 + 210201 1,110,000
2. Penerimaan Penjualan 1101.2026.10.00003 settles the down payment: Dr 1101 / Cr 110301 1,110,000
3. Faktur Penjualan SI.2026.10.00004 · 2 × Jasa 1,000,000, Uang Muka applied: Sub Total 2,000,000 · PPN 220,000 · Uang Muka (1,110,000) · Terhutang 1,110,000
4. Akun Perkiraan after S4: 210102 0 · 210201 PPN Keluaran 314,050 · 400001 Penjualan 4,400,000 · Laba Bersih (S0–S4) 4,755,000

## Changes board

### Shell / tabs
- spec: Dashboard tab fixed, no close control
- spec: each screen and opened record gets its own closable tab; reopening focuses the existing tab
- proposal: dirty-tab marker "● edit"; confirm "Tutup tab tanpa menyimpan?" before closing a dirty tab

### Module launcher
- spec: module list matches the 10 rail icons; **Manufaktur replaces Aset Tetap module**
- spec: tile names trimmed to the menu tree (no Tukar Faktur, Klaim, Departemen, Proyek…)
- spec: hidden tiles disabled with dashed border, lock icon and the required Preferensi switch
- proposal: Mata Uang, Anggaran, Aset Tetap tiles placed under a module

### Report list
- spec: 16 report groups (Memorize … Lain-lain)
- spec: empty category state "Belum ada laporan di kategori ini"
- spec: no-search-results state with "Hapus pencarian"

### Report viewer (P&L) and dashboard
- spec: P&L in IDR from fixtures; Laba Bersih -6,870,000 (S0–S8; includes 11,750,000 asset disposal loss)
- spec: parent rows = sum of children (Pendapatan Operasional 7,300,000)
- spec: drill-down on leaf amounts lists the fixture journal lines (SI/JV numbers)
- spec: no non-operating placeholder section
- spec: dashboard tiles: Pendapatan 7,255,000 · Piutang jatuh tempo 1,400,000 · Laba Kotor 5,755,000 · Utang 750,000
- proposal: month-over-month deltas shown as "—"

### Report viewer · Neraca & Arus Kas
- spec: Neraca (Standar): Aset 17,284,050 = Liabilitas 954,050 + Ekuitas 16,330,000 (incl. Laba Tahun Berjalan -6,870,000)
- spec: Arus Kas: operasi 4,514,050 + pendanaan 10,000,000 = kas akhir 14,514,050 (Bank Uji + Kas Kecil + Bank USD)
- spec: inventory adjustment to Ekuitas Saldo Awal (1,200,000) excluded from cash, disclosed as non-cash
- spec: Neraca Percobaan reachable from Daftar Laporan > Buku Besar

### Part B · List archetype
- spec: Akun Perkiraan seeded from fixture balances; parents = sum of children; contra shown with "-"
- spec: Jurnal Umum list: journals newest first, system journals tagged with source type
- spec: search "Ketik dan [Enter]" runs on Enter; row count in header
- spec: page size 20 with "Muat 20 berikutnya" + infinite scroll (load next 20 when list end is visible); per-tab search
- proposal: JV.00006–00011 for system journals; 300001 named "Ekuitas Saldo Awal"

### Part B · Document form (Jurnal Umum)
- spec: right action rail: Simpan (disabled until dirty, Ctrl+S), Cetak, Lampiran, Hapus, Lainnya
- spec: unbalanced: "Selisih" indicator + blocking "Jurnal yang anda masukkan tidak seimbang antara debit dengan kredit"
- spec: one side per line enforced
- spec: toast: Jurnal Umum "JV…" berhasil disimpan
- spec: line editor modal "Detail Akun" with Detail Akun / Info Lainnya tabs, Debit/Kredit radio, Lanjut
- proposal: "Nilai harus diisi" on empty amount

### Part B · Transactions
- spec: Faktur Penjualan: Info lainnya (Diskon, Kena Pajak, Total termasuk Pajak, Syarat Pembayaran, No. PO); footer Sub Total / Diskon / PPN 11% / Total
- spec: Faktur Penjualan list: SI.00001 Lunas 949,050 · SI.00002 Belum Lunas 1,400,000 (plus later S4/S5/S8 invoices)
- spec: Uang Muka panel: SI.2026.10.00003 (1,000,000 + 110,000 = 1,110,000) applied by checkbox; footer adds Uang Muka and Terhutang
- spec: Faktur Pembelian: PI.00002 750,000, purchase-price seed, required No Faktur #
- spec: Penerimaan / Pembayaran: open-invoice lines, Bayar, Diskon, Dipotong PPh checkbox, net Pembayaran, footer
- spec: "Nilai Pembayaran tidak mencukupi untuk melunasi pembayaran!" on save
- spec: PPh 23 at 4% of DPP (vendor without NPWP): 40,000 on PI.2026.10.00001
- spec: Retur Pembelian: Retur dari, Faktur lookup, Ambil pulls bill lines
- spec: auto-number = max existing + 1 per series
- spec: account lookup limited to the fixture leaf accounts, searchable, Enter selects

### Part B · Master data, feedback, reports, settings
- spec: Pelanggan, Pemasok, Barang & Jasa, Pajak seeded from fixtures; Akun Perkiraan bank panel only for Kas & Bank
- proposal: customer/vendor IDs C.00003, V.00001–3
- spec: problem dialog "Terjadi Permasalahan pada Pemrosesan" with item list, Salin, OK; required fields → "<Label> harus diisi"
- proposal: toast variants success / error / background save "Menyimpan di latar belakang…"
- spec: delete confirm "Apakah Anda yakin akan melakukan penghapusan data: <number>" + "<Doc> "<number>" berhasil dihapus"
- spec: Neraca Percobaan grouped Saldo Awal / Perubahan / Saldo Akhir, leaf-only closing totals 35,304,050; period from 01 Sep 2026 so S7 asset entries are included
- proposal: balanced indicator on trial balance
- spec: Rekonsiliasi Bank: bank pick + Refresh hint, JURNAL ACCURATE vs REKENING BANK, "Ada di Rekening Koran" with Konfirmasi, "N data belum cocok" counting to 0
- proposal: reconciliation 8 rows / 12,464,050
- spec: Proses Akhir Bulan: Bulan/Tahun, Nilai Tukar table, early-month warning + Lanjutkan, toast, resulting JV.2026.10.00024
- spec: Preferensi: vertical tabs, Fitur switches, locked switches, account defaults, one-way warning dialog
- spec: status badges Belum Lunas / Lunas with icon + text; proposal: "Terbayar Sebagian"

### Fixtures S2, S5–S8
- S2: PI.2026.10.00001 (1,000,000 + PPN 110,000) paid by 1101.2026.10.00002 for 1,070,000 after PPh 23 40,000
- S5: SI.2026.10.00005 USD 100 @ 15,000, received @ 15,500, realised gain 50,000 on 720102
- S6: bank charge 1101.2026.10.00004 25,000 to 6001
- S7: Laptop Uji 12,000,000, September depreciation 250,000, disposal loss 11,750,000 (JV.2026.09.00001–3)
- S8: PRT.2026.10.00001 150,000; SI.2026.10.00006 200,000 returned by SRT.2026.10.00001
- S8: deleting a paid invoice: "Tidak dapat menghapus faktur … sudah ada pembayarannya"
- proposal: JV.00015–00022 and JV.2026.09.00001–3 for system journals
- excluded: S7 October revaluation (dated 31/10, after today) and the deleted S8 journal JV.00025

### Open items (98-gap-notes.md)
- not designed: multi-entity/consolidation, tax-inclusive invoice rounding, opening balances, year-end close, month reopen
- bank statement import not available; manual match only
- sales returns, quotes/orders, delivery, goods receipt: screens shown without fixture data
- next (names only): Manufaktur screens, Payroll, e-Faktur submission
