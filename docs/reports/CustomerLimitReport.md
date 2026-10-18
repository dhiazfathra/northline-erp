# Limit Piutang Pelanggan (`CustomerLimitReport`)

Group: Piutang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/CustomerLimitReport.json`](captures/CustomerLimitReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Cabang : [Semua Cabang], Filter berdasarkan : Limit Piutang".


First table row (columns): `Nama | Saldo (Mata Uang) | Pesanan | Giro Mundur | Limit Piutang | Sisa Limit`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
