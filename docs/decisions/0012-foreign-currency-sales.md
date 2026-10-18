# ADR-0012: Foreign-currency sales post in IDR at the document's rate

## Status
Accepted

## Date
2026-10-18

## Context
Accurate's Laba/Rugi Terealisasi report (`RealizeGainLossReport`) needs foreign-currency invoices and receipts. The
sandbox has multi-currency enabled (USD, realized account 720102 Laba/Rugi Terealisasi USD). Seeding one USD invoice
(T31, `fixtures/fx-t31.json`) showed how Accurate books them:
- The invoice journals Dr Piutang Usaha USD / Cr Penjualan at foreign amount x invoice rate (100 x 15.000).
- The receipt into an IDR cash account journals Dr cash at the receipt rate (15.500), Cr the receivable at the invoice
  rate, and puts the difference on the realized account as a last line (Cr 50.000 gain).

Until now the ERP had no currency concept: every amount was IDR.

## Decision
- Customers get `currency` (default IDR) and `realizedGainAccount`. Sales invoices and receipts get `rate` (default 1).
- Command inputs carry amounts in the document currency. The service converts them to IDR at the document's rate before
  anything is journaled, so the ledger, projections and every existing report stay single-currency (IDR).
- A receipt line stores the settled receivable at the invoice rate (`amount`, which keeps owing checks in IDR) and at
  the receipt rate (`amount_at_receipt`). The difference is the realized gain or loss.

## Alternatives Considered

### Foreign amounts in the event payloads and a currency dimension in projections
- Pros: complete multi-currency ledger, so unrealized revaluation is possible later.
- Cons: touches the Journal aggregate, every projection and every report; no other verified report needs it.
- Rejected for now. Unrealized gain/loss (month-end revaluation) is the trigger to revisit.

### A separate currency table with per-currency accounts
- Pros: matches Accurate's setup (accounts per currency).
- Cons: more schema for one currency in the fixtures.
- Rejected: per-customer accounts cover the verified cases.

## Consequences
- The ERP cannot yet show foreign balances (Nilai Asing) or revalue at month end, so `UnRealizeGainLossReport` stays
  unverified.
- Purchase-side foreign currency (vendor payments) follows the same pattern when it is needed.
