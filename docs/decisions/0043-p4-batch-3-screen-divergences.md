# ADR-0043: P4 batch 3 screen parity: edit/delete for purchase payments, returns, adjustments and fixed assets; Aset Tetap is Tier 1

## Status
Accepted

## Date
2026-10-20

## Context
P4.2 batch 3 of `docs/goals/full-parity-v2.md`: Pembayaran Pembelian, Retur Pembelian, Penyesuaian Persediaan, Aset Tetap,
Perubahan Aset Tetap and Disposisi Aset Tetap. Same method as ADR-0041 and ADR-0042: one scenario per form
(`tools/parity/scenarios/<form>.mjs`, runner `tools/parity/run.mjs`), same inputs on Manufaktur Demo (Mar 2051) and a local
seeded ERP; create, edit, delete, one rejected save, journal after edit and after delete, list before and after delete.
Evidence under `docs/parity/<module>/<form>/`. Every scenario created its own records (purchase invoices and assets for
setup included) and deleted them at the end.

Fixes made in the ERP (no `done` report reads any of them; the full suite is unchanged):
- Edit in place (same number) and delete (journal and stock moves taken back) for Pembayaran Pembelian, Retur Pembelian,
  Penyesuaian Persediaan, Aset Tetap and Disposisi Aset Tetap: `PUT/DELETE` on `/api/purchases/payments`, `/api/purchases/returns`,
  `/api/inventory/adjustments`, `/api/fixed-assets` and `/api/fixed-assets/disposals`. An asset used by a depreciation,
  disposal or change cannot be deleted.
- Perubahan Aset Tetap had the `editFixedAsset` command and no route: `POST/PUT/DELETE /api/fixed-assets/edits` (idempotent;
  delete restores the useful life before the change) and `GET /api/reports/fixed-assets-edited` (Daftar Perubahan Aset Tetap).
  Its auto-number was `FAE.yyyy.mmnnnnn` (missing dot); now `FAE.yyyy.mm.nnnnn` as Accurate numbers it. The seeded fixture
  (asset-edit-t34) passes its number explicitly, so FixedAssetEditedListReport is untouched.
- Validation text now Accurate's: "Detail dari transaksi belum diisi!" for a purchase payment without invoices, a purchase
  return or adjustment without lines and an asset without expenditure; "Aset harus diisi" for a change or disposal without an asset.

## Decision
All six forms cite ADR-0041's D1 (client-side defaults) and D2 (unmodelled form fields) as they are; each README lists the
exact Accurate keys. No new divergence: numbering, journals, validation text, delete and list/search match.

**Aset Tetap is Tier 1** (the `*` in `docs/parity/_screens.md` is resolved): Accurate posts the acquisition as a journal
(FAA.2051.03, Dr 120005 Inventaris Kantor / Cr the expenditure account), which the ERP matches line for line. Accurate refuses
a Kas & Bank account as the expenditure account ("Akun perkiraan tipe Kas & Bank tidak dapat digunakan di Akun Pengeluaran");
the scenario uses NL-T1-3001 as the seeded fixtures do. The ERP does not check the account type (not exercised by the scenario).

Pembayaran Pembelian's rejected save sends amount 0: with a cheque amount and no invoices Accurate adds "Nilai Pembayaran melebihi
total pembayaran!", and the ERP takes no cheque amount (the payment is the sum of its lines, D2).

## Alternatives Considered
- **Route Perubahan Aset Tetap through `PUT /api/fixed-assets/:number`**: rejected; Accurate keeps the change as its own
  numbered document (FAE) with its own list, edit and delete.

## Consequences
- Six forms `accepted divergence (ADR-0041)` in `docs/parity/_screens.md`; Aset Tetap's tier confirmed.
- New routes are registered outside the chained route type in `app.ts` (as in batches 1 and 2) and listed in `ROUTE_PRIVILEGES`.
- Batch 1's Accurate screenshots were re-captured with the version/session-tag mask (ADR-0042's follow-up).
