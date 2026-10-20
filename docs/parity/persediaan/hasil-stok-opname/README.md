# Hasil Stok Opname

Module: Persediaan. Accurate: Persediaan > Hasil Stok Opname (`accurate__inventory__stock-opname-result`, Manufaktur Demo, 2051). ERP: none (no ERP command).

**Verdict:** accepted divergence (ADR-0045)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit).
Evidence: captured by hand-driven sessions (`tools/accurate/session.mjs` with the helpers in `tools/accurate/forms.mjs`), not by `tools/parity/run.mjs`; no screenshots.

## What was run on Accurate
1. A result needs a Perintah Stok Opname (`accurate__inventory__stock-opname-order`, numbered `OPO.nnnnn` with no date part): `Perintah Stok Opname harus diisi`. The order needs a warehouse and item categories (`itemCategoryListId[0]`, wire from the form's own `_doSubmitParam()` after setting the observables; a second order for the same items and warehouse as P-T13's `OPO.00002` is refused: `Tidak dapat melakukan stok opname pada barang dan gudang yang sama dengan perintah stok opname yang lain`).
2. With an order on NL-Gudang B (category Umum, 3 pcs of NL-T4-B1 adjusted in beforehand) the result save was refused three ways: `Barang "NL-T4 Barang A" tidak termasuk dalam daftar barang Perintah Stok Opname` (the order's item list is not filled by the category filter alone); the form's `order` observable does not fill rows either.
3. Orders and the adjustment were deleted; no 2051 record is left.

## Divergence
The result's wire was not found in 3 attempts (stop rule). No ERP command, route or table. Whether a result posts a journal or stock is unconfirmed (Accurate seems to do it through a later Penyesuaian Persediaan), so the tier stays 1.

See [ADR-0045](../../../decisions/0045-p4-tier1-closure.md).
