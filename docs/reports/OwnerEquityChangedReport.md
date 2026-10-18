# Perubahan Ekuitas Pemilik (`OwnerEquityChangedReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture:
[`fixtures/equity.json`](fixtures/equity.json). ERP: `apps/api/src/reports/equity.ts`.

Params: `startDate`, `endDate`. Columns `Keterangan` | `Nilai`.

| Row | Value |
|---|---|
| Ekuitas pemilik awal periode | "Jumlah Ekuitas" of [Neraca (Standar)](BalanceSheetStandardReport.md) on the day before `startDate` (equity accounts + retained-earnings roll + Laba Tahun Ini) |
| Penambahan Ekuitas Pemilik | heading |
| Pendapatan Bersih | net income in the range (C − D over P&L accounts) |
| Investasi Kurun Periode | **gross credits** to EQUITY accounts other than retained earnings in the range |
| Penarikan | **gross debits** to those accounts, printed positive |
| Total Penambahan Ekuitas Pemilik | net income + investasi − penarikan |
| Ekuitas Pemilik Akhir Periode | opening + total |

Fixture (Mar 2032): J7 Modal Cr 4.000.000 → Investasi `4.000.000`; J8 Modal Dr 500.000 → Penarikan `500.000`;
J9 income `750.000`; total `4.250.000`.

Unverified: whether a single journal that both credits and debits equity nets (fixture keeps them separate).
