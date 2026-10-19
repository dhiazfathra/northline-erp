# Daftar Pengguna per Cabang (`UserByBranchListReport`)

Group: Lain-lain. **Status: verified** on Manufaktur Demo (P3.4), no-member layout only.
Capture: [`captures/UserByBranchListReport.json`](captures/UserByBranchListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Pengguna | Email | No Handphone`

## Seeding (2026-10-19)

Manufaktur Demo has one user, the Administrator; inviting users is outward-facing and was not done, and no branch was
created. Seeded: Akses Grup **NL-AG49 Grup Gudang** (`/accurate/company/save-access-privilege.do`, body captured from the
form's own Simpan with the request aborted, then posted with the name set): no members, Pembatasan Akses = Preferensi,
Senin-Jumat; grants Kategori Pelanggan Buat/Ubah/Hapus, Gudang Buat/Ubah, Histori Stok Barang Aktif; every report and
widget unchecked. A `work_order` view grant was stored but prints no row (the menu catalog has no Perintah Kerja line).
Fixture: [`fixtures/access-m49.json`](fixtures/access-m49.json); test: `apps/api/test/access.test.ts`.

## Calculation rules

- Columns `Pengguna | Email | No Handphone`. One heading row per branch (default branch first); a branch open to all users prints `Semua Pengguna`, otherwise one row per admitted user (empty cells print nothing; that layout is unverified, no second user exists).

ERP: `GET /api/reports/access/user-by-branch`; data `branches.all_users` + `branch_users` (`setBranchUsers`, `POST /api/access/branches`). Data only; access is not enforced yet (P5).
