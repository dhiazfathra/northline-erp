# Bahan Baku Terpakai

Module: Kontraktor. Accurate: Kontraktor > Bahan Baku Terpakai (`accurate__contractor__material-equipment`, Kontraktor Demo, 2051). ERP: POST /api/contractor/material-usages (create only).

**Verdict:** accepted divergence (ADR-0045)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit).
Evidence: captured by hand-driven sessions (`tools/accurate/session.mjs` with the helpers in `tools/accurate/forms.mjs`), not by `tools/parity/run.mjs`; no screenshots.

## What was run on Accurate
1. Project `NL-P4-K1` (2051) and its RAB (`BGP.2051.03.nnnnn`) created by replaying the RAB form's own Simpan body (`captureWire` on P2's RAB, aborted, nothing persisted) through `asNew`, with `projectContractorId` swapped, `finished` reset and every 2026 date moved to 2051.
2. The form's own budget-plan lookup (`search-budget-plan-material.do`) and `doCopyDetail`/`_executeCopyDetail` filled the row (Kabel Battery 2x25mm DC); the form's `_doSubmitParam()` wire was saved.
3. Result: `MEQ.2051.03.00001`, journal `Dr 110506 Proyek Dalam Proses 132.000 / Cr 110401 Persediaan 132.000` (3 PCS at the project warehouse's average cost); a save with the detail rows blanked: `Detail "null" tidak ada atau sudah dihapus dari database`; delete worked; the project and RAB were deleted. Nothing is left in 2051.

## Divergence
The ERP has the create command only: no edit, delete or rejected-save text, and its RAB/stock setup for a 2051 project was not scripted. The ERP side of the scenario was not run.

See [ADR-0045](../../../decisions/0045-p4-tier1-closure.md).
