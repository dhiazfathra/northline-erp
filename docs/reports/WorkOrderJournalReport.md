# Jurnal Perintah Kerja (`WorkOrderJournalReport`)

Group: Manufaktur. **Status: out of scope** (ADR-0010; spec captured, not verified) (no seeded fixture or ERP implementation yet).
Capture: [`captures/WorkOrderJournalReport.json`](captures/WorkOrderJournalReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedWorkOrder":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedWorkOrder` | WORK_ORDER_MULTI | [] | Perintah Kerja |


## Layout

View: `report`. Header lines: —.


First table row (columns): `Nomor # Perintah Kerja | : | Produk Utama | :`

## P3.3 attempt (2026-10-19)

Work orders need Preferensi > Fitur > Manufaktur (`featureFabrication`). In Manufaktur Demo the checkbox is disabled (an add-on the sandbox does not have): setting it through the preferences form does not save, and no `save-preferences.do` request is sent. No Perintah Kerja can be created, so the report stays at spec (stopped under the goal's 3-attempt rule).

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
