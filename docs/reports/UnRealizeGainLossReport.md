# Laba/Rugi Tidak Terealisasi (`UnRealizeGainLossReport`)

Group: Buku Besar. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/UnRealizeGainLossReport.json`](captures/UnRealizeGainLossReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `PERIODFROMTO`; request param used: `{"periodStartMonth":"1","periodStartYear":2026,"periodEndMonth":"10","periodEndYear":2026}`.



## Layout

View: `report`. Header lines: "Dari Periode Januari 2026 s/d Oktober 2026".


First table row (columns): `Nama Akun Perkiraan | Bulan | Nilai Asing | Nilai Domestik (Bulan) | Kurs Akhir Bulan | Nilai Domestik (Akhir Bulan) | Untung/Rugi`

## Findings so far (2026-10-18)

T31 left a USD receivable open in October 2036 only until 15 Oct. Run for Oct 2036 the report prints only its header:
`Nama Akun Perkiraan | Bulan | Nilai Asing | Nilai Domestik (Bulan) | Kurs Akhir Bulan | Nilai Domestik (Akhir Bulan) | Untung/Rugi`.
Rows need an open foreign balance at a month end and a month-end rate (Proses Akhir Bulan revaluation). The ERP keeps
IDR only ([ADR-0012](../decisions/0012-foreign-currency-sales.md)).

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
