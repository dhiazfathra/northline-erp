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

Three reports hit that rule in Manufaktur Demo (the third was added 2026-10-19 after P3.5) (seed year 2049):

| Report | What blocks it | Evidence |
|---|---|---|
| Jurnal Perintah Kerja (`WorkOrderJournalReport`) | Work orders need the Manufaktur preference `featureFabrication`. In Manufaktur Demo the checkbox is disabled; the preferences form sends no save request and the flag reads back `false`. Without a work order there is nothing to capture. | All 4 sandbox captures are layout only. Trade Portal's is tagged `data` in `_coverage.md`, but the page holds only the header (`Nomor # Perintah Kerja :`, empty table). |
| Monitoring HPP (`CogsMonitoringReport`) | The report stays empty after new 2049 purchases (PI.2049.03.00001/00002) and a sale (SI.2049.03.00001). The data that makes rows appear is unknown. | 3 attempts across the earlier passes and P3.2 (spec [CogsMonitoringReport.md](../reports/CogsMonitoringReport.md)). |
| Pembayaran PPh Penjualan (`SalesInvoicePphPaidReport`) | Stays empty for 2050 even though PPh is withheld on a receipt (SI.2050.01.00001, received by NL-T1-1101.2050.01.00001 with `paidPph=true` and a `detailTax` row). That same receipt fills its twin, Daftar Bukti Potong PPh Penjualan. | 3 attempts in P3.5, recorded in [SalesInvoicePphPaidReport.md](../reports/SalesInvoicePphPaidReport.md): `cutSalesPph` with no tax row (saved as a plain partial receipt), `paidPph` with a tax row (report empty), and `selfPaidPph` (refused: "Nilai Pembayaran tidak mencukupi untuk melunasi pembayaran!"). The captures in Trade Portal, Kontraktor and Manufaktur are all layout only. |

**Evidence: Manufaktur is a paid add-on (checked 2026-10-19 against Accurate's own pages).**
- [accurate.id/harga](https://accurate.id/harga/) lists the base plan "Paket Dasar Accurate" at "Rp 333,000 /bulan" ("Tanpa
  Batasan Fitur", 1 data usaha, 1 user, PPN 11% included). It then lists separately priced add-ons, including
  **"Accurate Manufaktur: Rp 2,22 Juta /bulan"**.
- [accurate.id/solusi/manufaktur](https://accurate.id/solusi/manufaktur/) calls it "add-on Fitur Manufaktur di Accurate
  Online", lists **"Perintah Kerja"** among its features, and links "Lihat Harga" to `harga#addon`.
- The help centre's [Perintah Kerja page](https://help.accurate.id/product/accurate-online/fitur-aol/manufaktur/perintah-kerja/menghitung-progress-perintah-kerja/)
  says: "Di dalam menu Add On **Manufaktur** Accurate Online, ... Formulir **Perintah Kerja (SPK)**". Its breadcrumb is
  Fitur Accurate Online > Manufaktur > Perintah Kerja.
- This fits what the sandbox showed: the `featureFabrication` checkbox is disabled and won't save in a demo without the add-on.

These sources establish that **Jurnal Perintah Kerja needs the paid Manufaktur add-on**.

**Not established for Monitoring HPP.** None of the three official pages names it: the add-on page mentions only "perhitungan
HPP" and "Laporan Produksi". `_coverage.md` files Monitoring HPP under Penjualan, not Manufaktur, and lists it in all four
demos, so it may not depend on the add-on at all. It is a divergence because three captures came back empty, not because
of a paywall.

**Pembayaran PPh Penjualan: hypothesis, unproven.** Its columns are `Faktur Penjualan | PPh | Bayar PPh | NTPN | Tgl
Bayar PPh`. The last three describe the *deposit* of withheld PPh to the tax office, identified by its NTPN. The likely
trigger is therefore a separate "pembayaran PPh" record with an NTPN, not the receipt that withholds the PPh. The ERP
does not model that deposit either: in the built twin, Pembayaran PPh Pembelian, Bayar PPh is always 0 and NTPN is
empty. No such form was found in the 3 attempts. Nothing ties this report to the Manufaktur add-on.

**Unofficial (resellers only, not confirmed by Accurate):** a yearly price around Rp 22.200.000 and a 30-day free trial
of the add-on ([penjualanonline.id](https://penjualanonline.id/accurate-online-harga-accurate-online/),
[pencatatan.id](https://pencatatan.id/accurate-manufaktur/)). If a free trial exists, Jurnal Perintah Kerja could be
captured at no cost. Activating one is an account-level action and the principal's decision.

## Decision
- The other reports of the 23 are built and verified to zero diff. Their `_coverage.md` status is `done`.
- `WorkOrderJournalReport`, `CogsMonitoringReport` and `SalesInvoicePphPaidReport` get the status **`accepted divergence (ADR-0039)`**. The ERP does
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
- The parity done line reads 288 done + 3 accepted divergences = 291. `bun apps/api/scripts/coverage.ts` prints the
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
| A free add-on trial would close Jurnal Perintah Kerja at no cost, and it goes unused | Low (trial claimed only by resellers) | Low (1 report) | Low | Principal decides whether to activate a trial on a demo Data Usaha | Principal |
| Monitoring HPP has a non-add-on trigger that was never found | Medium | Low | Low | Ask Accurate support what populates it; reopen with a capture | Principal |
| Customers rely on the receivable-side PPh deposit record (NTPN) the ERP cannot show | Medium (Indonesian B2B customers withhold PPh 23 often) | Medium (tax reconciliation is done by hand; withholding slips are still covered by Daftar Bukti Potong PPh Penjualan) | Medium | Model the PPh deposit with NTPN on both sides together, then capture again; ask Accurate support what fills the report | Principal |
| Reports built on the add-on later diverge from Accurate's real output | Low | Medium | Low | Never build without a capture (decision above) | Agent |
