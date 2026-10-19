# ADR-0042: P4 batch 2 screen parity: edit/delete routes, payroll journal; Proses Akhir Bulan stopped on revaluation

## Status
Accepted

## Date
2026-10-19

## Context
P4.2 batch 2 of `docs/goals/full-parity-v2.md`: Proses Akhir Bulan, Pencatatan Beban, Pencatatan Gaji, Penerimaan Penjualan,
Retur Penjualan and Faktur Pembelian. Same method as ADR-0041: one scenario per form (`tools/parity/scenarios/<form>.mjs`,
runner `tools/parity/run.mjs`), same inputs on Manufaktur Demo (Feb 2051) and a local seeded ERP; create, edit, delete, one
rejected save, journal after edit and after delete, list before and after delete. Evidence under `docs/parity/<module>/<form>/`.

Fixes made in the ERP (no `done` report reads any of them; the full suite is unchanged):
- Edit in place (same number) and delete (journal taken back) for Pencatatan Beban (new `POST/PUT/DELETE /api/expense-accruals`;
  the command had no route), Penerimaan Penjualan, Retur Penjualan (stock move taken back), Faktur Pembelian (refused once a
  payment, return or transfer uses it), Pencatatan Gaji and Proses Akhir Bulan (`PUT/DELETE /api/period-ends/:period`).
- Validation text now Accurate's: "Detail dari transaksi belum diisi!" for a receipt, return, purchase invoice or payroll without
  lines; Pencatatan Beban without lines returns both of Accurate's messages; a period end without a month "Bulan harus diisi".
- Pencatatan Gaji posts a journal when the run names its accounts (migration 0060): Dr each fee's expense account, Cr Hutang PPh 21,
  Cr Hutang Gaji Karyawan, number `EPY.yyyy.mm.nnnnn`, matching EPY.2051.02 line for line. P3.6 runs (no accounts) keep no journal,
  so the five payroll reports are untouched. Fees that reduce pay are refused on a journaled run (no capture of their lines).

## Decision
Batch-2 forms other than Proses Akhir Bulan cite ADR-0041's D1 (client-side defaults) and D2 (unmodelled form fields) as they are;
each README lists the exact Accurate keys.

**Proses Akhir Bulan is stopped**, not accepted. Accurate's Februari 2051 run posted only the unrealized gain/loss revaluation
(Piutang Usaha USD and two USD banks against 720202) and no depreciation; the ERP posts depreciation only. Revaluing inside
the period end needs foreign bank accounts (not modelled, ADR-0012) and would add journals to every seeded period end
(fixed-asset-t5, 2034), whose general-ledger reports are `done`: the stop rule applies. Create, edit, delete, the rejected save
and list match.

## Alternatives Considered
- **Accept the revaluation gap as a divergence**: rejected; it changes the journal, which no divergence so far has done.
- **Revalue receivables only**: rejected; still diverges on the two USD banks and still moves the done reports.

## Consequences
- Five forms `accepted divergence (ADR-0041)`; Proses Akhir Bulan `stopped (ADR-0042)` in `docs/parity/_screens.md`.
- New routes are registered outside the chained route type in `app.ts` (as in batch 1) and listed in `ROUTE_PRIVILEGES`.
- Accurate screenshots also mask the top-left version/session tag from this batch on (`tools/parity/lib.mjs`). Batch 1's
  screenshots still show it; re-capturing them is a follow-up.
