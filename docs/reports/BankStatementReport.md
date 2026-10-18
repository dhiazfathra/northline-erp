# Rekening Koran (`BankStatementReport`)

Group: Kas & Bank. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-bank-t18.json`](fixtures/cash-bank-t18.json) (Pembayaran NL-T1-1101.2035.01.00001 250.000 to NL-T1 Beban, Penerimaan …00002 400.000 from NL-T1 Pendapatan). ERP: `apps/api/src/reports/cash-bank.ts`, `src/cash-bank/service.ts`; test: `apps/api/test/cash-docs.test.ts`. These reports cover the Pembayaran/Penerimaan documents (not invoice receipts/payments).

Without imported bank statements the report prints only the empty header (`Kode :`, `Nama :`, column header). Statement import is not modelled.

Postings: Pembayaran Dr accounts / Cr bank (type Pembayaran); Penerimaan Dr bank / Cr accounts (type Penerimaan); numbered by the bank prefix.

## Update 2026-10-18 (T19 reconciliation)

After a manual reconciliation the statement has a line: `Kode : NL-T1-1101`, `Nama : NL-T1 Kas`, then
`30 Nov 2035 | NL-T19 RK1 | 1.200.000 | Masuk` (Saldo blank in this one-line capture). ERP `bankStatement(rs, bank, from, to)`
lists reconciliation-created lines; still verified for the empty case (`cash-docs.test.ts`) and now for one line
(`tax.test.ts`). Running Saldo needs a multi-line capture (`shortcut:` in the code).
