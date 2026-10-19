# Monitoring HPP (`CogsMonitoringReport`)

Group: Penjualan. **Status: out of scope** ([ADR-0016](../decisions/0016-cogs-monitoring-out-of-scope.md)); spec captured (no seeded fixture or ERP implementation yet).
Capture: [`captures/CogsMonitoringReport.json`](captures/CogsMonitoringReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | PER_BRANCH | [] | Cabang |

Selection: `ITEM_CATEGORY_ALL`.

## Layout

View: `report`. Header lines: "Cabang : [Semua Cabang]".


First table row (columns): `Nama Barang | Harga Jual | Satuan Jual | Harga Beli | Satuan Beli | HPP (%)`

## Findings so far (2026-10-18)

The report has no date parameter. It stayed empty (header row only) for branch Utama and [Semua Cabang] in all of these states:
- NL-T4-B1 with purchase invoices only.
- A Harga Pemasok (vendor price, VPA) and a Penyesuaian Harga Jual (SPA) dated 2036.
- A VPA and an SPA dated 1 Oct 2026, before the run date. These two were deleted after the check.

So neither vendor prices nor selling price adjustments make an item appear.

A new stock item NL-T30-B1 (id 400) was created with the item master's own prices: `unitPrice` 25.000, `vendorPrice` 15.000, preferred vendor NL-T3-V1. The report was still empty, including after a purchase of 4 units dated 1 Oct 2026 (PI.2026.10.00007, deleted after the check). The report's data source is `hpp.*`, with columns `hpp.unitPrice`, `hpp.purchaseCost`, `hpp.purchaseCostBefore` and `hpp.unitPurchaseBefore`. It looks like a log of purchase-cost changes, not a live item list. Two more attempts left it empty:
- Turning on Preferensi `featureVendorPrice` and saving a vendor price for NL-T30-B1 dated 1 Oct 2026.
- Item-category parameters (`selectedItemCategory`, `selectedCategory`).

Both temporary documents were deleted and the preference was switched back off. The trigger is still unknown.

## P3.2 attempt (2026-10-19)

Still empty for [Semua Cabang] after new 2049 purchases (PI.2049.03.00001/2 of NL-JC49 Bahan A/B, new purchase costs) and a sale (SI.2049.03.00001). Stopped under the goal's 3-attempt rule; the row trigger is still unknown.

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
