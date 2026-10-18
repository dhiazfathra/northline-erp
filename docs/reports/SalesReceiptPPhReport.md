# Daftar Bukti Potong PPh Penjualan (`SalesReceiptPPhReport`)

Group: Pajak. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
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

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
