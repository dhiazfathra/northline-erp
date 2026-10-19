# Pembayaran PPh Penjualan (`SalesInvoicePphPaidReport`)

Group: Piutang. **Status: out of scope** ([ADR-0014](../decisions/0014-pph-reports-out-of-scope.md)); **stopped in P3.5** (stop rule: form shape not found after 3 attempts), not built.
Capture: [`captures/SalesInvoicePphPaidReport.json`](captures/SalesInvoicePphPaidReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Faktur Penjualan | PPh | Bayar PPh | NTPN | Tgl Bayar PPh`

T37 (2026-10-18): PPh is withheld on the receipt or payment, not the invoice. The sales receipt form carries `cutSalesPph`,
`pphDueDate`, `detailTaxId` and per invoice `pphAmount`, `pphNumber`, `paidPph`, `selfPaidPph`.

NL-T1-1101.2037.02.00001 paid SI.2037.02.00001 (1.000.000) with `cutSalesPph=true`, `pphAmount=20000` and
`pphNumber=BP-NL-T37`. Accurate saved it as a plain partial receipt of 980.000 (Dr Kas / Cr Piutang 980.000), and the PPh
reports for Feb 2037 stayed empty. The PPh line most likely needs a `detailTax` row (tax id 58, PPh 23 Jasa Konsultan,
whose purchase/sales accounts are 93/79). Next step: capture a UI-entered receipt with PPh through `capture-save.mjs`.

## P3.5 attempts (2026-10-19, Manufaktur Demo, 2050)

The report stays header-only for 2050 although PPh is withheld on a receipt. Three attempts at the data that fills it:

1. T37 (above): receipt with `cutSalesPph=true`, `pphAmount`, no `detailTax` row. Saved as a plain partial receipt; empty.
2. SI.2050.01.00001 (PPh line, `useTax3` + `tax3Id` 58 and an invoice `detailTax` PPh row; Accurate kept PPh 40.000) and
   receipt NL-T1-1101.2050.01.00001 with `paidPph=true`, `pphAmount=40000`, `pphNumber=NL-BP50-C1` and a `detailTax` row.
   The receipt fills Daftar Bukti Potong PPh Penjualan and journals Dr 110505 PPh 23 Penjualan 40.000; this report stays
   empty over 01/01/2050-31/12/2050.
3. SI.2050.02.00001 (same PPh line, `canSelfPaidPph: true`) and a receipt for the full 1.110.000 with `selfPaidPph=true`,
   `paidPph=false`, `pphAmount=40000` and the `detailTax` row. Refused: `chequeAmount: "Nilai Pembayaran tidak mencukupi
   untuk melunasi pembayaran!"`; nothing saved. SI.2050.02.00001 stays unpaid.

Likely next step for whoever reopens it: capture a UI-entered self-paid receipt (or a "Pembayaran Pajak" form, which fills
Bayar PPh / NTPN) with the form's own Simpan aborted, before saving anything. Captures: `fixtures/pph-m50.json`
(`reports.SalesInvoicePphPaidReport`).
