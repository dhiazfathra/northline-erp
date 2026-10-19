# Daftar Hak Akses per Pengguna (`AccessPrivilegeByUserListReport`)

Group: Lain-lain. **Status: verified** on Manufaktur Demo (P3.4), no-member layout only.
Capture: [`captures/AccessPrivilegeByUserListReport.json`](captures/AccessPrivilegeByUserListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedUser":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedUser` | USER | [] | Pengguna |


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

- Same block as Daftar Akses Grup. Users in no group (the Administrator) are not listed; with no group members the report is one empty header block. The ERP prints, per user in a group (filtered by `selectedUser` when given), that group's block with `Pengguna : <user>`; this member layout is unverified (no second user exists).

ERP: `GET /api/reports/access/privileges-by-user[?users=<id,...>]`. Data only; access is not enforced yet (P5).
