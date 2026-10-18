# Giro Mundur (Belum Jatuh Tempo) (`OutstandingChequeReport`)

Group: Kas & Bank. **Status: verified** (zero diff, 4 dates). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`reports.OutstandingChequeReport`).
ERP: `apps/api/src/reports/cash-bank.ts` (`outstandingCheques`), loader `loadCheques`; test: `apps/api/test/tax.test.ts`.

## Parameters

`ASOF` + `selectedBank`: **an array of `{id}`** of cash/bank accounts (`[{"id":650}]` = NL-T1 Kas). The default `[]`
returns nothing.

## Layout

```
Giro Mundur (Belum Jatuh Tempo) / Per Tgl. 30 Nov 2035
Tgl Transaksi | Tanggal Cek | Tipe Transaksi | No. Cek | Pelanggan/Pemasok | Terima | Bayar
NL-T1 Kas                                    <- per bank account
30 Nov 2035 | 15 Des 2035 | Penerimaan Penjualan | NL-T19-G1 | NL-T19 Pelanggan PKP | 444.000
444.000                                      <- bank subtotal (empty Bayar cells dropped)
```

## Calculation rules

- Rows: receipts paid by **Cek/Giro** (`paymentMethod` BANK_CHEQUE) whose cheque date is **after** the as-of date.
  The transaction date is irrelevant: the 30 Nov receipt already shows as of 29 Nov; it is gone on 15 Dec (the cheque date).
- Journal: none on the transaction date; Dr Kas / Cr Piutang on the **cheque date** (AllJournalReport Dec 2035).
- The receivable drops on the transaction date for Limit Piutang (Saldo IDR 0), which lists the cheque under Giro Mundur.

## Open work

- Cheque payments to vendors (Bayar column) are not modelled.
