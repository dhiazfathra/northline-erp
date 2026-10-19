# Daftar Bukti Potong PPh Penjualan (`SalesReceiptPPhReport`)

Group: Pajak. **Status: verified** on Manufaktur Demo, 2050 seed (P3.5; [ADR-0039](../decisions/0039-out-of-scope-reports-reopened.md) reopened it).
Capture: [`captures/SalesReceiptPPhReport.json`](captures/SalesReceiptPPhReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.



## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Tanggal | No. Bukti Potong | Nomor # Faktur Penjualan | Pembayaran | Tarif PPh | Nilai PPh`

T37 (2026-10-18): PPh is withheld on the receipt or payment, not the invoice. The sales receipt form carries `cutSalesPph`,
`pphDueDate`, `detailTaxId` and per invoice `pphAmount`, `pphNumber`, `paidPph`, `selfPaidPph`.

NL-T1-1101.2037.02.00001 paid SI.2037.02.00001 (1.000.000) with `cutSalesPph=true`, `pphAmount=20000` and
`pphNumber=BP-NL-T37`. Accurate saved it as a plain partial receipt of 980.000 (Dr Kas / Cr Piutang 980.000), and the PPh
reports for Feb 2037 stayed empty. The PPh line most likely needs a `detailTax` row (tax id 58, PPh 23 Jasa Konsultan,
whose purchase/sales accounts are 93/79). Next step: capture a UI-entered receipt with PPh through `capture-save.mjs`.

## Seeding (2026-10-19, P3.5)

Form shape taken from the demo payment ZZ-R01-1101.2026.10.00002 (captured with the form's own Simpan aborted, nothing
saved). PPh needs two things the earlier attempts lacked: the invoice line carries `useTax3: true` + `tax3Id` **and** the
invoice `detailTax` holds the PPh row (an invoice saved with only `tax3Id` keeps `useTax3: false` and no PPh, as
PI.2050.01.00001 shows); then the payment/receipt line sets `paidPph: true`, `pphAmount`, `pphNumber` and a `detailTax`
row (`taxId` 58, `taxableAmount`, `taxRate`, `taxAmount`, `taxType` PPH23, `pphType` JASA_KONSULTAN). Accurate applied 4 %
(the tax master says 2 %) to these parties. Seeded in Manufaktur Demo, 2050: PI.2050.01.00002 + payment
ZZ-R01-1101.2050.01.00001 (NL-T3-V1, slip NL-BP50-V1), SI.2050.01.00001 + receipt NL-T1-1101.2050.01.00001 (NL-T2-C1,
slip NL-BP50-C1). Fixture: [`fixtures/pph-m50.json`](fixtures/pph-m50.json); test: `apps/api/test/pph.test.ts`.

## Calculation rules

- Journal (AllJournalReport Jan-Feb 2050 in the fixture): payment Dr Hutang (invoice amount) / Cr PPh 23 Pembelian 210202 (PPh) / Cr bank (rest); receipt Dr bank (rest) / Dr PPh 23 Penjualan 110505 (PPh) / Cr Piutang.
- One row per receipt line with PPh dated in range: Tanggal, No. Bukti Potong, No. Faktur Penjualan, Pembayaran (= the PPh DPP), `<rate> %`, Nilai PPh. Grouped by PPh type, then customer; a customer total (DPP, PPh) and a PPh-type total.

ERP: `GET /api/reports/tax/sales-receipt-pph`; data `sales_receipt_lines.pph_*` (receipt `payments[].pph`).
