# Alokasi Bahan Proyek

Module: Kontraktor. Accurate: Kontraktor > Alokasi Bahan Proyek (`accurate__contractor__material-allocation`, Kontraktor Demo, 2051). ERP: none (no ERP command).

**Verdict:** accepted divergence (ADR-0045)

Date: 2026-10-20. Commit: `<commit-sha>` (placeholder, filled in at commit).
Evidence: captured by hand-driven sessions (`tools/accurate/session.mjs` with the helpers in `tools/accurate/forms.mjs`), not by `tools/parity/run.mjs`; no screenshots.

## What was run on Accurate
A header-only save for the 2051 project: `Detail dari transaksi belum diisi!` (the ERP's text for the same case elsewhere). The detail rows come from the RAB's budget-plan materials like Bahan Baku Terpakai; a posted allocation was not captured, so whether it journals is not confirmed. The tier stays 1 until it is.

## Divergence
No ERP command, route or table. The scenario was not run.

See [ADR-0045](../../../decisions/0045-p4-tier1-closure.md).
