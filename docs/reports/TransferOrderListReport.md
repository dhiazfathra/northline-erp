# Daftar Perintah Pembayaran (`TransferOrderListReport`)

Group: Pembelian. **Status: out of scope** ([ADR-0015](../decisions/0015-bank-integration-reports-out-of-scope.md)); spec captured (no seeded fixture or ERP implementation yet).
Capture: [`captures/TransferOrderListReport.json`](captures/TransferOrderListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Nomor # | Tanggal | Bank | Metode Bayar | Status | Faktur Dibayar`

## Findings (2026-10-18)

The printed title is **Daftar Perintah Pembayaran**: `Nomor # | Tanggal | Bank | Metode Bayar | Status | Faktur Dibayar`. Payment orders need a bank Smartlink integration, which is off in the sandbox (see ADR-0015).

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
