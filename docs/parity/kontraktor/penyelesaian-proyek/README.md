# Penyelesaian Proyek

Module: Kontraktor. Accurate: Kontraktor > Penyelesaian Proyek (`accurate__contractor__finished-project`, Kontraktor Demo, 2051). ERP: POST /api/contractor/completions (create only).

**Verdict:** accepted divergence (ADR-0045)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit).
Evidence: captured by hand-driven sessions (`tools/accurate/session.mjs` with the helpers in `tools/accurate/forms.mjs`), not by `tools/parity/run.mjs`; no screenshots.

## What was run on Accurate
1. Same 2051 project and RAB as Bahan Baku Terpakai, with its MEQ.2051.03.00001 posted.
2. Completing a project with no activity: `Proyek tidak dapat diselesaikan karena belum terdapat aktivitas pada proyek ini.` (the ERP has no such check).
3. Completing it after the MEQ: journal `Dr 110401 Persediaan 12.300 / Cr 110506 Proyek Dalam Proses 12.300` (leftover stock returned) then `Dr 5101.02 Beban Pokok Proyek 119.700 / Cr 110506 119.700`. The save took the P2 wire's `countAutoNumber` 0 and the document got no number (`null`); a fresh form's `countAutoNumber` 1 would number it. It was deleted at once, together with the MEQ, RAB and project.

## Divergence
The ERP completion has no edit/delete and does not check for activity; its leftover-stock return is an explicit `returns` list while Accurate derived 12.300 itself. The ERP side was not run.

See [ADR-0045](../../../decisions/0045-p4-tier1-closure.md).
