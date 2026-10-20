# ADR-0045: P4 Tier 1 closure: loan payments and bank transfers built, loan edit refusal matched; five forms accepted divergence

## Status
Accepted

## Date
2026-10-20

## Context
P4.2 batch 5 of `docs/goals/full-parity-v2.md`: the four forms ADR-0041, ADR-0042 and ADR-0044 stopped (Pinjaman Karyawan edit, Proses Akhir Bulan, Bahan Baku Terpakai, Penyelesaian Proyek) and the five L forms (Transfer Bank, Hasil Stok Opname, Alokasi Bahan Proyek, Pembayaran Angsuran, Pelunasan Pinjaman). Same method as ADR-0041 to 0044. Accurate sessions ran one at a time on Manufaktur Demo and Kontraktor Demo, 2051 data only; a sweep before and after found no 2051 NL-P4 record left in either sandbox (the Kontraktor sandbox holds only P2's records).

## Decision
All new scenarios cite ADR-0041's D1 (client-side defaults) and D2 (unmodelled form fields). Fixes in the ERP (no `done` report reads any of them):

- **Pinjaman Karyawan edit (new approach: the real form's Simpan with Nama Bank filled).** The bank lookup is `search-bank-code-type.do`; picking "BANK DIGITAL BCA" fills `employeeBank`/`bankCode`, and the form's own Simpan then sends the wire. Accurate still refuses it: `Karyawan <name> Masih Memiliki Pinjaman Yang Belum Lunas`, the loan counted against itself. The same text refuses a second loan for an employee with a balance. The ERP now does both (`assertNoUnpaidLoan`), so the step compares as an equal refusal and the scenario passes the edit row; the loan row's verdict stays `accepted divergence (ADR-0041, ADR-0045)` for D1/D2/D3. Delete of a loan with payments is refused.
- **Pelunasan Pinjaman** (`POST/PUT/DELETE /api/employee-loan-settlements`, `ELS.yyyy.mm.nnnnn`, migration 0062): the form has no description, only loan, bank, date and the cash paid (default 0). Accurate's journal for 0 cash is `0/0 Kas`, `Cr Piutang Karyawan 300.000`, `Dr Pendapatan Denda 300.000` (the loan's penalty account takes the unpaid balance). Edits that change the cash paid or the date are refused (`Sisa Angsuran & Penalty tidak boleh kurang dari Jumlah Pokok Dibayarkan`), so the ERP refuses them the same way. Deleting the settled loan is refused.
- **Pembayaran Angsuran** (`POST/PUT/DELETE /api/employee-loan-installments`, `ELI.yyyy.mm.nnnnn`): Dr bank / Cr the loan's Piutang Karyawan for the amount paid.
- **Transfer Bank** (`POST/PUT/DELETE /api/cash-bank/transfers`, `BT.yyyy.mm.nnnnn`, migration 0063): Dr destination / Cr source; messages `Dari Kas/Bank harus diisi`, `Ke Kas/Bank harus diisi`, `Nilai Transfer harus diisi`. Journal, numbering, message and list match.
- Journals of the new types print `Tipe Transaksi` Pelunasan Pinjaman, Pembayaran Angsuran and Transfer Bank.

New divergences:

- **D4. Pelunasan's zero cash line.** Accurate prints a `0/0` line on the bank account when no cash is paid; the ERP posts no zero line. Every other line matches.
- **D5. Pelunasan's rejected-save text.** Accurate's form check says `Nomor Pinjaman harus diisi` (the ERP's text); a raw wire without a loan gets a generic server error page.
- **D6. Pembayaran Angsuran could not be exercised on Accurate with 2051 data.** The form's loan lookup (`search-outstanding-loan-installment.do`) takes no date and lists installments due by today's server date; a loan dated 2051 has none (0 rows for four keywords), and a 2026 loan is outside the 2051 sandbox rule. The ERP command exists and is unit-tested; its behavior is unverified against Accurate.
- **D7. Forms with no ERP side run** (below).

**Five forms accepted as divergences without a completed ERP side, to be revisited:**

- **Proses Akhir Bulan** (left, as the brief allows): the ERP can match Accurate's revaluation journal only by posting foreign-bank revaluations, which are not modelled (ADR-0012) and would add journals to every seeded period end the `done` reports read (ADR-0042). Unchanged.
- **Hasil Stok Opname:** the result needs a Perintah Stok Opname; the order saved (warehouse plus `itemCategoryListId[0]`, from the form's own `_doSubmitParam()`), but the result's rows were refused three ways (`Barang ... tidak termasuk dalam daftar barang Perintah Stok Opname`) even with stock in the warehouse, and the form's `order` observable does not fill rows. Stop rule after 3 attempts. No ERP command; the tier stays 1 (unconfirmed that a result posts).
- **Bahan Baku Terpakai, Penyelesaian Proyek** (new approach worked on Accurate): the RAB for a 2051 project was created by replaying the RAB form's own Simpan body (`captureWire` on P2's RAB, aborted) through `asNew` with the project id swapped to the new project (a guard aborts if the id is P2's 51), `finished` reset, `countAutoNumber` from the new form and 2026 dates moved to 2051; MEQ rows came from the form's own budget-plan lookup (`search-budget-plan-material.do`, `doCopyDetail`). Accurate results: MEQ `Dr 110506 / Cr 110401 132.000` (3 PCS); FPC with no activity refused (`Proyek tidak dapat diselesaikan karena belum terdapat aktivitas pada proyek ini.`), FPC after the MEQ `Dr 110401 12.300 / Cr 110506`, `Dr 5101.02 119.700 / Cr 110506`. The ERP's MEQ/FPC have no edit/delete, no activity check, and no 2051 item/stock/RAB setup scripted; the ERP side was not run.
- **Alokasi Bahan Proyek:** Accurate refuses a header-only save (`Detail dari transaksi belum diisi!`); a posted allocation was not captured, so the tier is unconfirmed. No ERP command.

## Alternatives Considered
- **Edit Pinjaman Karyawan in the ERP despite Accurate refusing:** rejected; parity means refusing the same way.
- **Run Pembayaran Angsuran on a 2026 loan:** rejected; it would put posted 2026 journals in the shared sandbox.
- **Add foreign-bank revaluation for Proses Akhir Bulan:** rejected for the reason in ADR-0042.

## Consequences
- Pinjaman Karyawan, Pelunasan Pinjaman and Pembayaran Angsuran, Transfer Bank: scenarios under `docs/parity/`; the first two and Transfer Bank ran on both sides, Pembayaran Angsuran on the ERP side only (D6).
- Hasil Stok Opname, Alokasi Bahan Proyek, Bahan Baku Terpakai, Penyelesaian Proyek and Proses Akhir Bulan are `accepted divergence (ADR-0045)` in `docs/parity/_screens.md`; the first four need an ERP side before the divergence can be called closed.
- New routes (in `ROUTE_PRIVILEGES`): `kas_bank.transfer_kas_bank` for transfers; the loan settlement and installment routes need full access (no Akses Grup row).
