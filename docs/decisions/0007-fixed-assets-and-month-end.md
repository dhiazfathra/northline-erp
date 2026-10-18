# ADR-0007: Fixed assets and the month-end depreciation process

## Status
Accepted

## Date
2026-10-18

## Context
Aset Tetap reports and the depreciation lines in every statement come from Accurate's asset register and its
"Proses Akhir Bulan". Observed in the sandbox (fixture `fixed-asset-t5.json`):
- Acquisition posts one journal of type "Aset Tetap", numbered by the asset (`FAA.yyyy.mm.nnnnn`): Dr asset account / Cr the expenditure accounts.
- Depreciation is **not** posted automatically; the month-end process posts one journal per month, numbered `<Bulan> <yyyy>`,
  type "Proses Akhir Bulan (Penyusutan)", description `Proses Akhir Bulan (<Bulan>, <yyyy>)`, Dr expense / Cr accumulated.
- Straight line, cost ÷ life months, a **full month from the acquisition month** (bought 15 Jan → January charged in full).
- Each asset's depreciation record carries its own Jurnal Umum number from the month's JV counter; the acquisition also
  consumes one (first depreciation in January is `JV.2034.01.00002`).

## Decision
- `fixed_assets` and `fixed_asset_expenditures` are plain tables with audit (ADR-0005 pattern); acquisition posts through
  `handleTx` with source `FA`.
- `runPeriodEnd(period)` is an idempotent command, allowed once per month, that depreciates every asset in use and not yet
  fully depreciated, posts the month journal (source `PE`) and records per-asset `depreciations` with their JV numbers.
- The last month takes the rounding remainder so book value ends at exactly zero (unverified in Accurate; documented).

## Alternatives Considered
- **Depreciate on read** (compute in reports): no journals, but the trial balance and statements would not match Accurate,
  which only shows depreciation after month-end.
- **Event-source the asset register**: deferred like the other documents (ADR-0005).

## Consequences
- Month-end currently covers depreciation only; FX revaluation and manufacturing variances (the other two month-end
  options) are not implemented.
- Disposals, edits/transfers and intangible assets are not modelled; their reports stay at spec status.
