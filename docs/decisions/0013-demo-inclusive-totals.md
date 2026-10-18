# ADR-0013: Reports that total the whole sandbox are verified on our own movement

## Status
Accepted

## Date
2026-10-18

## Context
A few reports cannot be scoped to our seeded data. Their parameters have no item, account or party filter, and Accurate
adds in the sandbox's demo company:
- Selisih Saldo Akun Persediaan sums every inventory account and every item (about 193 million of demo stock).
- Laba/Rugi Tidak Terealisasi revalues two demo USD bank accounts next to our receivable.
- Fokus Keuangan mixes demo balances into its ratios.

The ERP holds only the seeded NL transactions, so whole-sandbox totals can never match exactly. Copying the demo data into
fixtures would make them synthetic and tie them to data we did not create.

## Decision
Such a report counts as **verified** when all of these hold, and its doc names the rows or deltas compared:
1. The layout (labels, columns, row order) matches.
2. Every row that belongs to our seeded data matches exactly (Laba/Rugi Tidak Terealisasi: the receivable row).
3. Where a row mixes demo and seeded amounts, the **change between two capture dates** that only our seeded transactions
   move matches exactly, along with any invariant the report states (Selisih: the difference is 0).

The user chose this over mirroring the demo balances (2026-10-18).

## Alternatives Considered
- **Mirror demo opening balances and item values into the ERP fixtures**: exact totals, but the fixtures stop being
  seeded transactions and break whenever the demo data changes.
- **Leave these reports at spec**: honest, but leaves calculation rules that we did verify unrecorded as verified.

## Consequences
- A demo-only quirk inside a total (for example how demo bank accounts are revalued) is not covered.
- Fokus Keuangan still needs its Modal Kerja rule to reconcile on the delta before it qualifies.
