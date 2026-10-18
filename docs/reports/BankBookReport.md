# Histori Bank (`BankBookReport`)

Group: Kas & Bank. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-bank.json`](fixtures/cash-bank.json). ERP: `apps/api/src/reports/cash-bank.ts`; test: `apps/api/test/cash-bank.test.ts`.

Params: `startDate`, `endDate`, `selectedBank` = array of `{id, name, no}` (an empty array prints nothing). Header line "Bank : <names>".

Per selected cash account:

```
Kode Perkiraan : NL-T1-1101   Saldo Awal : 13.000.000
Nama : NL-T1 Kas
Tanggal | No Bukti # | No. Trans # | Tipe Transaksi | Keterangan | Debit | Kredit | Saldo Akhir
31 Des 2030 | Saldo per 31 Dec 2030 | 13.000.000          ← date in Indonesian, "Saldo per" in English month
10 Jan 2031 | JV.2031.01.00001 | JV.2031.01.00001 | Jurnal Umum | NL-T1-J3 | 0 | 1.250.000,5 | 11.749.999,5
…
<period debit> | <period credit>
```

Opening = balance before `startDate` (cash accounts never reset). Keterangan = line memo. Running balance D − C.
