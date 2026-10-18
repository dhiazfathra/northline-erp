# Proyeksi Kas per Bulan (`CashProjectionReport`)

Group: Keuangan. **Status: verified** (zero diff before and after seeding). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`reports.CashProjectionReport`, T23 documents).
ERP: `apps/api/src/reports/cash-flow.ts` (`cashProjection`); test: `apps/api/test/tax.test.ts`.

## Parameters

None: the report runs from **today** (the print date, 18 Oct 2026 in the fixture) over five columns.

## Layout

```
Keterangan | 18-31 Oktober 2026 | November 2026 | Desember 2026 | Januari 2027 | Februari 2027
Saldo Kas per 18 Oktober 2026 | 3.692.386 | 3.742.386 | 4.292.386 | 3.992.386 | 3.992.386
Sumber Pendapatan / Piutang Jatuh Tempo / Pencairan Cek Jatuh Tempo / Total Sumber Pendapatan
Penggunaan Kas / Utang Jatuh Tempo / Cek Mundur Jatuh Tempo / Pembayaran Beban Jatuh Tempo / Pembayaran Gaji Karyawan / Total Penggunaan Kas
Perkiraan Lebih/Kurang Kas | ...
```

## Calculation rules

- Columns: today..end of the month, then the next four calendar months (Indonesian month names).
- Piutang / Utang Jatuh Tempo = open sales / purchase invoice balances bucketed by **due date** (T23: 500.000 due
  20 Nov 2026 in November; 300.000 due 5 Dec 2026 in December).
- Pencairan Cek / Cek Mundur Jatuh Tempo = cheques by cheque date (demo data only here).
- Saldo Kas of the first column = cash now; each later column starts from the previous Perkiraan Lebih/Kurang Kas, and
  Perkiraan = Saldo + Total Sumber Pendapatan - Total Penggunaan Kas.

## How it is verified

The sandbox's own cash and demo cheques form a baseline (`base`: opening, chequesIn, chequesOut) taken from the capture
before T23. `cashProjection(today, base, [], [])` reproduces that capture exactly; adding the ERP's T23 receivable and
payable reproduces the capture after seeding exactly.

## Open work

- Balances already overdue at today, expense (Pembayaran Beban) and salary schedules are not captured (0).
