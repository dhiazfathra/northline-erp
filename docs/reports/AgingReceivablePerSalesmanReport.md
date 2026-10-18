# Umur Piutang per Penjual (`AgingReceivablePerSalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/AgingReceivablePerSalesmanReport.json`](captures/retail/AgingReceivablePerSalesmanReport.json).

Status: blocked: requires Salesman on invoice. Fixture: [`fixtures/retail/AgingReceivablePerSalesmanReport.json`](fixtures/retail/AgingReceivablePerSalesmanReport.json) (Retail Demo).

## Purpose

Menampilkan umur dari piutang pelanggan per penjual. Daftar Laporan category: Tenaga Penjual; view type `crosstab`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Mata Uang` | `Tenaga Penjual` | `Piutang` | `Blm Tempo` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120` (a `> 120` bucket is not in the capture, see rules).

## Row grouping

Grouped by currency (IDR, SGD, USD); per currency one row per salesman then `Total Tenaga Penjual`; finally `Total Mata Uang`. Salesmen in Retail Demo: Adam, Jhonni Haris.

Title lines: `Umur Piutang per Penjual`, `Per Tgl. 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- `Piutang` per salesman = sum of open receivable (invoice `Piutang`) of that salesman's invoices: IDR Adam 113,500,000 and Jhonni Haris 340,240,000 equal the sums in [OutstandingInvoicePerSalesmanReport](OutstandingInvoicePerSalesmanReport.md) (checked: 6 invoices 6,000,000 + 4,200,000 + 37,950,000 + 500,000 + 500,000 + 64,350,000 = 113,500,000; 5 invoices 8,140,000 + 4,200,000 + 89,900,000 + 22,000,000 + 216,000,000 = 340,240,000); SGD 7,200 + 10,730 = 17,930; USD 60,150.
- `Total Mata Uang` 0 = 453,740,000 + 17,930 + 60,150 = 453,818,080 (checked): currencies are summed raw, with no exchange-rate conversion (surprising).
- All age buckets show 0 while Piutang > 0 and every invoice is ~8,700+ days past due at the as-of date 31/12/2040: the overdue-over-120-days bucket is missing from the capture (column dropped or not rendered); unverified.

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: the `> 120` bucket and bucket boundaries; as-of other than 2040 (Retail Demo data is 2016-2017, so a realistic as-of date was not tried); invoices without a salesman.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Foreign currencies keep their own sections (IDR, SGD, USD) but the grand total adds them unconverted.
