# ADR-0044: P4 batch 4 screen parity: edit/delete for deliveries, receipts, purchase down payments, transfers and job costing; the roll-over's zero difference line is accepted; Pekerjaan Pesanan is Tier 1

## Status
Accepted

## Date
2026-10-20

## Context
P4.2 batch 4 of `docs/goals/full-parity-v2.md`, the last of the S/M tier: Pengiriman Pesanan, Penerimaan Barang, Uang Muka
Pembelian, Pemindahan Barang, Pekerjaan Pesanan, Penambahan Bahan Baku and Penyelesaian Pesanan on Manufaktur Demo (Mar 2051),
and Bahan Baku Terpakai and Penyelesaian Proyek on Kontraktor Demo. Same method as ADR-0041 to ADR-0043: one scenario per form
(`tools/parity/scenarios/<form>.mjs`, runner `tools/parity/run.mjs`), same inputs on Accurate and a local seeded ERP; create,
edit, delete, one rejected save, journal (and for transfers the warehouse mutation) after edit and after delete, list before and
after delete. Every scenario created its own records (the job orders the adjustment and roll-over draw on included) and deleted
them at the end; a sweep before and after found no 2051 NL-P4 records left in either sandbox.

Fixes made in the ERP (no `done` report reads any of them; the full suite is unchanged):
- Edit in place (same number) and delete (journal and stock moves taken back) for all seven Manufaktur forms: `PUT/DELETE` on
  `/api/sales/deliveries`, `/api/purchases/receive-items`, `/api/purchases/down-payments`, `/api/inventory/transfers`,
  `/api/job-costing/job-orders`, `/api/job-costing/material-adjustments` and `/api/job-costing/roll-overs`. A delivery that an
  invoice bills, a transfer a receipt names, a job order with an adjustment or roll-over, and a down payment an invoice uses
  cannot be deleted ("sudah dipakai transaksi lain"). A priced receipt now keeps its journal id (migration 0061).
- Receipts and transfers take an optional idempotency key (seeded fixtures pass none and keep working).
- Validation text now Accurate's: "Detail dari transaksi belum diisi!" for a delivery, receipt, transfer or material adjustment
  without lines and a job order without materials or expenses; "Uang muka harus lebih besar dari nol" for a zero purchase down
  payment; for a roll-over into one of the job's own materials, Accurate's two texts ("... adalah termasuk dalam bahan baku ...;
  Penyelesaian ke Barang ... tidak benar ..."), checked before "already finished" as Accurate does.
- The journal report names JC, MA and RO journals (Pekerjaan Pesanan, Penambahan Bahan Baku, Penyelesaian Pesanan); they printed
  no Tipe Transaksi before.
- `GET /api/reports/inventory/warehouse-summary` (Ringkasan Mutasi Gudang) had a handler and no route.

## Decision
All seven Manufaktur forms cite ADR-0041's D1 (client-side defaults) and D2 (unmodelled form fields) as they are; each README lists
the exact Accurate keys. One new divergence:

- **D3. The roll-over's zero line on the difference account.** Accurate's Penyelesaian Pesanan journal prints a 0/0 line on the job
  order's difference account (510102 Selisih Biaya Produksi) between the debit and the WIP credit. The ERP's job order has no
  difference account, so the line is absent. It moves no balance; every other line and amount matches.

**Pekerjaan Pesanan is Tier 1** (the `*` in `docs/parity/_screens.md` is resolved): Accurate posts the job order as a journal
(JC.2051.03, Dr 110403 Persediaan Dalam Proses / Cr inventory / Cr the expense accounts), which the ERP matches line for line.

**Bahan Baku Terpakai and Penyelesaian Proyek are stopped** (stop rule: form shape not found after 3 attempts). Both need a 2051
project with a RAB in Kontraktor Demo, since P2's 2026/2048/2052 records must not be touched. The project saved (and was deleted);
the RAB (`save-budget-plan.do`, a group > task > material tree) failed three times: `param.projectId` ("Proyek Kontraktor tidak
ditemukan"), then `param.projectContractorId` with the task tree, then with the `detailBudgetMaterial` summary row too (both a server
error, "Upsss..."). No Kontraktor record is left. The ERP's MEQ/FPC commands are unchanged.

## Alternatives Considered
- **Run Bahan Baku Terpakai against PRC.2026.06.00001**: rejected; it is P2's record and finished (FPC.2026.07.00003).
- **Add a difference account to job orders to print the zero line**: rejected for now; it changes the job order model for a line with no
  amount. Revisit with work orders (P3 manufacturing) if the account starts carrying variances.

## Consequences
- Seven forms `accepted divergence (ADR-0041)` (Penyelesaian Pesanan also ADR-0044) in `docs/parity/_screens.md`; Pekerjaan Pesanan's tier confirmed.
- Two Kontraktor forms `stopped (RAB shape, ADR-0044)`; the next attempt should capture the RAB form's own Simpan (`capture-save.mjs`
  on a new budget plan filled in the UI) instead of composing the tree.
- New routes are registered outside the chained route type in `app.ts` (as in batches 1 to 3) and listed in `ROUTE_PRIVILEGES`.
