# Rincian Tukar Faktur (`ExchangeInvoiceDetailReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox, invoice exchange enabled), 2026-10-18. Fixture:
[`fixtures/exchange-t16.json`](fixtures/exchange-t16.json) (EXI.2034.10.00001 bundling SI.2034.10.00001). ERP: `exchangeDetail` in
`apps/api/src/reports/receivables.ts`, `createExchangeInvoice`; test: `apps/api/test/adjustments.test.ts`.

Block per exchange: `Nomor # : <no>  Jatuh Tempo : <due>`, `Tanggal : <date>  Tenaga Penjual :`, `Tgl Tukar : <collect date>`, header
`No Faktur` | `Tgl Faktur` | `Pelanggan` | `Jatuh Tempo` | `Total Faktur` | `Terutang` | `Umur (hr)`, one row per invoice, then the total.

**Umur is days from the invoice due date to the current date** (not the report range): an invoice due 08 Okt 2034 printed on
18 Oct 2026 shows `-2.912`. The ERP takes "today" as a parameter. No journal. The exchange number also fills the `Tukar Faktur`
column of [Histori Proses Penjualan](SalesFlowHistoryReport.md).
