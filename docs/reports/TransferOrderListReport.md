# Daftar Perintah Pembayaran (`TransferOrderListReport`)

Group: Pembelian. **Status: verified** on Manufaktur Demo (P3.2): fixture [`fixtures/transfer-orders-m49.json`](fixtures/transfer-orders-m49.json), test `apps/api/test/transfer-orders.test.ts`. ADR-0015's premise did not hold: the form is `accurate__vendor__transfer-order` and saves without a Smartlink connection.
Capture: [`captures/TransferOrderListReport.json`](captures/TransferOrderListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Nomor # | Tanggal | Bank | Metode Bayar | Status | Faktur Dibayar`

## Findings (2026-10-18)

The printed title is **Daftar Perintah Pembayaran**: `Nomor # | Tanggal | Bank | Metode Bayar | Status | Faktur Dibayar`. ADR-0015 assumed payment orders need a bank Smartlink integration; that was based on the wrong module name. Saving an order needs none (see Seeding); only the transfer itself goes through the bank.

## Seeding (2026-10-19)

A payment order (Perintah Pembayaran, `TFO.yyyy.mm.nnnnn`, `/accurate/vendor/save-transfer-order.do`) was saved by the form itself:
- Accurate refuses it until Preferensi has a cash account for payment orders (`transferOrderBankDefault`; set to 110102 Bank for the save, then cleared) and every invoice line carries the vendor's bank account (vendor NL-PO49-V1 with a BCA account).
- Invoices come from "Ambil Faktur" (`outstanding-invoice-for-transfer-order.do`), filtered by due date.
- A saved order is "Menunggu Ditransfer" and posts no journal.

## Calculation rules

- One row per order dated in range, by date then number. Bank is the cash account's name; Metode Bayar is Transfer Bank / Virtual Account / Cek/Giro.
- Status: Draf, Diajukan, Ditolak, Menunggu Ditransfer, Sebagian Ditransfer, Ditransfer Seluruhnya, Gagal Ditransfer.
- Faktur Dibayar: the sum of the order's invoice payments. With nothing in range only the header prints.

ERP: `createTransferOrder` (`apps/api/src/purchases/transfer-orders.ts`), `transferOrderList` (`apps/api/src/reports/transfer-orders.ts`), route `GET /api/reports/purchases/transfer-order-list?from&to`.
