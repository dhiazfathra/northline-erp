# Jurnal Perintah Kerja (`WorkOrderJournalReport`)

Group: Manufaktur. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/WorkOrderJournalReport.json`](captures/WorkOrderJournalReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedWorkOrder":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedWorkOrder` | WORK_ORDER_MULTI | [] | Perintah Kerja |


## Layout

View: `report`. Header lines: —.


First table row (columns): `Nomor # Perintah Kerja | : | Produk Utama | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
