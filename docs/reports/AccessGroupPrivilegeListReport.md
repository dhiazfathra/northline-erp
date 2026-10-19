# Daftar Akses Grup (`AccessGroupPrivilegeListReport`)

Group: Lain-lain. **Status: verified** on Manufaktur Demo (P3.4), no-member layout only.
Capture: [`captures/AccessGroupPrivilegeListReport.json`](captures/AccessGroupPrivilegeListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Nama | : | Pengguna | :`

## Seeding (2026-10-19)

Manufaktur Demo has one user, the Administrator; inviting users is outward-facing and was not done, and no branch was
created. Seeded: Akses Grup **NL-AG49 Grup Gudang** (`/accurate/company/save-access-privilege.do`, body captured from the
form's own Simpan with the request aborted, then posted with the name set): no members, Pembatasan Akses = Preferensi,
Senin-Jumat; grants Kategori Pelanggan Buat/Ubah/Hapus, Gudang Buat/Ubah, Histori Stok Barang Aktif; every report and
widget unchecked. A `work_order` view grant was stored but prints no row (the menu catalog has no Perintah Kerja line).
Fixture: [`fixtures/access-m49.json`](fixtures/access-m49.json); test: `apps/api/test/access.test.ts`.

## Calculation rules

- Per group (by name): `Nama : <group> Pengguna : <members>`, `Pembatasan Akses : Senin-Jumat, 00.00 - 23.59`, the `Hak Akses | Aktif | Buat | Ubah | Hapus | Lihat` header, then all 466 privilege rows of Accurate's catalog under their headings (Perusahaan > Akses Menu ... Laporan > Keuangan ...). A cell is `-` where the action does not apply, else `YA`/`TIDAK`. Reports and widgets have only Lihat. Accurate repeats the group header at the top of every page (14 pages); the ERP prints it once. No groups: one empty header block. The catalog (labels, applicable actions, keys) is `apps/api/src/access/privilege-catalog.json`, extracted from this capture: report rows are keyed by planId, widgets by widgetKey, the three granted rows by Accurate's key (`customer_category`, `warehouse`, `item_history`), the rest by a section.label slug (Accurate's other keys were not mapped).

ERP: `GET /api/reports/access/group-privileges`; data `access_groups` + `access_group_users` (`upsertAccessGroup`, `POST /api/access/groups`). Pembatasan Akses: only Senin-Jumat (Preferensi) was captured, other day types are rejected. Data only; access is not enforced yet (P5).
