# Selisih Akun Pembelian belum tertagih (`UnbilledAccountBalanceDifferenceReport`)

Group: Pembelian. **Status: verified** (zero diff, 3 windows around one unbilled receipt). Fixture: [`fixtures/unbilled-t24.json`](fixtures/unbilled-t24.json).
ERP: `apps/api/src/reports/unbilled.ts` (`unbilledDifference`), receipt journal in `apps/api/src/purchases/service.ts` (`createReceiveItem`); test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy). No branch filter.

## Layout

`Nomor # | Tanggal | Tipe Transaksi | Keterangan | Nilai`, then:

1. `Saldo Pembelian belum tertagih` → `Saldo ... Per <start, no zero padding>`: account row `210203 | - | Hutang Pembelian Belum Ditagih | <balance>` and its total.
2. `Perubahan Saldo Pembelian belum tertagih`: same account row with the movement inside the window, and its total.
3. `Total dari Saldo Pembelian belum tertagih` = opening + change.
4. Only when some receipt is still unbilled at the end date: `Selisih Saldo Pembelian belum tertagih` →
   `Penerimaan Barang belum/sebagian tertagih`, one row per receipt (number, date, `Penerimaan Barang`, description, value) and two total rows.

## Calculation rules

- A **priced** Penerimaan Barang journals Dr item inventory account / Cr 210203 Hutang Pembelian Belum Ditagih for qty x price
  (T24: 3 x 40.000 = 120.000). An unpriced, unlinked receipt (T9) journals 0 on both lines and never shows.
- Balances are credit-positive. Opening = everything dated before the start; change = start..end inclusive.
- The Selisih section's total is the sum of the listed receipts (not balance minus receipts): it prints 120.000 although
  the account balance is also 120.000.

| Window | Opening | Change | Unbilled receipts |
|---|---|---|---|
| 1 Jan - 9 Mar 2036 | 0 | 0 | none (section omitted) |
| 1 - 31 Mar 2036 | 0 | 120.000 | RI.2036.03.00001 120.000 |
| 1 - 30 Apr 2036 | 120.000 | 0 | RI.2036.03.00001 120.000 |

## Open work

- Receipts are never linked to purchase invoices in the ERP (`shortcut:`), so billing a receipt does not clear it yet; the
  `210203` account is hardcoded instead of read from preferences.
