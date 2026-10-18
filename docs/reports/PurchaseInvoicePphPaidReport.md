# Pembayaran PPh Pembelian (`PurchaseInvoicePphPaidReport`)

Group: Utang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/PurchaseInvoicePphPaidReport.json`](captures/PurchaseInvoicePphPaidReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Faktur Pembelian | No. Form | PPh | Bayar PPh | NTPN | Tgl Bayar PPh`

## Findings so far (2026-10-18)

T29 seeded two purchase invoices from NL-T3-V1 for service NL-T2-S1 (Jam, id 300). The detail lines carried `useTax3: true`
and `tax3Id: 58` (PPh 23 Jasa Konsultan, 2%):
- PI.2036.09.00001 (2 x 500.000, untaxed)
- PI.2036.09.00002 (1 x 300.000, `taxable: true`)

Accurate ignored the PPh on both. The journals are only Dr 600020 Beban Operasional Lainnya / Cr 210101 Hutang Usaha, and
the PPh reports for Sep 2036 print headers only. As with PPN (ADR-0009), the PPh most likely needs a default on the item
(`tax3Id` on the item master) and/or the PPh preference enabled. Neither is scripted yet.

T37 (2026-10-18): PPh is withheld on the receipt or payment, not the invoice. The sales receipt form carries `cutSalesPph`,
`pphDueDate`, `detailTaxId` and per invoice `pphAmount`, `pphNumber`, `paidPph`, `selfPaidPph`.

NL-T1-1101.2037.02.00001 paid SI.2037.02.00001 (1.000.000) with `cutSalesPph=true`, `pphAmount=20000` and
`pphNumber=BP-NL-T37`. Accurate saved it as a plain partial receipt of 980.000 (Dr Kas / Cr Piutang 980.000), and the PPh
reports for Feb 2037 stayed empty. The PPh line most likely needs a `detailTax` row (tax id 58, PPh 23 Jasa Konsultan,
whose purchase/sales accounts are 93/79). Next step: capture a UI-entered receipt with PPh through `capture-save.mjs`.

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
