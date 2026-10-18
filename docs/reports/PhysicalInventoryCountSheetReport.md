# Lembar Penghitungan Stok (`PhysicalInventoryCountSheetReport`)

Group: Gudang . **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/PhysicalInventoryCountSheetReport.json`](captures/PhysicalInventoryCountSheetReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedWarehouse":null,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedWarehouse` | WAREHOUSE | null | Gudang |
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Accurate returned an error for default params: `{"":["Upsss... Telah terjadi permasalahan pada saat pemrosesan aktivitas Anda. Permasalahan ini sudah kami terima secara otomatis, dan akan segera ditelusuri oleh tim terkait. Kami mohon maaf atas ket`.


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
