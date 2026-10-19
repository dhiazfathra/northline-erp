# ADR-0041: P4 batch 1 screen parity: API defaults, unmodelled form fields and the loan schedule are accepted divergences

## Status
Accepted

## Date
2026-10-19

## Context
P4.2/P4.3 of `docs/goals/full-parity-v2.md`, batch 1: seven Tier 1 forms (Jurnal Umum, Faktur Penjualan, Pembayaran,
Penerimaan, Uang Muka Penjualan, Pinjaman Karyawan, Pencairan Pinjaman). Each form has one scenario script
(`tools/parity/scenarios/<form>.mjs`, runner `tools/parity/run.mjs`) that runs the same inputs on Manufaktur Demo (2051)
and on a local seeded ERP: create, edit, delete, one rejected save, the journal after the edit and after the delete, and
the list before and after the delete. It compares numbering, journal lines, validation message text, list/search,
defaults and the field set. Evidence: `docs/parity/<module>/<form>/`, index `docs/parity/README.md`.

The runs found these gaps, fixed in the ERP (no `done` report reads any of them; the full suite is unchanged):
- Validation text now matches Accurate: unbalanced journal ("Jurnal yang anda masukkan tidak seimbang antara debit dengan
  kredit"; the old message also printed cents), a Pembayaran/Penerimaan or Faktur Penjualan without lines ("Detail dari
  transaksi belum diisi!"), a zero down payment ("Uang muka harus lebih besar dari nol"), a loan without employee
  ("Karyawan harus diisi").
- Pembayaran/Penerimaan and Uang Muka Penjualan had create only: `PUT`/`DELETE` routes now edit in place (same number)
  and delete (journal taken back), as Faktur Penjualan already did. A used down payment cannot be deleted.
- Pinjaman Karyawan: the number is optional and auto-numbers `EPL.yyyy.mm.nnnnn` as Accurate does; edit and delete
  routes; the loan keeps its Piutang Karyawan account.
- Pencairan Pinjaman had no ERP command: `POST/PUT/DELETE /api/employee-loan-disbursements` (migration 0059) pays the
  whole loan out, `ELD.yyyy.mm.nnnnn`, Dr the loan's Piutang Karyawan / Cr the bank, journal type "Pencairan Pinjaman".
  A disbursed loan cannot be deleted (Accurate's text) or edited.

## Decision
Accept three divergences; every other compared aspect is equal on all seven forms.

- **D1. Defaults live in the client, not the API.** Accurate's new form pre-fills today's date and the default branch
  (Kantor Pusat). The ERP API requires the date and takes no branch unless one is sent. A screen that calls the API
  supplies the defaults (the web doc screens are still mock data).
- **D2. Form fields the ERP does not model.** Attachments, comments, custom fields (charField1-10, numericField1-10,
  dateField1-2) and foreign-currency journals on every form; payee, terbilang, SSP numbers, void-cheque, reconciliation
  and amortization flags on Pembayaran/Penerimaan; PO number, shipping (FOB, ship via, address), cashier/POS fields, retail
  buyer identity and e-payment state on Faktur Penjualan and Uang Muka Penjualan. Each scenario's README lists the
  exact Accurate keys with no ERP counterpart. None of them changes a journal.
- **D3. Pinjaman Karyawan has no installment schedule.** Accurate's loan carries duration, installment start date and
  type, interest, the penalty-income account, the employee's bank details and an employee fee; the ERP loan has employee,
  date, amount, interest rate, description and receivable account. The schedule belongs with Pembayaran Angsuran and
  Pelunasan Pinjaman (Tier 1 rows still `todo`).

Pinjaman Karyawan's edit step is **stopped**, not accepted: the scenario's edit shape was not found in three attempts.
The form's wire with a new amount and description, and with the description alone, is refused ("Karyawan ... Masih
Memiliki Pinjaman Yang Belum Lunas", the loan counted against itself), and the form's own Simpan on the reopened loan
stops at "Nama Bank harus diisi" because the bank-name lookup does not resolve the text the wire saved. The row stays
`stopped` in `_screens.md` until the bank-name lookup's shape is captured.

## Alternatives Considered
- **Defaults in the API** (date = today when omitted): rejected; a replayed or queued command would book on the day it
  is replayed, and every fixture test passes explicit dates.
- **Model every form field now**: rejected; the fields carry no journal or stock effect and would add columns no report
  reads. They are listed per form so a later batch can pick them.
- **Mark Pinjaman Karyawan as an accepted divergence for the edit**: rejected; the refusal is most likely the scenario's
  wire, not Accurate's behaviour, so calling it a divergence would record a guess.

## Consequences
- Six of seven batch-1 forms are `accepted divergence (ADR-0041)` in `docs/parity/_screens.md`; Pinjaman Karyawan is
  `stopped`. The batch's journals, numbering, messages and list/search match Accurate exactly.
- `apps/api/test/parity-p4.test.ts` pins the new commands to the journals and messages Accurate printed.
- The new edit/delete/disbursement routes are registered outside the chained route type in `app.ts` (TypeScript's
  instantiation-depth limit), so the web `hc` client does not see them yet. They are in `ROUTE_PRIVILEGES`; the
  disbursement routes map to `full_access` because the captured Akses Grup catalog has no Pencairan Pinjaman row.
- Videos of the seven Accurate runs (`accurate.webm`) stay local (`docs/parity/**/*.webm` is gitignored).
