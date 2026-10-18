# Perbedaan Penyusutan (`DifferentIntermDepreciationReport`)

Group: Aset Tetap. **Status: verified** (zero diff, 4 runs over two fiscal assets). Fixture: [`fixtures/fiscal-asset-t35.json`](fixtures/fiscal-asset-t35.json).
ERP: `apps/api/src/reports/fixed-assets.ts` (`differentDepreciation`); fiscal life on `createFixedAsset` (`fiscalLifeMonths`,
migration 0038); test: `apps/api/test/fixed-assets.test.ts`.

## Parameters

`asOfYear` + `selectedAsset` = array of `{id}`. An asset without a fiscal category prints labels only (T5).

## Layout

Per asset:
- `Kode Aset : <no> | Perkiraan Umur : <fiscal life> Tahun`
- `Tanggal : <date> | Total Aset : <cost>`
- `Metode Penyusutan : <fiscal method> | Nilai Sisa : 0`
- `Tahun | PPh | Koreksi Pajak | Penyusutan Akuntansi`
- one row per calendar year

## Calculation rules

- Months in use per calendar year count from the acquisition month (1 Jul = 6 months in the first year).
- PPh (fiscal) = cost / fiscal life months x months in the year. Gol 1 [Garis Lurus] is 48 months (25%/year).
- Penyusutan Akuntansi = cost / accounting life months x months in the year, and 0 after the accounting life ends.
- Koreksi Pajak = PPh - Akuntansi (negative while accounting depreciates faster).
- Rows run from the acquisition year to `asOfYear` and stop when the fiscal life ends (2041 for a Jul 2037 asset).
- The schedule is computed. No month-end process is needed.

| Asset | Year | PPh | Koreksi | Akuntansi |
|---|---|---|---|---|
| 8.000.000, Jan 2037, 24 m | 2037-2038 | 2.000.000 | -2.000.000 | 4.000.000 |
| | 2039-2040 | 2.000.000 | 2.000.000 | 0 |
| 4.800.000, Jul 2037, 36 m | 2037 | 600.000 | -200.000 | 800.000 |
| | 2038-2039 | 1.200.000 | -400.000 | 1.600.000 |
| | 2040 | 1.200.000 | 400.000 | 800.000 |
| | 2041 | 600.000 | 600.000 | 0 |

## Seeding notes

Fixed asset saved with `param.fiscalFa=true` and `param.fiscalFaTypeId`. Fiscal categories come from
`/accurate/fixed-asset/search-fiscal-fa-type.do`: 52 = Gol 1 [Garis Lurus], 53 = Gol 1 [Saldo Menurun], and so on.

## Open work

- Declining-balance fiscal groups and assets edited or disposed mid-schedule are not captured.
