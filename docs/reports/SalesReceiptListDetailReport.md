# Rincian Penerimaan Penjualan (`SalesReceiptListDetailReport`)

Group: Piutang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/SalesReceiptListDetailReport.json`](captures/SalesReceiptListDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `No. Form | : | ZZ-R01-1101.2026.10.00001 | Bank | : | ZZ-R01-Bank Uji`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
