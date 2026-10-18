# Rincian Beban Pembayaran (`PaymentLoadReport`)

Group: Kas & Bank. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-bank-t18.json`](fixtures/cash-bank-t18.json) (Pembayaran NL-T1-1101.2035.01.00001 250.000 to NL-T1 Beban, Penerimaan …00002 400.000 from NL-T1 Pendapatan). ERP: `apps/api/src/reports/cash-bank.ts`, `src/cash-bank/service.ts`; test: `apps/api/test/cash-docs.test.ts`. These reports cover the Pembayaran/Penerimaan documents (not invoice receipts/payments).

Block per payment: `Nomor # Pembayaran : <no>  Kas/Bank : <bank>`, `Tanggal Pembayaran`, header `Rincian Pembayaran` | `Nilai`, account name rows, total.

Postings: Pembayaran Dr accounts / Cr bank (type Pembayaran); Penerimaan Dr bank / Cr accounts (type Penerimaan); numbered by the bank prefix.
