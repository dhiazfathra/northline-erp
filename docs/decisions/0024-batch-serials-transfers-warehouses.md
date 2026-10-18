# ADR-0024: Batch serials with expiry, transfer lines and receipts, warehouse master, vendor price end date

## Status
Accepted

## Date
2026-10-19

## Context
Ten Retail Demo reports (serial stock x3, serial history, expiring batches, transfer detail, partial receipts, transit
difference, warehouse list, vendor price adjustment) sat at spec because the model lacked: batch numbers with a quantity
and an expiry date, serials that move with transfers, transfer lines and the link from a receipt to its send, a
warehouse master with addresses, and an end date on Harga Pemasok. They were seeded and captured in Retail Demo, all
dated 2045 and prefixed NL-RE (`docs/reports/fixtures/retail/inventory-re.json`).

## Decision
- Migration 0041. `serial_numbers` gains `expiry` and an identity `id` (entry order); the key adds `warehouse`, because a
  transfer writes one row out of a warehouse and one into the other (or `Transit (AOL System)`), as Accurate's serial
  history prints both legs.
- Purchase invoice lines accept `serials` as plain strings (unique, qty 1) or `{no, qty, expiry?}` (batch); the sum must
  equal the line quantity.
- `item_transfers.from_number` links a Terima to its Kirim; `item_transfer_lines` stores lines; `createItemTransfer`
  takes optional per-line serials and moves them like the stock.
- `warehouses` master (name, description, address parts) via `upsertWarehouse`; stock rows still name warehouses by text.
- `vendor_prices.end_date` (optional Tanggal Berakhir).
- Observed rules live in each report spec. Notable: Sisa Hari in the stock reports is relative to the as-of date, but in
  Nomor Produksi Segera Kadaluarsa relative to the print moment; Retail Demo's 2045 transfers posted no journal, so the
  transit-difference report prints header only and the ERP does the same (shortcut until transfers carry value).

## Alternatives Considered
- **Separate batch table**: cleaner for large batches, but a second source of truth next to `serial_numbers`; one table
  with a quantity covers unique and batch numbers alike.
- **Warehouse ids on stock rows**: more normalized, but every existing report keys on the name; not worth the migration now.

## Consequences
- Transfer value (goods-in-transit journal, Beban Selisih Nilai barang) is still not modelled; the transit-difference
  report cannot show rows until it is.
- Serials leaving stock through sales are still not modelled (see ReceivedDeliveredSerialNumberReport.md).
