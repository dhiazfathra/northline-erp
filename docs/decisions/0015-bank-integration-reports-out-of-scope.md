# ADR-0015: Bank-integration reports stay at spec

## Status
Accepted (extends [ADR-0010](0010-report-scope.md))

## Date
2026-10-18

## Context
Daftar Perintah Pembayaran (`TransferOrderListReport`, columns `Nomor # | Tanggal | Bank | Metode Bayar | Status | Faktur
Dibayar`) lists payment orders sent to a bank. The sandbox's preferences show what it depends on:
- `transferOrderBankDefault` is null.
- `featureBcaSmartlinkApplication`, `featureMandiriSmartlinkApplication` and `featureUobSmartlinkIntegrationApplication`
  are all false.
- The transfer-order form does not open (`fresh-form.mjs accurate__inventory__transfer-order` returns no form).

Producing a payment order needs a live Smartlink connection to a real bank. The user chose to keep the report out of
scope (2026-10-18).

## Decision
`TransferOrderListReport` stays at spec, with the findings above in its doc. It is out of scope, as the ADR-0010 reports
are.

## Consequences
- The ERP has no bank payment orders. Revisit if a bank integration is added to the ERP itself.
