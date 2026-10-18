# Rincian Arus Kas (Tak Langsung) (`CashFlowDetailIndirectReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-flow.json`](fixtures/cash-flow.json). ERP: `apps/api/src/reports/cash-flow.ts`; test: `apps/api/test/cash-flow.test.ts`.

Params as [Arus Kas (Tak Langsung)](CashFlowIndirectReport.md). Same totals; type rows replaced by **account rows** (by name,
non-zero only, ordered by account number), each −(D − C) in the range:

```
Aktifitas Operasi
  Laba/Rugi
  Tambah
    Akumulasi Penyusutan … Total Akumulasi Penyusutan        (always printed)
    Selain Penyusutan … Total Selain Penyusutan              (AP, other current liabilities)
    Total Tambah
  Kurang
    Selain Penyusutan … Total Selain Penyusutan              (AR, inventory, other current assets)
    Total Kurang
  Total Aktifitas Operasi
Investasi / Kurang … Total Kurang / Total Investasi           (fixed and other assets)
Pendanaan / Tambah … Total Tambah / Total Pendanaan           (long-term liabilities, equity)
Total dari Arus Kas Bersih … / Kas & Setara Kas di Awal / Akhir period
```

Unverified: whether an empty "Selain Penyusutan" block prints its heading and zero total (the ERP omits it).
