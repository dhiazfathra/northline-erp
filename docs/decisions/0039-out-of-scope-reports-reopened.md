# ADR-0039: The 23 out-of-scope reports are reopened; two stay as accepted divergences

## Status
Accepted 2026-10-19. Supersedes [ADR-0010](0010-report-scope.md), [ADR-0014](0014-pph-reports-out-of-scope.md) and
[ADR-0016](0016-cogs-monitoring-out-of-scope.md) for the 23 reports listed in `docs/reports/_coverage.md`.
[ADR-0015](0015-bank-integration-reports-out-of-scope.md) (bank integration) stays, with the correction below.

## Date
2026-10-19

## Context
ADR-0010 kept payroll, job orders, manufacturing and access reports at spec, and ADR-0014 and ADR-0016 extended it to
PPh withholding and Monitoring HPP. Phase P3 of `docs/goals/full-parity-v2.md` reopens all 23. Each one is captured in
an allowlisted sandbox, specified, built and diffed to zero. Its stop rule is: a capture that needs a form shape not
found after 3 attempts is stopped and reported, never worked around.

Two reports hit that rule in Manufaktur Demo (seed year 2049):

| Report | What blocks it | Evidence |
|---|---|---|
| Jurnal Perintah Kerja (`WorkOrderJournalReport`) | Work orders need the Manufaktur preference `featureFabrication`. In Manufaktur Demo the checkbox is disabled; the preferences form sends no save request and the flag reads back `false`. Without a work order there is nothing to capture. | All 4 sandbox captures are layout only. Trade Portal's is tagged `data` in `_coverage.md`, but the page holds only the header (`Nomor # Perintah Kerja :`, empty table). |
| Monitoring HPP (`CogsMonitoringReport`) | The report stays empty after new 2049 purchases (PI.2049.03.00001/00002) and a sale (SI.2049.03.00001). The data that makes rows appear is unknown. | 3 attempts across the earlier passes and P3.2 (spec [CogsMonitoringReport.md](../reports/CogsMonitoringReport.md)). |

**Principal's view (unverified):** `featureFabrication` is a paid Accurate add-on, which the demo Data Usaha does not
include. That fits the disabled checkbox. Accurate's pricing page was not checked, and no purchase was made.
Monitoring HPP may sit behind the same add-on, since it is a manufacturing-cost view, but nothing ties the two yet.

## Decision
- 21 of the 23 reports are built and verified to zero diff. Their `_coverage.md` status is `done`.
- `WorkOrderJournalReport` and `CogsMonitoringReport` get the status **`accepted divergence (ADR-0039)`**. The ERP does
  not build them. Their specs keep the layout, the parameters and the record of each attempt. They do not count as
  `done`. The count script reports them on a separate line, so the 291/291 line stays honest.
- No Accurate add-on is bought to close them. The goal limits the work to the four free demos, and buying an add-on is
  a financial action that is the principal's call.

## Alternatives Considered
- **Buy or trial the Manufaktur add-on:** this would allow a real capture. It is rejected for now because it costs
  money, it is an account-level action outside the sandbox guardrails, and the business value of these two reports has
  not been shown. This can be revisited if a customer needs work-order costing.
- **Build both reports from the spec alone, with no capture:** rejected. There is no capture to diff against, so the
  build could not be verified. That breaks the zero-diff rule every `done` row relies on.
- **Mark them `done (out of scope)` as before:** rejected. It would hide that P3 tried and why it stopped.
- **Move them to the second goal:** rejected. Without the add-on, the second goal would hit the same block.

## Consequences
- The parity done line reads 289 done + 2 accepted divergences = 291. `bun apps/api/scripts/coverage.ts` prints the
  divergences separately.
- If the add-on is ever enabled, or a sandbox with it appears, reopen both reports with a capture. Seed a new year and
  set this ADR's status to Superseded.
- **Correction to ADR-0015:** Daftar Perintah Pembayaran (`TransferOrderListReport`) does not need a bank Smartlink
  connection. ADR-0015 was based on the wrong module name. The form is `accurate__vendor__transfer-order`, and it
  saves with only a payment-order cash account (Preferensi `transferOrderBankDefault`) and the vendor's bank account on
  each line. The report was built in P3.2 (`apps/api/src/purchases/transfer-orders.ts`). ADR-0015 still holds for the
  other bank-integration reports.
- **Sandbox side effects of P3.2, Manufaktur Demo:** `transferOrderBankDefault` was set to 110102 for one save and then
  cleared. A single attempt to switch on `featureFabrication` left it `false`. The created records are vendor
  NL-PO49-V1, PI.2049.03.00001/00002, SI.2049.03.00001 and TFO.2049.03.00001, all dated 2049.

## Risk register
Likelihood × impact, using the matrix supplied with the `/risk-assessment` request.

| Risk | Likelihood | Impact | Rating | Mitigation | Owner |
|---|---|---|---|---|---|
| A customer migrating from Accurate uses work orders, and the ERP has no Jurnal Perintah Kerja | Low (demo tenants use job costing; P3.1 covers it) | High (blocks that customer's month-end) | Medium | Ask about work-order use in migration intake (`docs/migration/`); reopen this ADR on the first yes | Principal |
| Monitoring HPP shows something users rely on that the ERP cannot show | Medium | Low (other HPP reports, Pembelian (HPP) and Penyesuaian Bahan (HPP), cover cost per movement) | Low | Point users to those reports; revisit once a populated capture exists | Principal |
| "Paid add-on" is wrong and the block is a demo setting | Medium | Medium (2 reports left open when they could close) | Medium | Read the Accurate pricing page or ask Accurate support before any purchase decision | Principal |
| Reports built on the add-on later diverge from Accurate's real output | Low | Medium | Low | Never build without a capture (decision above) | Agent |
