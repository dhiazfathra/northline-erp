# Transaksi Bank Terekonsiliasi (`ReconciledBankReport`)

Group: Kas & Bank. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/ReconciledBankReport.json`](captures/ReconciledBankReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBank":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBank` | BANK_MULTI | [] | Kas/Bank |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Kode Perkiraan | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
