# Goal: Log Aktifitas exactly as Accurate

Paste the block below as a `/goal`. It brings `AuditListReport` (Daftar Log Aktifitas) into scope and reproduces
Accurate's activity log at zero diff.

---

```
/documentation-and-adrs @handoff-2.md Implement Accurate's activity log (Log Aktifitas) in the ERP, matching Accurate exactly, and verify Daftar Log Aktifitas (`AuditListReport`) at zero diff.

## Guardrails
- Read ACCURATE_USER, ACCURATE_PASS, SANDBOX_DB_NAME from .env only. Never log, print, screenshot, or commit them.
- This report prints the login user, email and IP address. They are secrets and personal data: every capture goes through `report.mjs` (rows scrubbed by `red`). Fixtures store only placeholder users created for the test (e.g. `nl-tester`, `nl-tester@example.test`, `203.0.113.10`), never the real login, email or IP. Run the secret scan on the staged diff before every commit.
- Log in at https://account.accurate.id/ and open only the Data Usaha named exactly SANDBOX_DB_NAME. Free to create/edit/delete inside it.
- Before every browser action, assert the active Data Usaha == SANDBOX_DB_NAME. If not, or unclear, abort. Never touch any other Data Usaha.

## Scope
- Write an ADR that supersedes ADR-0010 for `AuditListReport` only (user/access reports stay out of scope).
- Accurate is the source of truth: define the report first, then work back to what writes each log row.

## What is already known (captures/AuditListReport.json, 2026-10-18)
- Params: `startDate` / `endDate` (dd/MM/yyyy). The window filters on the **log date** (when the action happened), not the document date. A 2026 window lists JV.2032.03.00003 because it was created on 18 Okt 2026.
- Columns: `No/Nama Referensi | Tgl Transaksi | Tipe Tindakan | Tipe Transaksi | Tanggal | Pengguna | Email | Alamat IP`.
- Transaction rows have 8 cells (document number, document date, action, document type, log date, user, email, IP).
- Master-data rows have 7 cells: no Tgl Transaksi, and the reference is the record's name or code (e.g. `NL-T1 Beban`, `Akun Perkiraan`).
- Tipe Tindakan values seen: `Buat`, `Ubah`, `Hapus`.
- Tipe Transaksi values seen:
  - documents: Jurnal Umum, Faktur Penjualan, Penerimaan Penjualan, Faktur Pembelian, Pembayaran Pembelian, Penyesuaian Persediaan, Aset Tetap, Disposisi Aset Tetap, Proses Akhir Bulan, Retur Penjualan, Retur Pembelian, Pembayaran, Uang Muka Penjualan
  - master data: Akun Perkiraan, Penomoran, Barang & Jasa, Desain Cetakan, Kontak, Pelanggan, Pemasok, Preferensi, Kategori Aset, Pajak, Laporan Tersimpan, Mata Uang, Syarat Pembayaran
- Rows look newest first. Confirm the order, with ties, within one second.
- Dates print `dd Mmm yyyy` with Indonesian months (`Okt`, `Des`). Page headers repeat on every page; strip them in fixtures.

## Exploration (record each answer in docs/reports/AuditListReport.md)
1. Exact sort order and tie-break. Does the time of day matter, is it hidden, and does it come from the log?
2. Which actions log which rows: create, edit, delete for each document and master type. Do failed or rejected saves log? Do background jobs (bg-save, period end), report runs, printing, login and preference changes log?
3. What an edit logs (one row per save, or per field). What a delete logs (reference after deletion). Does an edit that changes a document's number or date show the old or the new value?
4. Reference text per master type (code, name, or "code name"). Which types print an empty Tgl Transaksi.
5. Whether the report has hidden filters (user, transaction type) in `init-report-input.do` for this plan; capture `selectedColumn` too.
6. Timezone of the log date (Asia/Jakarta), checked across midnight.

## Verification loop
Seed identical actions in the sandbox and the ERP (create, edit and delete a JV, a sales invoice, a customer, an item and an account), produce the report in both, diff, fix, repeat until zero diff. Save fixtures (placeholder user/email/IP substituted on both sides) and tests.

## ERP design (Hono/Bun, Postgres/Drizzle; ADR for the design)
- An activity log written in the same transaction as each command: actor (user id), action (CREATE/UPDATE/DELETE), entity type, reference, document date, timestamp, client IP. Commands carry the actor and IP from the authenticated request (httpOnly session).
- Event-sourced aggregates (Journal, Period, Account) log from command metadata. Master-data tables keep `audit_log` for row history; the activity log is the user-facing view.
- Append-only: triggers block UPDATE/DELETE on the activity log.
- Report function `auditList(rows, from, to)` returns Accurate's rows exactly; a loader and an `/api` endpoint expose it.

## Deliverables
- ADR (scope change + design), `docs/reports/AuditListReport.md` with the rules above, fixture, zero-diff test.
- Commit small and push to main after each verified step (personal repo).
```
