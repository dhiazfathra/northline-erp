# Handoff 2: Accurate Daftar Laporan as the accounting acceptance spec

Date: 2026-10-18. Supersedes the status in [`handoff.md`](handoff.md); its gotchas still apply.

## Status

- **229 / 229 reports have an outcome**: 205 verified (zero-diff test against an Accurate fixture), 24 out of scope, 0 at spec.
  Index: [`docs/reports/README.md`](docs/reports/README.md).
- `apps/api`: 218/218 `bun test` pass, `bunx tsc --noEmit -p .` clean, all work pushed to `main` (last commit `ab9a6de`).
- Out of scope (24): 18 payroll/job-order/manufacturing/access reports (ADR-0010), 4 PPh reports (ADR-0014),
  `TransferOrderListReport` (bank Smartlink, ADR-0015), `CogsMonitoringReport` (ADR-0016).
- Verified on our own seeded rows/movement because the report totals the whole sandbox incl. demo data (ADR-0013):
  `ItemValueToAccountBalanceDifferenceReport`, `UnRealizeGainLossReport` (receivable row; demo USD banks excluded),
  `FinancialFocusReport` (all cells except the Modal Kerja `%`, which follows no rule found; ERP prints the plain change).

## ADRs added in this stretch (`docs/decisions/`)

| ADR | Decision |
|---|---|
| 0012 | Foreign-currency sales post in IDR at the document's rate (customer currency, invoice/receipt `rate`) |
| 0013 | Whole-sandbox totals are verified on our own rows and on deltas only our data moves |
| 0014 | PPh withholding reports stay at spec |
| 0015 | Bank-integration reports (payment orders) stay at spec |
| 0016 | Monitoring HPP stays at spec |

## Seeds added this stretch (sandbox, all `NL-T*`, dated 2036-2037)

| Seed | What | Fixture |
|---|---|---|
| T24 | priced receipt RI.2036.03.00001 (unbilled, Cr 210203) | `unbilled-t24.json` |
| T25 | PI.2036.05.00001/2 with Biaya-tab expense lines | `purchase-expense-t25.json` |
| T26 | Pencatatan Beban EXP.2036.06.00001/2 | `expense-accrual-t26.json` |
| T27 | Harga Pemasok VPA.2036.07.00003/4 | `vendor-price-t27.json` |
| T31/T36 | USD invoice + receipt (realized gain); USD invoice + Jan 2037 period end at 15.400 (unrealized) | `fx-t31.json` |
| T32 | group item NL-T32-G1 | `item-group-t32.json` |
| T33 | serial item NL-T33-SN, PI.2036.11.00001 into NL-Gudang B | `serial-t33.json` |
| T34 | asset FAA.2036.12.00001 + life edit FAE.2036.12.00001 | `asset-edit-t34.json` |
| T35 | fiscal assets FAA.2037.01.00001 / FAA.2037.07.00001 (Gol 1 Garis Lurus) | `fiscal-asset-t35.json` |

Other sandbox leftovers: items NL-T29-S2, NL-T30-B1 (prices set); PI.2036.09.00001/2 (PPh attempts); SI.2037.02.00001 with
20.000 still open (PPh attempt); SPA.2036.08.00001. Preferences now on: `featureSerialNumber`; Jan 2037 period end closed
(gain/loss only, no depreciation).

## ERP changes this stretch (migrations 0031-0039)

Purchase expense lines; expense accruals (`createExpenseAccrual`); vendor prices; multi-currency sales (rate, realized
gain line, unrealized revaluation report); GROUP items; serial numbers on purchase lines; fixed-asset life edits
(`editFixedAsset`); fiscal life on assets; priced receipts journal to Hutang Pembelian Belum Ditagih; reconciliation day
(`reconciledAt`). CSV downloads: `allJournalsCsv`, `glHistoryCsv`, `glDetailCsv`, `journalDetailListCsv`,
`inventoryValuationCsv`.

## Known shortcuts (marked `shortcut:` in code)

- Month-end currency revaluation journal is not posted; revalued balance not carried forward; no foreign bank accounts.
- Receipts are never linked to purchase invoices (unbilled account 210203 hardcoded).
- Outgoing serials, batch numbers, expiry dates not modelled.
- Asset edits: life only (cost/method/expenditure edits not captured); only whole-year life wording known.
- Expense accrual payments (Dibayar, status) not modelled.

## Tooling added (`tools/accurate/`, README updated)

- `save-ri.mjs` (goods receipt), `save-param.mjs` (any flat `param.*` document), `item-flat.mjs` (blank item template;
  items need explicit GL ids), `save-inv.mjs` now takes per-line `tax3Id` and `serials`.
- `runReport(..., { view: 'csv' })`: download reports return a page with `contentData.preview` (10 rows) and a zip at
  `computed.downloadLink` (returned base64 as `zip`). Calling `export-report.do` after the page finds the cache expired.

## Gotchas learned

- Vendor price lines: send `price` only; adding `unitPrice` saves 0.
- Period end: `monthPE` is 1-based; `currencyRate[n]` carries month-end rates.
- `ReconciledBankReport` filters on the day the reconciliation was done, not the transaction date.
- Purchase template receives into NL-Gudang B (id 100), so serial stock lives there.
- Before every commit run the secret scan (staged diff + tracked files); never print raw capture JSON.
- `pnpm-lock.yaml` / `pnpm-workspace.yaml` carry the user's own uncommitted changes: do not commit.

## If work resumes

- PPh: enter one receipt with PPh 23 by hand in the UI, capture it with `capture-save.mjs`, then seed and diff (ADR-0014).
- Post the unrealized revaluation journal and link receipts to invoices to remove the two biggest shortcuts.
