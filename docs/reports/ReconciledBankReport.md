# Transaksi Bank Terekonsiliasi (`ReconciledBankReport`)

Group: Kas & Bank. **Status: verified** (zero diff, 2 windows). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`reports.ReconciledBankReport`).
ERP: `apps/api/src/reports/cash-bank.ts` (`reconciledBank`); `reconcileBankEntry` records the day of reconciliation (`reconciledAt`); test: `apps/api/test/tax.test.ts`.
Capture: [`captures/ReconciledBankReport.json`](captures/ReconciledBankReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBank":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBank` | BANK_MULTI | [] | Kas/Bank |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Kode Perkiraan | :`

## Calculation rules

- The window filters on the **day the reconciliation was done**, not on the transaction or statement date. The T19 receipt
  (Nov 2035, statement 30 Nov 2035) was reconciled on 18 Okt 2026. It appears for 1-31 Okt 2026, and 2030-2037 prints the
  empty header.
- Per bank: `Kode Perkiraan : <no>`, `Nama : <name>`, `No. Trans # | Tipe Transaksi | Keterangan | Nilai | Referensi`, a
  date row per reconciliation day, then one row per entry (number, type, description, amount, party name).
- With nothing reconciled in the window, the labels print with empty values.

## Open work

- Several banks, payments (credit side) and imported statements are not captured.
